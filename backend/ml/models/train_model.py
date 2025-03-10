import numpy as np
import tensorflow as tf
from tensorflow.keras.layers import Embedding, GRU, Dense, Dropout, Input, Concatenate, BatchNormalization
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from sklearn.model_selection import train_test_split
import re
import json
import os
import joblib
import logging

# Logging konfigürasyonu
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Model sabitleri
MAX_VOCAB_SIZE = 5000
EMBEDDING_DIM = 64
MAX_SEQUENCE_LENGTH = 100
FEATURE_NAMES = [
    'num_lines', 'num_chars', 'num_spaces', 'num_tabs',
    'num_keywords', 'num_comments', 'num_functions',
    'num_classes', 'indentation_consistency', 'avg_line_length',
    'cyclomatic_complexity', 'num_loops'
]

# Model ve kayıt dosyaları için yollar
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'ai_detector.keras')
TOKENIZER_PATH = os.path.join(MODEL_DIR, 'tokenizer.json')
SCALER_PATH = os.path.join(MODEL_DIR, 'scaler.pkl')

# Dizinlerin mevcut olduğundan emin olalım
os.makedirs(MODEL_DIR, exist_ok=True)

# Sentetik veri oluşturma - gerçek projenizde bu kısım gerçek veriler ile değiştirilmeli
def generate_synthetic_data(num_samples=1000):
    logging.info(f"Generating {num_samples} synthetic data samples...")
    
    # Sentetik etiketler - yarısı AI, yarısı Human
    labels = np.array([0] * (num_samples // 2) + [1] * (num_samples // 2))  # 0: Human, 1: AI
    
    # Sentetik kodlar
    human_code_samples = []
    ai_code_samples = []
    
    # İnsan kodu özellikleri: Daha düzensiz, değişken uzunluklu, daha az yapılandırılmış
    for i in range(num_samples // 2):
        # Rastgele insan kodu oluştur
        num_lines = np.random.randint(5, 150)
        code_lines = []
        indent_level = 0
        
        for _ in range(num_lines):
            # Bazen rastgele girinti değişikliği
            if np.random.random() < 0.2:
                indent_level = max(0, indent_level + np.random.choice([-1, 1]))
            
            # Rastgele bir kod satırı oluştur
            line_type = np.random.choice(['code', 'comment', 'blank'], p=[0.8, 0.15, 0.05])
            
            if line_type == 'blank':
                code_lines.append('')
            elif line_type == 'comment':
                code_lines.append(' ' * (indent_level * 4) + '# ' + ''.join(['x' for _ in range(np.random.randint(10, 50))]))
            else:
                line_length = np.random.randint(10, 80)
                code_line = ' ' * (indent_level * 4) + ''.join(['x' for _ in range(line_length)])
                code_lines.append(code_line)
        
        human_code = '\n'.join(code_lines)
        human_code_samples.append(human_code)
    
    # AI kodu özellikleri: Daha tutarlı, daha temiz, daha yapılandırılmış
    for i in range(num_samples // 2):
        # Daha tutarlı AI kodu oluştur
        num_lines = np.random.randint(20, 120)
        code_lines = []
        indent_level = 0
        
        for j in range(num_lines):
            # Daha düzenli girinti değişiklikleri
            if j % 5 == 0 and j > 0:
                indent_level = max(0, indent_level + np.random.choice([-1, 1], p=[0.3, 0.7]))
            
            # Daha tutarlı kod yapısı
            line_type = np.random.choice(['code', 'comment', 'blank'], p=[0.85, 0.1, 0.05])
            
            if line_type == 'blank':
                code_lines.append('')
            elif line_type == 'comment':
                code_lines.append(' ' * (indent_level * 4) + '# ' + ''.join(['x' for _ in range(30)]))
            else:
                line_length = np.random.randint(20, 60)  # Daha tutarlı satır uzunlukları
                code_line = ' ' * (indent_level * 4) + ''.join(['x' for _ in range(line_length)])
                code_lines.append(code_line)
        
        ai_code = '\n'.join(code_lines)
        ai_code_samples.append(ai_code)
    
    # Tüm kod örneklerini birleştir
    code_samples = human_code_samples + ai_code_samples
    
    # Karıştır
    indices = np.arange(num_samples)
    np.random.shuffle(indices)
    
    return np.array(code_samples)[indices], labels[indices]

def extract_code_features(code):
    """Kod metninden özellikleri çıkarır"""
    return [
        code.count("\n"),
        len(code),
        code.count(" "),
        code.count("\t"),
        len(re.findall(r'\b(def|class|import|return|if|else|for|while|try|except|with|lambda|yield|async|await)\b', code)),
        len(re.findall(r'#[^\n]|"""[\s\S]?"""|\'\'\'[\s\S]*?\'\'\'', code)),
        len(re.findall(r'\bdef\b', code)),
        len(re.findall(r'\bclass\b', code)),
        calculate_indentation_consistency(code),
        calculate_avg_line_length(code),
        calculate_cyclomatic_complexity(code),
        len(re.findall(r'\b(for|while)\b', code))
    ]

def calculate_indentation_consistency(code):
    lines = [line for line in code.split('\n') if line.strip()]
    if not lines:
        return 1.0

    indentations = []
    for line in lines:
        match = re.match(r'^[\t ]*', line)
        if match:
            indent = len(match.group().expandtabs(4))
            indentations.append(indent)

    if len(set(indentations)) == 1:
        return 1.0
    return round(1 - (np.std(indentations) / 4), 2)

def calculate_avg_line_length(code):
    lines = [line.rstrip() for line in code.split('\n') if line.strip()]
    return np.mean([len(line) for line in lines]).round(2) if lines else 0

def calculate_cyclomatic_complexity(code):
    decision_points = len(re.findall(r'\b(if|elif|else|for|while|and|or)\b', code))
    return decision_points + 1

def build_model(input_shape, feature_shape):
    """Model mimarisini oluşturur"""
    text_input = Input(shape=(input_shape,), name='text_input')
    embedding = Embedding(MAX_VOCAB_SIZE, EMBEDDING_DIM, mask_zero=True)(text_input)
    gru_out = GRU(64, return_sequences=False, dropout=0.3)(embedding)

    feature_input = Input(shape=(feature_shape,), name='feature_input')
    feature_dense = Dense(32, activation='relu')(feature_input)

    combined = Concatenate()([gru_out, feature_dense])
    bn = BatchNormalization()(combined)
    dropout = Dropout(0.5)(bn)

    output = Dense(1, activation='sigmoid')(dropout)

    model = Model(inputs=[text_input, feature_input], outputs=output)

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4),
        loss='binary_crossentropy',
        metrics=[
            'accuracy',
            tf.keras.metrics.Precision(name='precision'),
            tf.keras.metrics.Recall(name='recall'),
            tf.keras.metrics.AUC(name='auc')
        ]
    )
    return model

def train_model():
    """Model eğitimi yapılır"""
    logging.info("Starting model training...")
    
    # Veri oluştur
    code_samples, labels = generate_synthetic_data(1000)
    
    # Özellikleri çıkar
    features = np.array([extract_code_features(code) for code in code_samples])
    
    # Tokenizer oluştur ve eğit
    tokenizer = Tokenizer(num_words=MAX_VOCAB_SIZE, oov_token='<OOV>', filters='')
    tokenizer.fit_on_texts(code_samples)
    
    # Metni sayısal dizilere dönüştür
    sequences = tokenizer.texts_to_sequences(code_samples)
    padded_sequences = pad_sequences(sequences, maxlen=MAX_SEQUENCE_LENGTH)
    
    # Özellikleri normalize et
    from sklearn.preprocessing import StandardScaler
    scaler = StandardScaler()
    scaled_features = scaler.fit_transform(features)
    
    # Eğitim ve test verilerini ayır
    X_text_train, X_text_test, X_feat_train, X_feat_test, y_train, y_test = train_test_split(
        padded_sequences, scaled_features, labels, test_size=0.2, random_state=42
    )
    
    # Model oluştur
    model = build_model(MAX_SEQUENCE_LENGTH, scaled_features.shape[1])
    
    # Eğitim
    history = model.fit(
        [X_text_train, X_feat_train],
        y_train,
        validation_data=([X_text_test, X_feat_test], y_test),
        epochs=5,  # Gerçek eğitimde daha fazla epoch kullanabilirsiniz
        batch_size=32
    )
    
    # Model değerlendirmesi
    results = model.evaluate([X_text_test, X_feat_test], y_test)
    logging.info(f"Test set evaluation: {dict(zip(model.metrics_names, results))}")
    
    # Model, tokenizer ve scaler'ı kaydet
    model.save(MODEL_PATH)
    logging.info(f"Model saved to {MODEL_PATH}")
    
    with open(TOKENIZER_PATH, 'w') as f:
        json.dump(tokenizer.to_json(), f)
    logging.info(f"Tokenizer saved to {TOKENIZER_PATH}")
    
    joblib.dump(scaler, SCALER_PATH)
    logging.info(f"Scaler saved to {SCALER_PATH}")
    
    return model, tokenizer, scaler

if __name__ == "__main__":
    train_model()