import json
import os
import logging
import uuid
import aiofiles
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import asyncio
from dotenv import load_dotenv

# Blockchain modülünü import etme
try:
    from backend.blockchain.sonic import store_analysis_on_chain, get_analysis_from_chain, check_connection
except ImportError:
    logging.warning("Blockchain modülü yüklenemedi. Blockchain fonksiyonları devre dışı.")
    # Mocklanmış fonksiyonlar
    def store_analysis_on_chain(analysis_data, testnet=None):
        return {"success": False, "error": "Blockchain modülü yüklenmedi"}
    def get_analysis_from_chain(audit_id, testnet=None):
        return None
    def check_connection(testnet=None):
        return False

# ML modülünü import etme
try:
    from backend.ml.model import predict_code, parse_github_url, fetch_github_code, load_model
except ImportError:
    logging.error("ML modülü yüklenemedi!")
    # Basit mocklanmış fonksiyonlar
    def predict_code(code, model=None, tokenizer=None, scaler=None):
        return {"prediction": "Unknown", "confidence": 0, "risk_score": 0}
    def parse_github_url(url):
        return {"owner": "unknown", "repo": "unknown", "branch": "main", "path": ""}
    def fetch_github_code(repo_info, token=None):
        return "// No code found"
    def load_model():
        return None, None, None

# Logging konfigürasyonu
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("api.log")
    ]
)

app = FastAPI(title="Sceptic AI API", description="AI Code Analysis & Blockchain Verification API")

# CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Üretimde bunu sınırlandırın
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelleri tanımlama
class GithubAnalysisRequest(BaseModel):
    repo_url: str
    branch: Optional[str] = "main"
    file_path: Optional[str] = None

class CodeAnalysisRequest(BaseModel):
    code: str

class AnalysisResponse(BaseModel):
    id: str
    repo_url: Optional[str] = None
    timestamp: str
    status: str
    result: Optional[Dict[str, Any]] = None
    blockchain_tx: Optional[str] = None
    explorer_url: Optional[str] = None

# Global değişkenler
model = None
tokenizer = None
scaler = None

# Analiz sonuçları için depolama dizini
RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'analysis_results')
os.makedirs(RESULTS_DIR, exist_ok=True)

@app.on_event("startup")
async def startup_event():
    """Uygulama başladığında ML modelini yükle ve blockchain bağlantısını kontrol et"""
    global model, tokenizer, scaler
    try:
        model, tokenizer, scaler = load_model()
        logging.info("ML model loaded successfully")
        
        # Blockchain bağlantısını kontrol et
        blockchain_connected = check_connection()
        if blockchain_connected:
            logging.info("Blockchain connection successful")
        else:
            logging.warning("Blockchain connection failed - some features may be limited")
            
    except Exception as e:
        logging.error(f"Startup error: {str(e)}")
        raise

@app.get("/")
def read_root():
    """Kök endpoint"""
    return {"message": "Welcome to Sceptic AI API - Code Analysis Platform"}

@app.post("/analyze/github", response_model=AnalysisResponse)
async def analyze_github_repo(request: GithubAnalysisRequest, background_tasks: BackgroundTasks):
    """GitHub repository analiz etme endpoint'i"""
    try:
        # Benzersiz ID oluştur
        analysis_id = f"analysis_{uuid.uuid4().hex}"
        
        # Asenkron işlem başlat
        background_tasks.add_task(process_github_analysis, analysis_id, request)
        
        # Hemen bir yanıt döndür
        return {
            "id": analysis_id,
            "repo_url": request.repo_url,
            "timestamp": datetime.now().isoformat(),
            "status": "pending",
            "result": None,
            "blockchain_tx": None,
            "explorer_url": None
        }
    except Exception as e:
        logging.error(f"GitHub analizi başlatma hatası: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/code", response_model=Dict[str, Any])
async def analyze_code(request: CodeAnalysisRequest):
    """Doğrudan kod analiz endpoint'i"""
    try:
        # Kodu analiz et
        result = predict_code(request.code, model, tokenizer, scaler)
        return result
    except Exception as e:
        logging.error(f"Kod analiz hatası: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analysis/{analysis_id}", response_model=AnalysisResponse)
