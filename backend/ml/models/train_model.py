import numpy as np
import tensorflow as tf
from tensorflow.keras.layers import Embedding, LSTM, Dense, Dropout, Input, Concatenate, BatchNormalization, Bidirectional
from tensorflow.keras.models import Model
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import re
import json
import os
import joblib
import logging
import random
from collections import defaultdict
import pandas as pd
from sklearn.preprocessing import StandardScaler

# Logging konfigürasyonu
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Model sabitleri
MAX_VOCAB_SIZE = 10000  # Increased vocabulary size
EMBEDDING_DIM = 128     # Increased embedding dimension
MAX_SEQUENCE_LENGTH = 150  # Increased sequence length
FEATURE_NAMES = [
    'num_lines', 'num_chars', 'num_spaces', 'num_tabs',
    'num_keywords', 'num_comments', 'num_functions',
    'num_classes', 'indentation_consistency', 'avg_line_length',
    'cyclomatic_complexity', 'num_loops', 'variable_name_consistency',
    'comment_to_code_ratio', 'max_line_length', 'avg_function_length'
]

# Model ve kayıt dosyaları için yollar
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'ai_detector.keras')
TOKENIZER_PATH = os.path.join(MODEL_DIR, 'tokenizer.json')
SCALER_PATH = os.path.join(MODEL_DIR, 'scaler.pkl')

# Dizinlerin mevcut olduğundan emin olalım
os.makedirs(MODEL_DIR, exist_ok=True)

def set_random_seed(seed_value=42):
    """Set random seed for reproducibility"""
    random.seed(seed_value)
    np.random.seed(seed_value)
    tf.random.set_seed(seed_value)
    os.environ['PYTHONHASHSEED'] = str(seed_value)

# Daha gerçekçi kod parçaları oluşturmak için şablonlar
HUMAN_TEMPLATES = [
    "def {func_name}({params}):\n{body}",
    "class {class_name}:\n{body}",
    "for {var} in {collection}:\n{body}",
    "if {condition}:\n{body}",
    "try:\n{body}\nexcept {exception}:\n{except_body}",
    "{var} = {value}",
    "# {comment}",
    "'''{docstring}'''",
    "with open('{filename}', '{mode}') as {file_var}:\n{body}",
    "import {module}\nfrom {module} import {import_item}"
]

AI_TEMPLATES = [
    "def {func_name}({params}):\n    \"\"\"{docstring}\"\"\"\n{body}",
    "class {class_name}:\n    \"\"\"{docstring}\"\"\"\n{body}",
    "for {var} in {collection}:\n{body}",
    "if {condition}:\n{body}\nelse:\n{else_body}",
    "try:\n{body}\nexcept {exception} as {error_var}:\n{except_body}",
    "{var} = {value}  # {comment}",
    "# {comment}",
    "'''\n{docstring}\n'''",
    "with open('{filename}', '{mode}') as {file_var}:\n{body}",
    "import {module}\nfrom {module} import {import_item}"
]

# Doldurma için rastgele değerler
FUNCTION_NAMES = ['calculate_total', 'process_data', 'get_user_info', 'update_record', 'validate_input',
                'analyze_text', 'fetch_results', 'transform_data', 'filter_items', 'merge_lists']
CLASS_NAMES = ['DataProcessor', 'UserManager', 'FileHandler', 'ConfigSettings', 'ApiClient',
             'DatabaseConnector', 'ValidationService', 'EventEmitter', 'Logger', 'MessageQueue']
VARIABLE_NAMES = ['data', 'result', 'user', 'items', 'config', 'options', 'response', 'values', 'counter', 'index']
PARAMS = ['data', 'user_id', 'options=None', 'force=False', 'timeout=30', 'callback=None', '*args, **kwargs']
CONDITIONS = ['len(data) > 0', 'user.is_active', 'x < max_value', 'response.status_code == 200', 'i % 2 == 0']
EXCEPTIONS = ['Exception', 'ValueError', 'TypeError', 'KeyError', 'FileNotFoundError', 'ConnectionError']
COMMENTS = ['Initialize variables', 'Process the data', 'Validate user input', 'Update database record',
          'Check for errors', 'Parse response', 'Handle edge cases', 'Clean up resources']
