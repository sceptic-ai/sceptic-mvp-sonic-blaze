import base64
import requests
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.sequence import pad_sequences
import joblib
import re
import json
import random
import os
import logging
import time
import pickle
import traceback
from typing import Dict, Any, Tuple, List, Optional, Union
from functools import lru_cache
import pandas as pd

# Model ve data sabitleri
MAX_VOCAB_SIZE = 10000
EMBEDDING_DIM = 128
MAX_SEQUENCE_LENGTH = 150
FEATURE_NAMES = [
    'num_lines', 'num_chars', 'num_spaces', 'num_tabs',
    'num_keywords', 'num_comments', 'num_functions',
    'num_classes', 'indentation_consistency', 'avg_line_length',
    'cyclomatic_complexity', 'num_loops', 'variable_name_consistency',
    'comment_to_code_ratio', 'max_line_length', 'avg_function_length'
]

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'ai_detector.keras')
TOKENIZER_PATH = os.path.join(MODEL_DIR, 'tokenizer.json')
SCALER_PATH = os.path.join(MODEL_DIR, 'scaler.pkl')

def set_random_seed(seed_value=42):
    """Set random seed for reproducibility"""
    random.seed(seed_value)
    np.random.seed(seed_value)
    tf.random.set_seed(seed_value)
    os.environ['PYTHONHASHSEED'] = str(seed_value)

def calculate_indentation_consistency(code):
    """Kod girintilerinin tutarlılığını hesaplar"""
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
    """Ortalama satır uzunluğunu hesaplar"""
    lines = [line.rstrip() for line in code.split('\n') if line.strip()]
    return np.mean([len(line) for line in lines]).round(2) if lines else 0

def calculate_cyclomatic_complexity(code):
    """Kaba döngüsel karmaşıklığı hesaplar"""
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

def extract_code_features(code):
    """Extract comprehensive features from code for analysis"""
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