async def get_analysis(analysis_id: str):
    """Belirli bir analiz sonucunu getirme endpoint'i"""
    try:
        # Analiz dosyasının yolunu belirle
        analysis_file = os.path.join(RESULTS_DIR, f"{analysis_id}.json")
        
        if not os.path.exists(analysis_file):
            # Blockchain'den kontrol et
            blockchain_data = get_analysis_from_chain(analysis_id)
            if blockchain_data:
                # Sadece temel bilgileri döndür, tam analiz sonucu blockchain'de hashlenerek saklanıyor
                return {
                    "id": analysis_id,
                    "repo_url": "Unknown (Only hash stored on blockchain)",
                    "timestamp": datetime.fromtimestamp(blockchain_data.get("timestamp", 0)).isoformat(),
                    "status": "completed",
                    "result": {
                        "risk_score": blockchain_data.get("risk_score", 0)
                    },
                    "blockchain_tx": True,
                    "explorer_url": f"{blockchain_data.get('explorer_base', '')}/address/{blockchain_data.get('auditor', '')}"
                }
            
            raise HTTPException(status_code=404, detail=f"Analysis with ID {analysis_id} not found")
        
        # Dosyadan analiz sonucunu oku
        with open(analysis_file, 'r') as f:
            analysis_data = json.load(f)
            
        return analysis_data
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        logging.error(f"Analiz getirme hatası: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analyses", response_model=List[AnalysisResponse])
async def list_analyses():
    """Tüm analizleri listeler"""
    try:
        analyses = []
        for filename in os.listdir(RESULTS_DIR):
            if filename.endswith('.json'):
                with open(os.path.join(RESULTS_DIR, filename), 'r') as f:
                    analysis = json.load(f)
                    analyses.append(analysis)
        
        # Tarihe göre sırala, en yeni en üstte
        analyses.sort(key=lambda x: x["timestamp"], reverse=True)
        return analyses
    except Exception as e:
        logging.error(f"Analizleri listeleme hatası: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/contract-info")
async def get_contract_info():
    """Get contract information for the UI"""
    return {
        "contracts": {
            "sceptic_simple": {
                "address": os.getenv("VITE_CONTRACT_ADDRESS"),
                "name": "ScepticSimple",
                "description": "Simple contract for testing"
            },
            "sceptic_token": {
                "address": os.getenv("TOKEN_CONTRACT_ADDRESS"),
                "name": "ScepticToken",
                "description": "SCEP governance token"
            },
            "sceptic_audit": {
                "address": os.getenv("AUDIT_CONTRACT_ADDRESS"),
                "name": "ScepticAudit",
                "description": "Main contract for storing audit results"
            }
        },
        "network": {
            "name": "Sonic Network",
            "chainId": "57054" if os.getenv("NETWORK_TYPE", "testnet") == "testnet" else "146",
            "rpcUrl": os.getenv("SONIC_TESTNET_RPC", "https://rpc.blaze.soniclabs.com") 
                      if os.getenv("NETWORK_TYPE", "testnet") == "testnet" 
                      else os.getenv("SONIC_MAINNET_RPC", "https://mainnet.sonic.fantom.network/")
        }
    }

