import numpy as np
import tensorflow as tf
from tensorflow.keras.layers import Embedding, LSTM, Dense, Dropout, Input, Concatenate, BatchNormalization, Bidirectional, concatenate
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
import pickle
import traceback
from tensorflow.keras.optimizers import Adam

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

def generate_random_code_line(is_ai=False, depth=0):
    """
    Generate a random line of code for synthetic data
    
    Args:
        is_ai: Whether to generate AI-like or human-like code
        depth: Current recursion depth to prevent stack overflow
    
    Returns:
        A string containing a synthetic code line
    """
    # Prevent infinite recursion
    if depth > 3:  # Limit recursion depth
        return "pass" if random.random() < 0.5 else "return None"
    
    # Templates for function declarations, conditionals, loops, etc.
    templates = [
        "def {func_name}({params}):",
        "if {condition}:",
        "for {var} in {iterable}:",
        "while {condition}:",
        "{var} = {value}",
        "return {value}",
        "class {class_name}:",
        "try:",
        "except Exception as e:",
        "# {comment}"
    ]
    
    # Choose a template with different probabilities based on is_ai
    if is_ai:
        # AI code tends to use more structured patterns
        template = random.choice(templates)
    else:
        # Human code might be more varied or use simpler constructs more often
        weights = [0.2, 0.25, 0.15, 0.1, 0.3, 0.3, 0.1, 0.1, 0.1, 0.2]
        template = random.choices(templates, weights=weights, k=1)[0]
    
    # Variables, function names, class names
    FUNC_NAMES = ["get_data", "process_item", "calculate_value", "handle_request", "validate_input"]
    VAR_NAMES = ["x", "y", "data", "result", "items", "values", "response"]
    CLASS_NAMES = ["DataProcessor", "RequestHandler", "Validator", "Calculator", "Manager"]
    PARAMS = ["data", "x", "y", "request", "options", "config"]
    
    # Replace placeholders in the template
    if "{func_name}" in template:
        func_name = random.choice(FUNC_NAMES)
        template = template.replace("{func_name}", func_name)
    
    if "{params}" in template:
        # Use a list comprehension instead of random.sample to avoid recursion issues
        param_count = random.randint(0, 3)
        selected_params = []
        for _ in range(param_count):
            if PARAMS:  # Ensure PARAMS is not empty
                selected_params.append(random.choice(PARAMS))
        template = template.replace("{params}", ", ".join(selected_params))
    
    if "{var}" in template:
        template = template.replace("{var}", random.choice(VAR_NAMES))
    
    if "{class_name}" in template:
        template = template.replace("{class_name}", random.choice(CLASS_NAMES))
    
    if "{condition}" in template:
        conditions = [
            "x > 0", 
            "len(data) > 0", 
            "is_valid", 
            "response.status_code == 200", 
            "i < max_iterations"
        ]
        template = template.replace("{condition}", random.choice(conditions))
    
    if "{iterable}" in template:
        iterables = ["range(10)", "data", "values", "items", "response.json()"]
        template = template.replace("{iterable}", random.choice(iterables))
    
    if "{value}" in template:
        values = [
            "0", 
            "1", 
            "True", 
            "False", 
            "[]", 
            "{}", 
            "None", 
            "input_data", 
            "process_data()"
        ]
        template = template.replace("{value}", random.choice(values))
    
    if "{comment}" in template:
        comments = [
            "TODO: Implement this function",
            "Process the data",
            "Validate user input",
            "Handle edge cases",
            "Fix this later"
        ]
        template = template.replace("{comment}", random.choice(comments))
    
    # Add complexity for AI-generated code (sometimes add a nested or continuation line)
    if is_ai and random.random() < 0.3 and depth < 2:
        if template.endswith(":"):  # For blocks that need indentation
            # Generate a sub-line with increased depth to avoid infinite recursion
            sub_line = generate_random_code_line(is_ai, depth + 1)
            template += "\n    " + sub_line  # Add indentation
    
    return template