def analyze_code_vulnerabilities(code: str) -> Dict[str, Any]:
    """
    Performs comprehensive security analysis on code to identify vulnerabilities
    
    Args:
        code: Source code string
        
    Returns:
        Dictionary with vulnerability details, code quality metrics, and risk assessment
    """
    vulnerabilities = []
    code_quality = {}
    risk_level = 0

    # Tehlikeli import ve kütüphane kullanımları
    dangerous_imports = {
        r'import\s+os': {'name': 'OS Access', 'risk': 'high', 'score': 8, 
                        'description': 'Code has access to operating system functions that could be dangerous if misused'},
        r'import\s+subprocess': {'name': 'Command Execution', 'risk': 'critical', 'score': 10,
                               'description': 'Code can execute arbitrary system commands, posing serious security risks'},
        r'import\s+sys': {'name': 'System Access', 'risk': 'medium', 'score': 5,
                        'description': 'Code has access to Python interpreter and system variables'},
        r'import\s+(requests|http|urllib)': {'name': 'Network Access', 'risk': 'medium', 'score': 6,
                                           'description': 'Code can make network requests to external services'},
        r'import\s+socket': {'name': 'Raw Socket Access', 'risk': 'high', 'score': 7,
                           'description': 'Code has low-level network access which can be used maliciously'},
        r'from\s+cryptography': {'name': 'Cryptography Usage', 'risk': 'medium', 'score': 4,
                               'description': 'Code uses cryptographic functions which may have security implications'},
        r'import\s+(flask|django|fastapi)': {'name': 'Web Framework', 'risk': 'low', 'score': 3,
                                          'description': 'Code uses web frameworks which may expose endpoints'},
        r'import\s+sqlite3|import\s+pymysql|import\s+psycopg2': {'name': 'Database Access', 'risk': 'medium', 'score': 5,
                                                              'description': 'Code has database access capabilities'},
    }

    # Tehlikeli fonksiyon kullanımları
    dangerous_functions = {
        r'eval\s*\(': {'name': 'Arbitrary Code Execution', 'risk': 'critical', 'score': 10,
                     'description': 'eval() can execute arbitrary code and is extremely dangerous'},
        r'exec\s*\(': {'name': 'Arbitrary Code Execution', 'risk': 'critical', 'score': 10,
                     'description': 'exec() can execute arbitrary code and is extremely dangerous'},
        r'os\.system\s*\(': {'name': 'Command Execution', 'risk': 'critical', 'score': 9,
                          'description': 'Executes shell commands which can be dangerous if user input is involved'},
        r'subprocess\.': {'name': 'Command Execution', 'risk': 'high', 'score': 8,
                        'description': 'Subprocess functions can execute system commands'},
        r'open\s*\(': {'name': 'File Operations', 'risk': 'medium', 'score': 5,
                     'description': 'File operations may lead to information disclosure or modification'},
        r'input\s*\(': {'name': 'User Input', 'risk': 'medium', 'score': 4,
                      'description': 'User input needs proper validation to prevent injection attacks'},
        r'pickle\.': {'name': 'Unsafe Deserialization', 'risk': 'high', 'score': 7,
                    'description': 'Pickle deserialization can lead to arbitrary code execution'},
        r'\.format\s*\(|f[\'"]': {'name': 'String Formatting', 'risk': 'low', 'score': 2,
                               'description': 'String formatting could lead to injection if used with untrusted input'},
        r'request\.': {'name': 'Web Request Handling', 'risk': 'medium', 'score': 5,
                     'description': 'Web request handling requires proper validation and sanitization'},
        r'\.execute\s*\(': {'name': 'SQL Operations', 'risk': 'high', 'score': 7,
                          'description': 'Database operations need proper parameterization to prevent SQL injection'},
    }
    
    # Güvenlik açıklarını kontrol et
    for pattern, info in dangerous_imports.items():
        if re.search(pattern, code):
            vulnerability = info.copy()
            vulnerability['type'] = 'import'
            vulnerabilities.append(vulnerability)
            risk_level += vulnerability['score']
    
    for pattern, info in dangerous_functions.items():
        if re.search(pattern, code):
            # Check if this is likely safe or contained within proper validation
            is_potentially_safe = re.search(r'try\s*:.*?' + pattern + '.*?except', code, re.DOTALL) is not None
            
            vulnerability = info.copy()
            vulnerability['type'] = 'function'
            
            # Reduce the score if it appears to be properly handled
            if is_potentially_safe:
                vulnerability['score'] = max(1, vulnerability['score'] // 2)
                vulnerability['description'] += " (appears to be in a try-except block)"
                vulnerability['risk'] = 'low' if vulnerability['score'] < 4 else 'medium'
            
            vulnerabilities.append(vulnerability)
            risk_level += vulnerability['score']
    
    # Additional patterns to check for common vulnerabilities
    vuln_patterns = [
        (r'password\s*=\s*[\'"][^\'"]+[\'"]', 'Hardcoded Password', 'critical', 9,
         'Code contains hardcoded password which is a severe security risk'),
        (r'secret\s*=\s*[\'"][^\'"]+[\'"]', 'Hardcoded Secret', 'critical', 8,
         'Code contains hardcoded secret which is a severe security risk'),
        (r'token\s*=\s*[\'"][^\'"]+[\'"]', 'Hardcoded Token', 'high', 7,
         'Code contains hardcoded token which should be stored securely'),
        (r'SELECT\s+.*?\s+FROM.*?WHERE.*?=\s*[\'"]', 'Potential SQL Injection', 'high', 8,
         'SQL queries should use parameterized statements to prevent injection'),
        (r'curl\s+', 'Command-line Network Access', 'medium', 6,
         'Using curl in commands can lead to injections if user input is involved'),
    ]
    
    for pattern, name, risk, score, description in vuln_patterns:
        if re.search(pattern, code):
            vulnerabilities.append({
                'type': 'pattern',
                'name': name,
                'risk': risk,
                'score': score,
                'description': description
            })
            risk_level += score
    
    # Kod kalite sorunlarını kontrol et
    indentation_consistency = calculate_indentation_consistency(code)
    if indentation_consistency < 0.8:
        code_quality['indentation'] = {
            'value': indentation_consistency,
            'description': 'Inconsistent indentation',
            'score': 3
        }
        risk_level += 3
    
    # Satır uzunluğu kontrolü
    avg_line_length = calculate_avg_line_length(code)
    if avg_line_length > 120:
        code_quality['line_length'] = {
            'value': avg_line_length,
            'description': 'Lines too long on average',
            'score': 2
        }
        risk_level += 2
    
    # Karmaşıklık kontrolü
    complexity = calculate_cyclomatic_complexity(code)
    if complexity > 15:
        code_quality['complexity'] = {
            'value': complexity,
            'description': 'High cyclomatic complexity',
            'score': 4
        }
        risk_level += 4
    
    # Yorum satırı yoğunluğu kontrolü
    total_lines = code.count('\n') + 1
    comment_lines = len(re.findall(r'^\s*#.*$|^\s*""".*?"""\s*$|^\s*\'\'\'.*?\'\'\'\s*$', code, re.MULTILINE))
    comment_ratio = comment_lines / total_lines if total_lines > 0 else 0
    
    if comment_ratio < 0.05:
        code_quality['documentation'] = {
            'value': comment_ratio,
            'description': 'Poor documentation/comments',
            'score': 2
        }
        risk_level += 2
    
    # Variable naming consistency check
    var_names = re.findall(r'\b([a-zA-Z_][a-zA-Z0-9_]*)\s*=', code)
    var_name_consistency = calculate_naming_consistency(var_names)
    
    if var_name_consistency < 0.7 and len(var_names) > 5:
        code_quality['naming_consistency'] = {
            'value': var_name_consistency,
            'description': 'Inconsistent variable naming conventions',
            'score': 3
        }
        risk_level += 3
    
    # Function length check
    function_bodies = re.findall(r'def\s+[^(]+\([^)]*\):\s*(?:\n\s+[^\n]+)+', code)
    if function_bodies:
        avg_function_length = np.mean([fb.count('\n') for fb in function_bodies])
        if avg_function_length > 30:
            code_quality['function_length'] = {
                'value': avg_function_length,
                'description': 'Functions are too long on average',
                'score': 3
            }
            risk_level += 3
    
    # Risk seviyesini normalleştir (0-100 arası)
    normalized_risk = min(100, risk_level * 2.5)
    
    return {
        'vulnerabilities': vulnerabilities,
        'code_quality': code_quality,
        'risk_level': normalized_risk,
        'high_risk': normalized_risk >= 70,
        'medium_risk': 30 <= normalized_risk < 70,
        'low_risk': normalized_risk < 30
    }

@lru_cache(maxsize=32)
def load_model() -> Tuple:
    """
    Load the trained model, tokenizer, and scaler
    
    Returns:
        Tuple of (model, tokenizer, scaler) or (None, None, None) if loading fails
    """
    try:
        # Get the model directory
        model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
        
        # Define paths for model, tokenizer, and scaler
        model_path = os.path.join(model_dir, 'code_classifier_model.h5')
        tokenizer_path = os.path.join(model_dir, 'tokenizer.pkl')
        scaler_path = os.path.join(model_dir, 'scaler.pkl')
        
        # Check if all files exist
        if not os.path.exists(model_path) or not os.path.exists(tokenizer_path) or not os.path.exists(scaler_path):
            logging.warning(f"Model or preprocessing files not found in {model_dir}")
            return None, None, None
        
        # Load model
        logging.info(f"Loading model from {model_path}")
        model = tf.keras.models.load_model(model_path)
        
        # Load tokenizer
        logging.info(f"Loading tokenizer from {tokenizer_path}")
        with open(tokenizer_path, 'rb') as f:
            tokenizer = pickle.load(f)
        
        # Load scaler
        logging.info(f"Loading scaler from {scaler_path}")
        with open(scaler_path, 'rb') as f:
            scaler = pickle.load(f)
        
        logging.info("Model and preprocessing files loaded successfully")
        return model, tokenizer, scaler

    except Exception as e:
        logging.error(f"Error loading model: {str(e)}")
        traceback.print_exc()
        return None, None, None

def predict_code(code: str, model=None, tokenizer=None, scaler=None) -> Dict[str, Any]:
    """
    Predict whether code is AI-generated and analyze its security
    
    Args:
        code: Source code to analyze
        model: Pre-loaded model (optional)
        tokenizer: Pre-loaded tokenizer (optional)
        scaler: Pre-loaded scaler (optional)
        
    Returns:
        Dictionary with prediction results and analysis
    """
    start_time = time.time()
    
    try:
        # Load model, tokenizer, and scaler if not provided
        if model is None or tokenizer is None or scaler is None:
            model, tokenizer, scaler = load_model()
            
            # If loading fails, use fallback method
            if model is None:
                logging.warning("Using fallback method for prediction as model failed to load")
                return {
                    'prediction': 'Unknown',
                    'confidence': 0.5,
                    'source': 'Fallback',
                    'source_probabilities': {
                        'AI': 0.5,
                        'Human': 0.5
                    },
                    'features': {},
                    'security_analysis': analyze_code_vulnerabilities(code),
                    'processing_time_ms': round((time.time() - start_time) * 1000)
                }
        
        # Extract features from code
        features = extract_code_features(code)
        
        # Create a DataFrame with the features
        feature_df = pd.DataFrame([features], columns=FEATURE_NAMES)
        feature_df.fillna(0, inplace=True)  # Replace NaN values with 0
        
        # Scale the features
        scaled_features = scaler.transform(feature_df)
        
        # Prepare text input - handle both dict and list formats
        if isinstance(features, dict):
            text_input = ' '.join(map(str, features.values()))
        else:
            text_input = ' '.join(map(str, features))
        
        seq = tokenizer.texts_to_sequences([text_input])
        padded_seq = pad_sequences(seq, maxlen=MAX_SEQUENCE_LENGTH)
        
        # Make prediction
        prediction = model.predict([padded_seq, scaled_features], verbose=0)[0][0]
        
        # Determine source based on prediction
        if prediction >= 0.8:
            source = 'AI (High Confidence)'
            prediction_label = 'AI'
        elif prediction >= 0.6:
            source = 'AI (Medium Confidence)'
            prediction_label = 'AI'
        elif prediction <= 0.2:
            source = 'Human (High Confidence)'
            prediction_label = 'Human'
        elif prediction <= 0.4:
            source = 'Human (Medium Confidence)'
            prediction_label = 'Human'
        else:
            source = 'Uncertain'
            prediction_label = 'Uncertain'
        
        # Calculate probabilities
        ai_prob = float(prediction)
        human_prob = 1.0 - ai_prob
        
        # Analyze code for security vulnerabilities
        security_analysis = analyze_code_vulnerabilities(code)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Prepare features for output
        if isinstance(features, dict):
            features_dict = features
        else:
            features_dict = {name: float(value) for name, value in zip(FEATURE_NAMES, features)}
        
        # Return results
        return {
            'prediction': prediction_label,
            'confidence': round(max(ai_prob, human_prob), 3),
            'source': source,
            'source_probabilities': {
                'AI': round(ai_prob, 3),
                'Human': round(human_prob, 3)
            },
            'features': features_dict,
            'security_analysis': security_analysis,
            'risk_score': round(security_analysis['risk_level'], 1),
            'processing_time_ms': round(processing_time * 1000)
        }

    except Exception as e:
        processing_time = time.time() - start_time
        logging.error(f"Code analysis error after {processing_time:.2f}s: {str(e)}")
        logging.error(traceback.format_exc())
        
        # Provide a simplified response in case of errors
        return {
            'error': str(e),
            'prediction': 'Error',
            'confidence': 0,
            'source': 'Error',
            'risk_score': 0,
            'security_analysis': {
                'vulnerabilities': [],
                'code_quality': {},
                'risk_level': 0,
                'high_risk': False,
                'medium_risk': False,
                'low_risk': False
            },
            'processing_time_ms': round(processing_time * 1000)
        }

def parse_github_url(url: str) -> Optional[Tuple[str, str, str, Optional[str]]]:
    """
    Parse a GitHub URL into its components: owner, repo, branch/tag, and path.
    
    Args:
        url: GitHub URL in various formats
        
    Returns:
        Tuple of (owner, repo, branch, path) or None if URL not valid
    """
    patterns = [
        # Standard GitHub URL format
        r'https?://github\.com/([^/]+)/([^/]+)(?:/tree/([^/]+)(?:/(.+))?)?',
        # GitHub raw content URL
        r'https?://raw\.githubusercontent\.com/([^/]+)/([^/]+)/([^/]+)(?:/(.+))?',
        # GitHub blob URL
        r'https?://github\.com/([^/]+)/([^/]+)/blob/([^/]+)(?:/(.+))?',
        # Shortened GitHub URL (main branch implied)
        r'https?://github\.com/([^/]+)/([^/]+)/?$'
    ]
    
    for pattern in patterns:
        match = re.match(pattern, url)
        if match:
            owner, repo = match.group(1), match.group(2)
            
            # Remove .git suffix if present
            if repo.endswith('.git'):
                repo = repo[:-4]
                
            # Extract branch or use main/master as default
            branch = match.group(3) if len(match.groups()) > 2 and match.group(3) else 'main'
            
            # Extract path if available
            path = match.group(4) if len(match.groups()) > 3 and match.group(4) else None
            
            return owner, repo, branch, path
    
    # Handle shorthand format: username/repo
    shorthand_match = re.match(r'^([^/]+)/([^/]+)$', url)
    if shorthand_match:
        owner, repo = shorthand_match.group(1), shorthand_match.group(2)
        if repo.endswith('.git'):
            repo = repo[:-4]
        return owner, repo, 'main', None
    
    return None

def fetch_github_code(url: str, max_files: int = 10, max_lines: int = 5000) -> Dict[str, Any]:
    """
    Fetch code from a GitHub repository or specific file
    
    Args:
        url: GitHub URL to repository, directory, or file
        max_files: Maximum number of files to fetch
        max_lines: Maximum total lines of code to fetch
        
    Returns:
        Dictionary with repository information and code content
    """
    try:
        # Parse GitHub URL
        parsed = parse_github_url(url)
        if not parsed:
            return {'error': f"Invalid GitHub URL format: {url}"}
        
        owner, repo, branch, path = parsed
        
        # Initialize response
        response = {
            'repository': f"{owner}/{repo}",
            'branch': branch,
            'files': [],
            'total_lines': 0,
            'fetched_files': 0,
            'truncated': False
        }
        
        # Get GitHub API token from environment if available
        github_token = os.environ.get('GITHUB_API_TOKEN')
        headers = {'Authorization': f'token {github_token}'} if github_token else {}
        
        # Construct API URL
        api_base = f"https://api.github.com/repos/{owner}/{repo}/contents"
        api_url = f"{api_base}/{path}" if path else api_base
        api_url += f"?ref={branch}"
        
        # Log request details
        logging.info(f"Fetching GitHub content from: {api_url}")
        
        # Fetch directory contents or single file
        start_time = time.time()
        r = requests.get(api_url, headers=headers)
        r.raise_for_status()
        
        # Handle API rate limits
        remaining_rate_limit = int(r.headers.get('X-RateLimit-Remaining', 60))
        if remaining_rate_limit < 5:
            logging.warning(f"GitHub API rate limit running low: {remaining_rate_limit} requests remaining")
        
        # Process response
        data = r.json()
        
        # If response is a list, it's a directory
        if isinstance(data, list):
            files_to_process = []
            
            # Filter for code files
            code_extensions = ['.py', '.js', '.jsx', '.ts', '.tsx', '.sol', '.java', '.c', '.cpp', '.h', '.go', '.rs', '.php', '.rb']
            
            for item in data:
                if item['type'] == 'file' and any(item['name'].endswith(ext) for ext in code_extensions):
                    files_to_process.append(item)
            
            # Sort by size (smallest first) to maximize file coverage
            files_to_process.sort(key=lambda x: x.get('size', 0))
            
            # Fetch each file content up to limits
            for file_item in files_to_process[:max_files]:
                try:
                    if response['total_lines'] >= max_lines:
                        response['truncated'] = True
                        break
                    
                    file_content = requests.get(file_item['download_url'], headers=headers).text
                    line_count = file_content.count('\n') + 1
                    
                    # Skip very large files
                    if line_count > 1000:
                        continue
                    
                    # Add file to response
                    response['files'].append({
                        'name': file_item['name'],
                        'path': file_item['path'],
                        'content': file_content,
                        'line_count': line_count
                    })
                    
                    response['total_lines'] += line_count
                    response['fetched_files'] += 1
                    
                except Exception as e:
                    logging.error(f"Error fetching file {file_item['path']}: {str(e)}")
            
        # If response is a dict with content, it's a single file
        elif isinstance(data, dict) and 'type' in data and data['type'] == 'file':
            try:
                file_content = requests.get(data['download_url'], headers=headers).text
                line_count = file_content.count('\n') + 1
                
                response['files'].append({
                    'name': data['name'],
                    'path': data.get('path', ''),
                    'content': file_content,
                    'line_count': line_count
                })
                
                response['total_lines'] = line_count
                response['fetched_files'] = 1

            except Exception as e:
                logging.error(f"Error fetching file {data.get('path', '')}: {str(e)}")
                return {'error': f"Error fetching file: {str(e)}"}
        
        # Log performance
        processing_time = time.time() - start_time
        logging.info(f"GitHub fetch completed in {processing_time:.2f}s: {response['fetched_files']} files, {response['total_lines']} lines")
        
        return response
        
    except requests.exceptions.RequestException as e:
        status_code = e.response.status_code if hasattr(e, 'response') and hasattr(e.response, 'status_code') else 'unknown'
        logging.error(f"GitHub API error (status {status_code}): {str(e)}")
        
        if status_code == 404:
            return {'error': f"Repository, branch, or path not found: {url}"}
        elif status_code == 403:
            return {'error': "GitHub API rate limit exceeded. Try again later or use an API token."}
        else:
            return {'error': f"GitHub API error: {str(e)}"}
    
    except Exception as e:
        logging.error(f"Error in fetch_github_code: {str(e)}")
        return {'error': f"Failed to fetch GitHub code: {str(e)}"}

async def analyze_github_repo(url: str) -> Dict[str, Any]:
    """
    Analyze code from a GitHub repository for AI detection and security vulnerabilities
    
    Args:
        url: GitHub repository URL
        
    Returns:
        Analysis results for the repository
    """
    try:
        # Fetch code from GitHub
        repo_data = fetch_github_code(url)
        
        if 'error' in repo_data:
            return {'error': repo_data['error']}
        
        if not repo_data['files']:
            return {'error': 'No suitable code files found in the repository'}
        
        # Load model components
        model, tokenizer, scaler = load_model()
        
        # Analyze each file
        results = []
        combined_code = ""
        
        for file_info in repo_data['files']:
            # Skip files that are too large or empty
            if len(file_info['content']) > 100000 or not file_info['content'].strip():
                continue
                
            # Analyze the file
            file_result = predict_code(file_info['content'], model, tokenizer, scaler)
            
            results.append({
                'file_name': file_info['name'],
                'file_path': file_info['path'],
                'line_count': file_info['line_count'],
                'analysis': file_result
            })
            
            # Append code for combined analysis
            combined_code += f"\n\n# File: {file_info['path']}\n{file_info['content']}"
        
        # Perform combined analysis on all files together
        if combined_code:
            combined_result = predict_code(combined_code, model, tokenizer, scaler)
        else:
            combined_result = {'error': 'Could not perform combined analysis'}
        
        # Calculate overall metrics
        ai_confidence_values = [r['analysis']['confidence'] for r in results 
                               if 'analysis' in r and 'confidence' in r['analysis']]
        
        risk_scores = [r['analysis']['risk_score'] for r in results 
                      if 'analysis' in r and 'risk_score' in r['analysis']]
        
        if ai_confidence_values:
            avg_ai_confidence = sum(ai_confidence_values) / len(ai_confidence_values)
            max_ai_confidence = max(ai_confidence_values)
        else:
            avg_ai_confidence = 0.0
            max_ai_confidence = 0.0
            
        if risk_scores:
            avg_risk_score = sum(risk_scores) / len(risk_scores)
            max_risk_score = max(risk_scores)
        else:
            avg_risk_score = 0.0
            max_risk_score = 0.0
        
        # Return comprehensive results
        return {
            'repository': repo_data['repository'],
            'branch': repo_data['branch'],
            'files_analyzed': len(results),
            'total_lines': repo_data['total_lines'],
            'file_results': results,
            'combined_analysis': combined_result,
            'overall_metrics': {
                'avg_ai_confidence': round(avg_ai_confidence, 3),
                'max_ai_confidence': round(max_ai_confidence, 3),
                'avg_risk_score': round(avg_risk_score, 1),
                'max_risk_score': round(max_risk_score, 1),
                'detected_source': combined_result.get('source', 'Unknown')
            },
            'truncated': repo_data.get('truncated', False)
        }

    except Exception as e:
        logging.error(f"Error analyzing GitHub repository: {str(e)}")
        return {'error': f"Failed to analyze repository: {str(e)}"} 