DOCSTRINGS = ['Process user data and return results', 'Validate input parameters',
            'Fetch data from external API', 'Transform raw data into required format',
            'Calculate statistics based on input values']
COLLECTIONS = ['range(10)', 'data', 'users', 'results.items()', 'options.keys()', 'enumerate(values)']

def generate_random_code_line(is_ai=False):
    """Generate a random line of code based on is_ai flag"""
    templates = AI_TEMPLATES if is_ai else HUMAN_TEMPLATES
    template = random.choice(templates)
    
    # Random variable for indentation
    indent = '    ' * random.randint(0, 3)
    
    # Fill in template with random values
    template = template.replace('{func_name}', random.choice(FUNCTION_NAMES))
    template = template.replace('{class_name}', random.choice(CLASS_NAMES))
    template = template.replace('{var}', random.choice(VARIABLE_NAMES))
    template = template.replace('{value}', f"'{random.choice(VARIABLE_NAMES)}'")
    template = template.replace('{params}', ', '.join(random.sample(PARAMS, random.randint(0, 3))))
    template = template.replace('{condition}', random.choice(CONDITIONS))
    template = template.replace('{exception}', random.choice(EXCEPTIONS))
    template = template.replace('{comment}', random.choice(COMMENTS))
    template = template.replace('{docstring}', random.choice(DOCSTRINGS))
    template = template.replace('{collection}', random.choice(COLLECTIONS))
    template = template.replace('{filename}', f"'{random.choice(['data.txt', 'config.json', 'users.csv', 'log.txt'])}'")
    template = template.replace('{mode}', random.choice(['r', 'w', 'a', 'rb', 'wb']))
    template = template.replace('{file_var}', 'f')
    template = template.replace('{error_var}', 'e')
    template = template.replace('{module}', random.choice(['os', 'sys', 'json', 'datetime', 'pandas', 'numpy']))
    template = template.replace('{import_item}', random.choice(['Path', 'defaultdict', 'Counter', 'datetime', 'array']))
    
    # Handle body replacements - these need to be indented properly
    if '{body}' in template:
        body_lines = []
        for _ in range(random.randint(1, 5)):
            sub_line = generate_random_code_line(is_ai)
            if '\n' in sub_line:
                # Handle multi-line replacements
                sub_lines = sub_line.split('\n')
                for sl in sub_lines:
                    if sl:
                        body_lines.append('    ' + sl)
            else:
                body_lines.append('    ' + sub_line)
        template = template.replace('{body}', '\n'.join(body_lines))
    
    if '{else_body}' in template:
        else_body_lines = []
        for _ in range(random.randint(1, 3)):
            sub_line = generate_random_code_line(is_ai)
            if '\n' in sub_line:
                sub_lines = sub_line.split('\n')
                for sl in sub_lines:
                    if sl:
                        else_body_lines.append('    ' + sl)
            else:
                else_body_lines.append('    ' + sub_line)
        template = template.replace('{else_body}', '\n'.join(else_body_lines))
    
    if '{except_body}' in template:
        except_body_lines = []
        for _ in range(random.randint(1, 2)):
            sub_line = generate_random_code_line(is_ai)
            if '\n' in sub_line:
                sub_lines = sub_line.split('\n')
                for sl in sub_lines:
                    if sl:
                        except_body_lines.append('    ' + sl)
            else:
                except_body_lines.append('    ' + sub_line)
        template = template.replace('{except_body}', '\n'.join(except_body_lines))
    
    # Add indentation
    template_lines = template.split('\n')
    template = '\n'.join([indent + line for line in template_lines])
    
    return template

