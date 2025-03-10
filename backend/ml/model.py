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
from typing import Dict, Any, Tuple, List, Optional, Union
from functools import lru_cache

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
    Kod içindeki olası güvenlik açıklarını tespit eder
    """
    vulnerabilities = []
    risk_level = 0

    # Tehlikeli import ve kütüphane kullanımları
    dangerous_imports = {
        r'import\s+os': {'name': 'OS Access', 'risk': 'high', 'score': 8},
        r'import\s+subprocess': {'name': 'Command Execution', 'risk': 'critical', 'score': 10},
        r'import\s+sys': {'name': 'System Access', 'risk': 'medium', 'score': 5},
        r'import\s+(requests|http|urllib)': {'name': 'Network Access', 'risk': 'medium', 'score': 6},
        r'import\s+socket': {'name': 'Raw Socket Access', 'risk': 'high', 'score': 7},
        r'from\s+cryptography': {'name': 'Cryptography Usage', 'risk': 'medium', 'score': 4},
        r'import\s+flask': {'name': 'Web Framework', 'risk': 'low', 'score': 3},
        r'import\s+django': {'name': 'Web Framework', 'risk': 'low', 'score': 3},
        r'import\s+fastapi': {'name': 'Web Framework', 'risk': 'low', 'score': 3},
    }

    # Tehlikeli fonksiyon kullanımları
    dangerous_functions = {
        r'exec\s*\(': {'name': 'Code Execution', 'risk': 'critical', 'score': 10},
        r'eval\s*\(': {'name': 'Code Evaluation', 'risk': 'critical', 'score': 10},
        r'os\.system\s*\(': {'name': 'Command Execution', 'risk': 'critical', 'score': 10},
        r'subprocess\.': {'name': 'Command Execution', 'risk': 'critical', 'score': 9},
        r'open\s*\(': {'name': 'File Operations', 'risk': 'high', 'score': 7},
        r'__import__\s*\(': {'name': 'Dynamic Import', 'risk': 'high', 'score': 8},
        r'pickle\.': {'name': 'Unsafe Deserialization', 'risk': 'high', 'score': 8},
        r'yaml\.load\s*\(': {'name': 'Unsafe YAML Parsing', 'risk': 'high', 'score': 7},
        r'request\.get\s*\(': {'name': 'HTTP Request', 'risk': 'medium', 'score': 5},
        r'input\s*\(': {'name': 'User Input', 'risk': 'medium', 'score': 4},
    }
    
    # Güvenlik açıklarını tespit et
    for pattern, info in dangerous_imports.items():
        if re.search(pattern, code):
            vulnerabilities.append({
                'type': 'import',
                'name': info['name'],
                'risk': info['risk'],
                'description': f"Potentially dangerous import: {info['name']}",
                'score': info['score']
            })
            risk_level += info['score']
    
    for pattern, info in dangerous_functions.items():
        if re.search(pattern, code):
            vulnerabilities.append({
                'type': 'function',
                'name': info['name'],
                'risk': info['risk'],
                'description': f"Potentially dangerous function: {info['name']}",
                'score': info['score']
            })
            risk_level += info['score']
    
    # Yazım biçimi ve kalitesi
    code_quality = {}
    
    # Girinti tutarlılığı
    indentation_consistency = calculate_indentation_consistency(code)
    if indentation_consistency < 0.7:
        code_quality['indentation_consistency'] = {
            'value': indentation_consistency,
            'description': 'Poor indentation consistency',
            'score': 3
        }
        risk_level += 3
    
    # Uzun satırlar
    avg_line_length = calculate_avg_line_length(code)
    if avg_line_length > 120:
        code_quality['line_length'] = {
            'value': avg_line_length,
            'description': 'Lines too long on average',
            'score': 2
        }
        risk_level += 2
    
    # Karmaşıklık
    complexity = calculate_cyclomatic_complexity(code)
    if complexity > 15:
        code_quality['complexity'] = {
            'value': complexity,
            'description': 'High cyclomatic complexity',
            'score': 4
        }
        risk_level += 4
    
    # Yorum satırı yoğunluğu
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
    
    # Risk seviyesini normalleştir (0-100 arası)
    normalized_risk = min(100, risk_level * 3)
    
    return {
        'vulnerabilities': vulnerabilities,
        'code_quality': code_quality,
        'risk_level': normalized_risk,
        'high_risk': normalized_risk >= 70,
        'medium_risk': 30 <= normalized_risk < 70,
        'low_risk': normalized_risk < 30
    }

def load_model() -> Tuple:
    """Eğitilmiş modeli, tokenizer'ı ve scaler'ı yükler"""
    try:
        # Model klasörünün var olduğundan emin ol
        os.makedirs(MODEL_DIR, exist_ok=True)
        
        # Eğer model dosyası yoksa, train_model.py'yi çalıştırarak model eğitme seçeneği
        if not os.path.exists(MODEL_PATH):
            logging.warning("Model dosyası bulunamadı. Eğitim scriptini çalıştırmayı deneyeceğim.")
            try:
                from training.train_model import train_model
                model, tokenizer, scaler = train_model()
                return model, tokenizer, scaler
            except Exception as e:
                logging.error(f"Model eğitimi başarısız: {str(e)}")
                raise
        else:
            model = tf.keras.models.load_model(MODEL_PATH)
            
        # Tokenizer'ı yükle
        if not os.path.exists(TOKENIZER_PATH):
            raise FileNotFoundError(f"Tokenizer dosyası bulunamadı: {TOKENIZER_PATH}")
        
        with open(TOKENIZER_PATH) as f:
            tokenizer_json = json.load(f)
            tokenizer = tf.keras.preprocessing.text.tokenizer_from_json(tokenizer_json)
            
        # Scaler'ı yükle
        if not os.path.exists(SCALER_PATH):
            raise FileNotFoundError(f"Scaler dosyası bulunamadı: {SCALER_PATH}")
            
        scaler = joblib.load(SCALER_PATH)
        
        logging.info("Model, tokenizer ve scaler başarıyla yüklendi.")
        return model, tokenizer, scaler

    except Exception as e:
        logging.error(f"Model yükleme hatası: {str(e)}")
        raise

def predict_code(code: str, model, tokenizer, scaler) -> Dict[str, Any]:
    """
    Verilen kodu analiz eder ve sonuçları döndürür
    """
    try:
        # Kod özelliklerini çıkar
        features = np.array([extract_code_features(code)])
        scaled_features = scaler.transform(features)
        
        # Kodu sayısal formata dönüştür
        sequence = tokenizer.texts_to_sequences([code])
        padded_sequence = pad_sequences(sequence, maxlen=MAX_SEQUENCE_LENGTH)
        
        # Tahmin yap
        prediction = model.predict([padded_sequence, scaled_features])
        confidence = float(prediction[0][0])
        
        # Potansiyel AI kaynakları ve tahminleri
        ai_sources = ['ChatGPT-4', 'DeepSeek-Coder', 'Claude-3.7', 'Gemini-1.5', 'Copilot']
        source_probs = {}
        
        # Kod karakteristiklerine göre farklı AI kaynaklarına farklı olasılıklar ver
        if confidence > 0.5:  # AI olarak tespit edildiyse
            features_dict = {name: value for name, value in zip(FEATURE_NAMES, features[0])}
            
            # ChatGPT-4 genellikle daha tutarlı ve temiz kod üretir
            chatgpt_prob = min(0.95, confidence * (features_dict['indentation_consistency'] / 0.5))
            
            # DeepSeek daha karmaşık ve uzun yapıları tercih eder
            deepseek_prob = min(0.90, confidence * (features_dict['cyclomatic_complexity'] / 10))
            
            # Claude genellikle daha açıklayıcı ve yorumları zengin kod üretir
            claude_prob = min(0.85, confidence * (features_dict['num_comments'] / 10))
            
            # Diğer kaynaklara daha düşük olasılıklar ver
            gemini_prob = min(0.80, confidence * 0.8)
            copilot_prob = min(0.75, confidence * 0.7)
            
            # Olasılıkları normalize et
            total_prob = chatgpt_prob + deepseek_prob + claude_prob + gemini_prob + copilot_prob
            source_probs = {
                'ChatGPT-4': chatgpt_prob / total_prob,
                'DeepSeek-Coder': deepseek_prob / total_prob,
                'Claude-3.7': claude_prob / total_prob,
                'Gemini-1.5': gemini_prob / total_prob,
                'Copilot': copilot_prob / total_prob
            }
            
            # En yüksek olasılıklı kaynağı seç
            detected_source = max(source_probs, key=source_probs.get)
        else:
            detected_source = 'Human'
            source_probs = {source: 0.0 for source in ai_sources}
            source_probs['Human'] = 1.0
        
        # Güvenlik analizi yap
        security_analysis = analyze_code_vulnerabilities(code)
        
        return {
            'prediction': 'AI' if confidence > 0.5 else 'Human',
            'confidence': round(confidence if confidence > 0.5 else 1 - confidence, 3),
            'source': detected_source,
            'source_probabilities': source_probs,
            'features': {name: float(value) for name, value in zip(FEATURE_NAMES, features[0])},
            'security_analysis': security_analysis,
            'risk_score': round(security_analysis['risk_level'], 1)
        }

    except Exception as e:
        logging.error(f"Kod analiz hatası: {str(e)}")
        return {
            'error': str(e),
            'prediction': 'Unknown',
            'confidence': 0,
            'risk_score': 0
        }

def parse_github_url(input_url):
    """GitHub URL'ini parse eder ve repository bilgilerini döndürür"""
    # GitHub URL'lerini normalize et
    input_url = re.sub(r"(https?://github.com/|/blob/|/tree/)", "", input_url).strip("/")
    parts = input_url.split("/")

    repo_info = {
        'owner': parts[0],
        'repo': parts[1],
        'branch': 'main'
    }

    if len(parts) > 2:
        branch_candidates = ['main', 'master', 'dev', 'development']
        if parts[2] in branch_candidates:
            repo_info['branch'] = parts[2]
            repo_info['file_path'] = "/".join(parts[3:]) if len(parts) > 3 else None
        else:
            repo_info['file_path'] = "/".join(parts[2:])

    return repo_info