@app.post("/datasets/publish")
async def publish_dataset(
    name: str = Form(...),
    description: str = Form(...),
    category: str = Form(...),
    file: UploadFile = File(...),
    is_public: bool = Form(False)
):
    """Yeni veri seti yükleme endpoint'i"""
    try:
        # Benzersiz bir ID oluştur
        dataset_id = f"dataset_{uuid.uuid4().hex}"
        
        # Dosyayı kaydet
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, f"{dataset_id}_{file.filename}")
        
        # Asenkron dosya yazma
        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
        
        # Metadata oluştur
        metadata = {
            "id": dataset_id,
            "name": name,
            "description": description,
            "category": category,
            "filename": file.filename,
            "size": len(content),
            "is_public": is_public,
            "uploaded_at": datetime.now().isoformat(),
            "file_path": file_path
        }
        
        # Veritabanına kaydet (Gerçek projede MongoDB veya SQL veritabanı kullanılabilir)
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "db")
        os.makedirs(db_path, exist_ok=True)
        
        datasets_file = os.path.join(db_path, "datasets.json")
        
        datasets = []
        if os.path.exists(datasets_file):
            try:
                with open(datasets_file, 'r') as f:
                    datasets = json.load(f)
            except json.JSONDecodeError:
                datasets = []
        
        datasets.append(metadata)
        
        with open(datasets_file, 'w') as f:
            json.dump(datasets, f, indent=2)
        
        return {
            "success": True,
            "datasetId": dataset_id,
            "name": name,
            "description": description,
            "fileSize": len(content),
            "uploadDate": metadata["uploaded_at"]
        }
    except Exception as e:
        logging.error(f"Veri seti yükleme hatası: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

async def process_github_analysis(analysis_id: str, request: GithubAnalysisRequest):
    """GitHub analizini arka planda işleme"""
    blockchain_tx = None
    explorer_url = None
    
    try:
        # Başlangıç durumunu kaydet
        analysis_data = {
            "id": analysis_id,
            "repo_url": request.repo_url,
            "timestamp": datetime.now().isoformat(),
            "status": "processing",
            "result": None,
            "blockchain_tx": None,
            "explorer_url": None
        }
        
        analysis_file = os.path.join(RESULTS_DIR, f"{analysis_id}.json")
        with open(analysis_file, 'w') as f:
            json.dump(analysis_data, f)
        
        # GitHub'dan kodu çek
        repo_info = parse_github_url(request.repo_url)
        if request.branch:
            repo_info['branch'] = request.branch
        if request.file_path:
            repo_info['file_path'] = request.file_path
            
        logging.info(f"Fetching code from GitHub: {repo_info}")
        code = fetch_github_code(repo_info)
        
        if not code:
            # Hata durumu
            analysis_data["status"] = "failed"
            analysis_data["result"] = {"error": "Failed to fetch code from GitHub repository"}
            
            with open(analysis_file, 'w') as f:
                json.dump(analysis_data, f)
            return
        
        logging.info(f"Analyzing code for {analysis_id}")
        # Kodu analiz et
        result = predict_code(code, model, tokenizer, scaler)
        
        # Sonuçları güncelle
        analysis_data["status"] = "completed"
        analysis_data["result"] = result
        
        # Eğer risk skoru yüksekse (70+) veya AI içeriği tespit edildiyse blockchain'e kaydet
        if (result.get("risk_score", 0) >= 70 or 
            (result.get("prediction") == "AI" and result.get("confidence", 0) >= 0.8)):
            
            logging.info(f"High risk or AI content detected, storing on blockchain: {analysis_id}")
            # Blockchain'e kaydet
            blockchain_result = store_analysis_on_chain(analysis_data)
            
            if blockchain_result and blockchain_result.get("success"):
                blockchain_tx = blockchain_result.get("transaction_hash")
                explorer_url = blockchain_result.get("explorer_url")
                
                analysis_data["blockchain_tx"] = blockchain_tx
                analysis_data["explorer_url"] = explorer_url
                
                logging.info(f"Analysis stored on blockchain: {blockchain_tx}")
            else:
                error = blockchain_result.get("error") if blockchain_result else "Unknown error"
                logging.error(f"Failed to store analysis on blockchain: {error}")
        
        # Sonuçları kaydet
        with open(analysis_file, 'w') as f:
            json.dump(analysis_data, f)
            
        logging.info(f"Analysis completed for {analysis_id}")
        
    except Exception as e:
        logging.error(f"GitHub analiz işleme hatası: {str(e)}")
        
        # Hata durumunu kaydet
        try:
            analysis_data = {
                "id": analysis_id,
                "repo_url": request.repo_url,
                "timestamp": datetime.now().isoformat(),
                "status": "failed",
                "result": {"error": str(e)},
                "blockchain_tx": blockchain_tx,
                "explorer_url": explorer_url
            }
            
            with open(analysis_file, 'w') as f:
                json.dump(analysis_data, f)
        except Exception as save_error:
            logging.error(f"Hata durumu kaydedilemedi: {str(save_error)}")

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True) 