def generate_synthetic_data(num_samples=2000):
    """
    Generate more realistic synthetic data for training
    
    Args:
        num_samples: Number of samples to generate (half human, half AI)
        
    Returns:
        code_samples: Array of code samples
        labels: Binary labels (0=human, 1=AI)
    """
    logging.info(f"Generating {num_samples} synthetic code samples...")
    
    # Set random seed for reproducibility
    set_random_seed()
    
    # Initialize empty lists
    code_samples = []
    labels = []
    
    # Generate human-like code samples
    for i in range(num_samples // 2):
        # How many lines of code to generate
        num_lines = random.randint(10, 100)
        
        # Generate code by randomly selecting templates
        code_lines = []
        for _ in range(num_lines // 3):  # Each template can generate multiple lines
            code_lines.append(generate_random_code_line(is_ai=False))
        
        # Join lines with proper spacing
        code = '\n\n'.join(code_lines)
        code_samples.append(code)
        labels.append(0)  # 0 = Human
    
    # Generate AI-like code samples
    for i in range(num_samples // 2):
        # AI tends to generate more consistent, structured code
        num_lines = random.randint(15, 120)
        
        # Generate code by randomly selecting templates
        code_lines = []
        for _ in range(num_lines // 3):  # Each template can generate multiple lines
            code_lines.append(generate_random_code_line(is_ai=True))
        
        # Join lines with proper spacing
        code = '\n\n'.join(code_lines)
        code_samples.append(code)
        labels.append(1)  # 1 = AI
    
    # Shuffle the data
    indices = np.arange(len(code_samples))
    np.random.shuffle(indices)
    
    return np.array(code_samples)[indices], np.array(labels)[indices]

def extract_code_features(code):
    """
    Extract more comprehensive features from code for better analysis
    
    Args:
        code: Source code string
        
    Returns:
        List of numerical features
    """
    # Extract basic features
    num_lines = code.count('\n') + 1
    num_chars = len(code)
    num_spaces = code.count(' ')
    num_tabs = code.count('\t')
    num_keywords = len(re.findall(r'\b(def|class|import|return|if|else|for|while|try|except|with|lambda|yield|async|await)\b', code))
    num_comments = len(re.findall(r'#[^\n]|"""[\s\S]?"""|\'\'\'[\s\S]*?\'\'\'', code))
    num_functions = len(re.findall(r'\bdef\b', code))
    num_classes = len(re.findall(r'\bclass\b', code))
    indentation_consistency = calculate_indentation_consistency(code)
    avg_line_length = calculate_avg_line_length(code)
    cyclomatic_complexity = calculate_cyclomatic_complexity(code)
    num_loops = len(re.findall(r'\b(for|while)\b', code))
    
    # Advanced features
    lines = [line for line in code.split('\n') if line.strip()]
    max_line_length = max([len(line) for line in lines]) if lines else 0
    
    # Variable name consistency
    var_names = re.findall(r'\b([a-zA-Z_][a-zA-Z0-9_]*)\s*=', code)
    var_name_consistency = calculate_naming_consistency(var_names)
    
    # Comment to code ratio
    comment_lines = len(re.findall(r'^\s*#.*$|^\s*""".*?"""\s*$|^\s*\'\'\'.*?\'\'\'\s*$', code, re.MULTILINE))
    comment_to_code_ratio = comment_lines / num_lines if num_lines > 0 else 0
    
    # Average function length
    function_bodies = re.findall(r'def\s+[^(]+\([^)]*\):\s*(?:\n\s+[^\n]+)+', code)
    avg_function_length = np.mean([fb.count('\n') for fb in function_bodies]) if function_bodies else 0
    
    return [
        num_lines, num_chars, num_spaces, num_tabs,
        num_keywords, num_comments, num_functions,
        num_classes, indentation_consistency, avg_line_length,
        cyclomatic_complexity, num_loops, var_name_consistency,
        comment_to_code_ratio, max_line_length, avg_function_length
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

def calculate_naming_consistency(names):
    """Calculate how consistent variable naming is"""
    if not names or len(names) < 2:
        return 1.0
    
    # Check for naming conventions
    snake_case = [n for n in names if re.match(r'^[a-z][a-z0-9_]*$', n)]
    camel_case = [n for n in names if re.match(r'^[a-z][a-zA-Z0-9]*$', n) and not re.match(r'^[a-z][a-z0-9_]*$', n)]
    pascal_case = [n for n in names if re.match(r'^[A-Z][a-zA-Z0-9]*$', n)]
    
    # Calculate consistency as the ratio of the most common style
    total = len(names)
    max_style = max(len(snake_case), len(camel_case), len(pascal_case))
    
    return max_style / total if total > 0 else 1.0

def build_model(input_shape, feature_shape):
    """Build an improved model architecture with bidirectional LSTM"""
    # Text input branch
    text_input = Input(shape=(input_shape,), name='text_input')
    embedding = Embedding(MAX_VOCAB_SIZE, EMBEDDING_DIM, mask_zero=True)(text_input)
    bi_lstm = Bidirectional(LSTM(128, dropout=0.3, recurrent_dropout=0.3))(embedding)
    text_features = Dense(64, activation='relu')(bi_lstm)
    
    # Handcrafted features branch
    feature_input = Input(shape=(feature_shape,), name='feature_input')
    feature_dense1 = Dense(64, activation='relu')(feature_input)
    feature_dense2 = Dense(32, activation='relu')(feature_dense1)
    
    # Combine both branches
    combined = Concatenate()([text_features, feature_dense2])
    bn = BatchNormalization()(combined)
    dense1 = Dense(64, activation='relu')(bn)
    dropout1 = Dropout(0.4)(dense1)
    dense2 = Dense(32, activation='relu')(dropout1)
    dropout2 = Dropout(0.3)(dense2)
    
    # Output layer
    output = Dense(1, activation='sigmoid')(dropout2)
    
    # Create model
    model = Model(inputs=[text_input, feature_input], outputs=output)
    
    # Compile with better metrics
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=5e-4),
        loss='binary_crossentropy',
        metrics=[
            'accuracy',
            tf.keras.metrics.Precision(name='precision'),
            tf.keras.metrics.Recall(name='recall'),
            tf.keras.metrics.AUC(name='auc'),
            tf.keras.metrics.F1Score(name='f1_score')
        ]
    )
    return model

def train_model():
    """
    Train a code analysis model for AI detection
    
    Returns:
        model: Trained model
        tokenizer: Fitted tokenizer
        scaler: Fitted scaler
    """
    try:
        # Set up logging
        logging.basicConfig(level=logging.INFO)
        
        # Create output directory if it doesn't exist
        model_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models')
        os.makedirs(model_dir, exist_ok=True)
        
        # Set random seed for reproducibility
        set_random_seed()
        
        # Load CSV data if available
        csv_data_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), 'data')
        real_code_samples = []
        real_labels = []
        
        # Process standard CSV files
        for filename in os.listdir(csv_data_path):
            if filename.endswith('.csv') and not filename.startswith('merged_'):
                csv_path = os.path.join(csv_data_path, filename)
                logging.info(f"Loading data from {csv_path}")
                try:
                    df = pd.read_csv(csv_path)
                    
                    # Check required columns
                    if 'code' in df.columns and 'is_ai_generated' in df.columns:
                        valid_samples = df['code'].dropna().tolist()
                        valid_labels = df['is_ai_generated'].dropna().astype(int).tolist()
                        
                        if len(valid_samples) > 0:
                            real_code_samples.extend(valid_samples)
                            real_labels.extend(valid_labels)
                            logging.info(f"Added {len(valid_samples)} samples from {filename}")
                    else:
                        logging.warning(f"CSV file {filename} does not have required columns (code, is_ai_generated)")
                except Exception as e:
                    logging.error(f"Error loading CSV file {filename}: {str(e)}")
        
        # Process merged AI and human files
        ai_file_path = os.path.join(csv_data_path, 'merged_AI_files.csv')
        human_file_path = os.path.join(csv_data_path, 'merged_human_files.csv')
        
        try:
            # Load AI samples
            if os.path.exists(ai_file_path):
                ai_df = pd.read_csv(ai_file_path)
                if 'Content' in ai_df.columns:
                    ai_samples = ai_df['Content'].dropna().tolist()
                    # Add all as AI-generated (label 1)
                    real_code_samples.extend(ai_samples)
                    real_labels.extend([1] * len(ai_samples))
                    logging.info(f"Added {len(ai_samples)} AI samples from merged_AI_files.csv")
                else:
                    logging.warning("merged_AI_files.csv does not have 'Content' column")
            else:
                logging.warning(f"AI samples file not found: {ai_file_path}")
                
            # Load human samples
            if os.path.exists(human_file_path):
                human_df = pd.read_csv(human_file_path)
                if 'Content' in human_df.columns:
                    human_samples = human_df['Content'].dropna().tolist()
                    # Add all as human-written (label 0)
                    real_code_samples.extend(human_samples)
                    real_labels.extend([0] * len(human_samples))
                    logging.info(f"Added {len(human_samples)} human samples from merged_human_files.csv")
                else:
                    logging.warning("merged_human_files.csv does not have 'Content' column")
            else:
                logging.warning(f"Human samples file not found: {human_file_path}")
                
        except Exception as e:
            logging.error(f"Error loading merged code files: {str(e)}")
            
        # Log dataset distribution
        if len(real_code_samples) > 0:
            ai_count = sum(real_labels)
            human_count = len(real_labels) - ai_count
            logging.info(f"Dataset distribution: {ai_count} AI, {human_count} human")
        
        # Generate synthetic data to supplement if needed
        synthetic_code_samples, synthetic_labels = generate_synthetic_data(3000)  # Reduced sample size since we have real data
        
        # Combine real data with synthetic data
        if len(real_code_samples) > 0:
            logging.info(f"Combining {len(real_code_samples)} real samples with {len(synthetic_code_samples)} synthetic samples")
            
            # Balance the dataset if needed
            ai_samples = [sample for sample, label in zip(real_code_samples, real_labels) if label == 1]
            human_samples = [sample for sample, label in zip(real_code_samples, real_labels) if label == 0]
            
            logging.info(f"Real data distribution: {len(ai_samples)} AI, {len(human_samples)} human")
            
            # Add real samples to the training data
            code_samples = real_code_samples + synthetic_code_samples
            labels = real_labels + synthetic_labels
        else:
            logging.info("No real data found, using only synthetic data")
            code_samples = synthetic_code_samples
            labels = synthetic_labels
        
        # Convert labels to numpy array
        labels = np.array(labels)
        
        # Extract features from code
        logging.info("Extracting features from code...")
        features = np.array([extract_code_features(code) for code in code_samples])
        
        # Create and fit scaler
        scaler = StandardScaler()
        scaled_features = scaler.fit_transform(features)
        
        # Create and fit tokenizer
        tokenizer = Tokenizer(num_words=MAX_VOCAB_SIZE, oov_token='<OOV>')
        tokenizer.fit_on_texts(code_samples)
        
        # Convert text to sequences
        sequences = tokenizer.texts_to_sequences(code_samples)
        padded_sequences = pad_sequences(sequences, maxlen=MAX_SEQUENCE_LENGTH, padding='post', truncating='post')
        
        # Build the model
        model = build_model(padded_sequences.shape[1:], scaled_features.shape[1:])
        
        # Split the dataset
        X_text_train, X_text_test, X_features_train, X_features_test, y_train, y_test = train_test_split(
            padded_sequences, scaled_features, labels, test_size=0.2, random_state=42, stratify=labels
        )
        
        # Train the model
        logging.info("Training model...")
        history = model.fit(
            [X_text_train, X_features_train], 
            y_train,
            validation_data=([X_text_test, X_features_test], y_test),
            epochs=10,
            batch_size=32,
            verbose=1
        )
        
        # Evaluate the model
        loss, accuracy = model.evaluate([X_text_test, X_features_test], y_test, verbose=0)
        logging.info(f"Test accuracy: {accuracy:.4f}")
        
        # Save the model
        model_path = os.path.join(model_dir, 'code_analysis_model.h5')
        model.save(model_path)
        logging.info(f"Model saved to {model_path}")
        
        # Save the tokenizer
        tokenizer_json = tokenizer.to_json()
        tokenizer_path = os.path.join(model_dir, 'tokenizer.json')
        with open(tokenizer_path, 'w') as f:
            f.write(tokenizer_json)
        logging.info(f"Tokenizer saved to {tokenizer_path}")
        
        # Save the scaler
        scaler_path = os.path.join(model_dir, 'scaler.pkl')
        joblib.dump(scaler, scaler_path)
        logging.info(f"Scaler saved to {scaler_path}")
        
        return model, tokenizer, scaler
    
    except Exception as e:
        logging.error(f"Error in train_model: {str(e)}")
        raise

if __name__ == "__main__":
    train_model()