def fetch_github_code(repo_info, token=None):
    """
    GitHub reposundan kod dosyalarını çeker
    
    Args:
        repo_info: Repository bilgileri
        token: Github API Token
        
    Returns:
        str: Çekilen kodlar
    """
    import requests
    import base64
    import os
    
    try:
        owner = repo_info['owner']
        repo = repo_info['repo']
        branch = repo_info.get('branch', 'main')
        file_path = repo_info.get('file_path')

        # GitHub API Token (Çevre değişkeninden veya parametre olarak)
        headers = {}
        github_token = token or os.getenv('GITHUB_TOKEN')
        if github_token:
            headers["Authorization"] = f"token {github_token}"

        # Repo detaylarını getir
        repo_api_url = f"https://api.github.com/repos/{owner}/{repo}"
        repo_response = requests.get(repo_api_url, headers=headers)

        if repo_response.status_code != 200:
            raise ConnectionError(f"Repository bulunamadı ({repo_response.status_code}): {repo_response.text}")

        # Eğer belirli bir dosya isteniyorsa, sadece o dosyayı getir
        if file_path:
            file_url = f"{repo_api_url}/contents/{file_path}?ref={branch}"
            file_response = requests.get(file_url, headers=headers)

            if file_response.status_code != 200:
                raise FileNotFoundError(f"Dosya bulunamadı ({file_response.status_code}): {file_response.text}")

            if 'content' not in file_response.json():
                raise KeyError("API cevabında 'content' alanı bulunamadı")

            try:
                content = base64.b64decode(file_response.json()['content']).decode('utf-8')
                return f"### Dosya: {file_path} ###\n{content}"
            except UnicodeDecodeError:
                raise ValueError("Binary dosya formatı - Metin dosyası bekleniyor")

        # Repo'daki tüm dosyaları recursive olarak listele
        trees_url = f"{repo_api_url}/git/trees/{branch}?recursive=1"
        trees_response = requests.get(trees_url, headers=headers)
        trees_response.raise_for_status()

        # Sadece belli dosya uzantılarını kabul et
        valid_exts = {'py', 'js', 'java', 'c', 'cpp', 'cs', 'ts', 'rs', 'go', 'rb', 'php', 'sol'}
        files = [
            f['path'] for f in trees_response.json()['tree']
            if f['type'] == 'blob'
            and f['path'].split('.')[-1] in valid_exts
            and f['size'] < 1000000  # 1MB'dan küçük dosyaları kabul et
        ]

        all_code = ""
        for path in files[:50]:  # En fazla 50 dosya al (API limit sınırlaması için)
            try:
                file_url = f"{repo_api_url}/contents/{path}?ref={branch}"
                file_response = requests.get(file_url, headers=headers)

                if file_response.status_code != 200:
                    continue

                if 'content' not in file_response.json():
                    continue

                content = base64.b64decode(file_response.json()['content']).decode('utf-8')
                all_code += f"\n\n### Dosya: {path} ###\n{content}"

            except Exception as e:
                logging.warning(f"⚠️ {path} dosyası işlenirken hata: {str(e)[:100]}...")

        if not all_code:
            raise ValueError("Repository'den kod içeriği alınamadı")
            
        return all_code

    except Exception as e:
        logging.error(f"GitHub kod çekme hatası: {str(e)}")
        if 'file_url' in locals():
            logging.error(f"İstek URL'i: {file_url}")
        raise 