def generate_synthetic_data(num_samples=2000):
    """
    Generate synthetic code samples with labels
    
    Args:
        num_samples: Number of samples to generate
        
    Returns:
        tuple of (code_samples, labels)
    """
    code_samples = []
    labels = []
    
    for _ in range(num_samples // 2):
        # Generate AI code (more structured, longer functions)
        lines = []
        num_lines = random.randint(3, 7)  # AI tends to generate more complete functions
        
        for _ in range(num_lines):
            lines.append(generate_random_code_line(is_ai=True))
        
        code = "\n".join(lines)
        code_samples.append(code)
        labels.append(1)  # AI code is labeled as 1
        
        # Generate human-like code (more varied, potentially shorter or less structured)
        lines = []
        num_lines = random.randint(2, 5)  # Human code might be more concise
        
        for _ in range(num_lines):
            lines.append(generate_random_code_line(is_ai=False))
        
        code = "\n".join(lines)
        code_samples.append(code)
        labels.append(0)  # Human code is labeled as 0
    
    return code_samples, labels

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
    """
    Build and compile the model
    
    Args:
        input_shape: Shape of the sequence input
        feature_shape: Shape of the feature input
        
    Returns:
        compiled model
    """
    # Text input branch (sequences)
    text_input = Input(shape=(input_shape,))
    embedding = Embedding(input_dim=MAX_VOCAB_SIZE, output_dim=EMBEDDING_DIM, input_length=input_shape)(text_input)
    
    # Bidirectional LSTM for better sequence understanding
    lstm = Bidirectional(LSTM(64, return_sequences=True, dropout=0.2))(embedding)
    lstm = Bidirectional(LSTM(32, dropout=0.2))(lstm)
    
    # Feature input branch (numerical features)
    feature_input = Input(shape=(feature_shape,))
    feature_dense = Dense(64, activation='relu')(feature_input)
    feature_dense = Dropout(0.3)(feature_dense)
    feature_dense = Dense(32, activation='relu')(feature_dense)
    
    # Concatenate both branches
    concatenated = concatenate([lstm, feature_dense])
    
    # Output layer
    dense = Dense(64, activation='relu')(concatenated)
    dense = Dropout(0.4)(dense)
    dense = Dense(32, activation='relu')(dense)
    output = Dense(1, activation='sigmoid')(dense)
    
    # Create and compile model
    model = Model(inputs=[text_input, feature_input], outputs=output)
    
    # Use Adam optimizer with learning rate scheduling
    optimizer = Adam(learning_rate=0.001)
    
    model.compile(
        loss='binary_crossentropy',
        optimizer=optimizer,
        metrics=['accuracy']
    )
    
    return model

def train_model():
    """
    Main function to load data, extract features, train and save the model
    """
    try:
        set_random_seed()
        logging.info("Starting model training process")
        
        # Create directories for model and data storage if they don't exist
        model_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models')
        os.makedirs(model_dir, exist_ok=True)
        
        # Paths for saving models and tokenizers
        model_path = os.path.join(model_dir, 'code_classifier_model.h5')
        tokenizer_path = os.path.join(model_dir, 'tokenizer.pkl')
        scaler_path = os.path.join(model_dir, 'scaler.pkl')
        
        # Load existing data from CSV files
        real_code_samples = []
        real_labels = []
        
        # Look for data CSV files in both project root and backend/data directories
        csv_data_path_root = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '..', 'data')
        csv_data_path_backend = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'data')
        
        # Check if directories exist
        for data_dir in [csv_data_path_root, csv_data_path_backend]:
            if not os.path.exists(data_dir):
                logging.warning(f"Data directory not found: {data_dir}")
                continue
                
            logging.info(f"Looking for CSV files in {data_dir}")
            
            # Try to load the standard CSV file with code samples
            csv_file = os.path.join(data_dir, 'code_samples.csv')
            if os.path.exists(csv_file):
                logging.info(f"Loading data from {csv_file}")
                try:
                    # Use error_bad_lines=False (pandas <1.3) or on_bad_lines='skip' (pandas >=1.3)
                    # to skip problematic rows rather than failing
                    try:
                        df = pd.read_csv(csv_file, quotechar='"', escapechar='\\', 
                                         on_bad_lines='skip')
                    except TypeError:
                        # For older pandas versions
                        df = pd.read_csv(csv_file, quotechar='"', escapechar='\\', 
                                         error_bad_lines=False)
                        
                    if 'code' in df.columns and 'is_ai_generated' in df.columns:
                        for _, row in df.iterrows():
                            try:
                                if pd.notna(row['code']) and pd.notna(row['is_ai_generated']):
                                    real_code_samples.append(str(row['code']))
                                    real_labels.append(int(row['is_ai_generated']))
                            except Exception as e:
                                logging.warning(f"Error processing row: {e}")
                                continue
                    else:
                        logging.warning("CSV file does not have required columns: code, is_ai_generated")
                except Exception as e:
                    logging.error(f"Error loading CSV file code_samples.csv: {str(e)}")
            
            # Try to load merged AI and human files
            ai_file_path = os.path.join(data_dir, 'merged_AI_files.csv')
            human_file_path = os.path.join(data_dir, 'merged_human_files.csv')
            
            try:
                # Load AI samples
                if os.path.exists(ai_file_path):
                    try:
                        ai_df = pd.read_csv(ai_file_path, on_bad_lines='skip', 
                                           quotechar='"', escapechar='\\')
                    except TypeError:
                        ai_df = pd.read_csv(ai_file_path, error_bad_lines=False, 
                                           quotechar='"', escapechar='\\')
                        
                    if 'Content' in ai_df.columns:
                        ai_samples = []
                        for content in ai_df['Content'].dropna():
                            try:
                                ai_samples.append(str(content))
                            except Exception as e:
                                logging.warning(f"Error processing AI sample: {e}")
                        
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
                    try:
                        human_df = pd.read_csv(human_file_path, on_bad_lines='skip',
                                              quotechar='"', escapechar='\\')
                    except TypeError:
                        human_df = pd.read_csv(human_file_path, error_bad_lines=False,
                                              quotechar='"', escapechar='\\')
                        
                    if 'Content' in human_df.columns:
                        human_samples = []
                        for content in human_df['Content'].dropna():
                            try:
                                human_samples.append(str(content))
                            except Exception as e:
                                logging.warning(f"Error processing human sample: {e}")
                                
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
        else:
            logging.warning("No real data files were loaded!")
        
        # Generate synthetic data to supplement if needed
        logging.info("Generating synthetic data to supplement real data...")
        # Reduce the number of synthetic samples to avoid memory issues
        num_synthetic = 500 if len(real_code_samples) > 0 else 1000 
        synthetic_code_samples, synthetic_labels = generate_synthetic_data(num_synthetic)
        
        # Combine real data with synthetic data
        if len(real_code_samples) > 0:
            logging.info(f"Combining {len(real_code_samples)} real samples with {len(synthetic_code_samples)} synthetic samples")
            
            # Ensure we have a mix of both AI and human code
            if ai_count == 0 or human_count == 0:
                logging.warning(f"Imbalanced dataset: {ai_count} AI, {human_count} human. Using more synthetic data.")
                code_samples = real_code_samples + synthetic_code_samples
                labels = real_labels + synthetic_labels
            else:
                # If we have enough real data of both types, we can rely more on it
                code_samples = real_code_samples.copy()
                labels = real_labels.copy()
                
                # Add a smaller proportion of synthetic data for robustness
                synthetic_indices = np.random.choice(range(len(synthetic_code_samples)), 
                                                   size=min(len(synthetic_code_samples), len(real_code_samples)//2),
                                                   replace=False)
                code_samples.extend([synthetic_code_samples[i] for i in synthetic_indices])
                labels.extend([synthetic_labels[i] for i in synthetic_indices])
        else:
            logging.warning("No real data available, using only synthetic data")
            code_samples = synthetic_code_samples
            labels = synthetic_labels
        
        # Convert to numpy arrays
        code_samples = np.array(code_samples)
        labels = np.array(labels)
        
        # Shuffle the data
        indices = np.arange(len(code_samples))
        np.random.shuffle(indices)
        code_samples = code_samples[indices]
        labels = labels[indices]
        
        logging.info(f"Total dataset size: {len(code_samples)} samples")
        logging.info("Extracting features from code samples...")
        
        # Extract features
        X_features = []
        skipped_samples = 0
        
        for i, code in enumerate(code_samples):
            try:
                features = extract_code_features(code)
                X_features.append(features)
            except Exception as e:
                skipped_samples += 1
                # Replace with a default feature vector if extraction fails
                X_features.append([0] * len(FEATURE_NAMES))
                if skipped_samples <= 5:  # Only log the first few failures to avoid spam
                    logging.error(f"Error extracting features from sample {i}: {str(e)}")
                if skipped_samples == 6:
                    logging.warning("Additional feature extraction errors will be suppressed")
        
        if skipped_samples > 0:
            logging.warning(f"Skipped {skipped_samples} samples due to feature extraction errors")
        
        # Convert to DataFrame for better handling
        X_df = pd.DataFrame(X_features, columns=FEATURE_NAMES)
        y = labels
        
        # Handle missing values
        X_df.fillna(0, inplace=True)
        
        # Train test split
        X_train, X_test, y_train, y_test = train_test_split(X_df, y, test_size=0.2, random_state=42)
        
        # Standardize features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Convert to sequences for LSTM model
        X_train_text = [' '.join(map(str, features)) for features in X_train.values]
        X_test_text = [' '.join(map(str, features)) for features in X_test.values]
        
        # Tokenize text features
        tokenizer = Tokenizer(num_words=MAX_VOCAB_SIZE)
        tokenizer.fit_on_texts(X_train_text)
        
        X_train_seq = tokenizer.texts_to_sequences(X_train_text)
        X_test_seq = tokenizer.texts_to_sequences(X_test_text)
        
        # Pad sequences to ensure uniform length
        X_train_padded = pad_sequences(X_train_seq, maxlen=MAX_SEQUENCE_LENGTH)
        X_test_padded = pad_sequences(X_test_seq, maxlen=MAX_SEQUENCE_LENGTH)
        
        logging.info("Building model...")
        model = build_model(MAX_SEQUENCE_LENGTH, X_train_scaled.shape[1])
        
        # Train the model
        logging.info("Training model...")
        history = model.fit(
            [X_train_padded, X_train_scaled], y_train,
            validation_data=([X_test_padded, X_test_scaled], y_test),
            epochs=6,
            batch_size=32,
            verbose=1
        )
        
        # Evaluate model
        loss, accuracy = model.evaluate([X_test_padded, X_test_scaled], y_test, verbose=0)
        logging.info(f"Model evaluation - Loss: {loss:.4f}, Accuracy: {accuracy:.4f}")
        
        # Save model and tokenizer
        logging.info(f"Saving model to {model_path}")
        model.save(model_path)
        
        with open(tokenizer_path, 'wb') as f:
            pickle.dump(tokenizer, f)
            
        with open(scaler_path, 'wb') as f:
            pickle.dump(scaler, f)
            
        logging.info("Model training completed successfully")
        
        # Return success and model paths
        return {
            'success': True,
            'model_path': model_path,
            'tokenizer_path': tokenizer_path,
            'scaler_path': scaler_path,
            'accuracy': accuracy
        }
        
    except Exception as e:
        logging.error(f"Error in train_model: {str(e)}")
        logging.error(traceback.format_exc())
        return {
            'success': False,
            'error': str(e)
        }

if __name__ == "__main__":
    train_model()