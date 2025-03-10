import json
import os
import logging
import uuid
import aiofiles
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, HttpUrl
from datetime import datetime
import asyncio
from dotenv import load_dotenv
import time
import functools

from backend.ml.model import predict_code, parse_github_url, fetch_github_code, load_model, analyze_github_repo
from backend.utils.setup import setup_directories

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
    from ..ml.model import predict_code, parse_github_url, fetch_github_code, load_model
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
        logging.FileHandler(os.path.join(os.path.dirname(__file__), '../logs/api.log'))
    ]
)
logger = logging.getLogger(__name__)

# Simple in-memory cache for recent analysis results
analysis_cache = {}
MAX_CACHE_SIZE = 100

app = FastAPI(
    title="Sceptic AI API",
    description="API for code analysis and vulnerability detection",
    version="0.1.0"
)

# CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Üretimde bunu sınırlandırın
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelleri tanımlama
class CodeAnalysisRequest(BaseModel):
    code: str = Field(..., description="Source code to analyze")
    language: Optional[str] = Field(None, description="Programming language of the code")

class GitHubAnalysisRequest(BaseModel):
    url: HttpUrl = Field(..., description="GitHub repository URL to analyze")
    max_files: Optional[int] = Field(10, description="Maximum number of files to analyze")

class AnalysisResponse(BaseModel):
    request_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    cached: bool = False
    processing_time_ms: int = 0

class ContractUpdateRequest(BaseModel):
    address: str = Field(..., description="Contract address")
    contract_type: str = Field(..., description="Type of contract (audit, token, etc.)")
    network: str = Field(..., description="Network the contract is deployed on")
    timestamp: datetime = Field(default_factory=datetime.now, description="Timestamp of update")
    transaction_hash: Optional[str] = Field(None, description="Transaction hash of deployment")
    deployer: Optional[str] = Field(None, description="Address of contract deployer")
    verified: Optional[bool] = Field(False, description="Whether the contract is verified")

# Global değişkenler
model = None
tokenizer = None
scaler = None

# Analiz sonuçları için depolama dizini
RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'analysis_results')
os.makedirs(RESULTS_DIR, exist_ok=True)

# Storage for analysis results
analysis_results = {}

# Directory to store contract updates
CONTRACT_UPDATES_DIR = os.path.join(os.path.dirname(__file__), "../data/contract_updates")

@app.on_event("startup")
async def startup_event():
    """
    Initialize necessary components during startup
    """
    logging.info("Starting Sceptic AI API")
    
    # Ensure directories are properly set up
    try:
        from backend.api.setup import setup_backend_directories
        setup_backend_directories()
        logging.info("Backend directories initialized")
    except Exception as e:
        logging.error(f"Error setting up directories: {str(e)}")
    
    # Initialize background processing queue
    global analysis_results
    analysis_results = {}
    
    # Check if ML model files exist, try to load model
    try:
        # Pre-load model for faster inference
        model, tokenizer, scaler = load_model()
        if model is not None:
            logging.info("ML model loaded successfully")
        else:
            logging.warning("ML model could not be loaded. Code analysis will use fallback method.")
    except Exception as e:
        logging.error(f"Error loading ML model: {str(e)}")
    
    # Verify blockchain connection if applicable
    try:
        blockchain_status = check_connection()
        if blockchain_status:
            logging.info("Blockchain connection established")
        else:
            logging.warning("Blockchain connection could not be established. Some features will be limited.")
    except Exception as e:
        logging.error(f"Error checking blockchain connection: {str(e)}")
    
    logging.info("Sceptic AI API ready")

@app.get("/")
async def root():
    return {"message": "Welcome to Sceptic AI API", "status": "active"}

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_code(request: CodeAnalysisRequest, background_tasks: BackgroundTasks):
    request_id = generate_request_id()
    
    # Check if code is too short
    if len(request.code) < 10:
        return AnalysisResponse(
            request_id=request_id,
            status="error",
            error="Code sample too short for analysis"
        )
    
    # Check if code is too long
    if len(request.code) > 50000:
        return AnalysisResponse(
            request_id=request_id,
            status="error",
            error="Code sample too large (max 50,000 characters)"
        )
        
    # Log request details
    logger.info(f"Code analysis request received: {request_id} (length: {len(request.code)} chars)")
    
    # Create initial response entry
    analysis_results[request_id] = {"status": "processing"}
    
    # Start background task for longer analysis
    if len(request.code) > 5000:
        background_tasks.add_task(analyze_code_task, request_id, request.code, request.language)
        return AnalysisResponse(
            request_id=request_id,
            status="processing"
        )
    
    # For smaller code samples, analyze directly
    try:
        start_time = time.time()
        result = predict_code(request.code)
        processing_time = int((time.time() - start_time) * 1000)
        
        logger.info(f"Analysis completed for {request_id} in {processing_time}ms")
        
        return AnalysisResponse(
            request_id=request_id,
            status="completed",
            result=result,
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        logger.error(f"Error analyzing code: {str(e)}")
        return AnalysisResponse(
            request_id=request_id,
            status="error",
            error=str(e)
        )

@app.post("/analyze/github", response_model=AnalysisResponse)
@cache_result(ttl_seconds=3600)  # Cache GitHub analyses for 1 hour
async def analyze_github(request: GitHubAnalysisRequest, background_tasks: BackgroundTasks):
    request_id = generate_request_id()
    
    # Log request details
    logger.info(f"GitHub analysis request received: {request_id} for URL: {request.url}")
    
    # Start background task for GitHub analysis
    background_tasks.add_task(analyze_github_task, request_id, str(request.url), request.max_files)
    
    # Create initial response
    analysis_results[request_id] = {"status": "processing"}
    
    return AnalysisResponse(
        request_id=request_id,
        status="processing"
    )

@app.get("/analysis/{request_id}", response_model=AnalysisResponse)
async def get_analysis_result(request_id: str):
    if request_id not in analysis_results:
        raise HTTPException(status_code=404, detail="Analysis not found")
    
    result = analysis_results[request_id]
    
    return AnalysisResponse(
        request_id=request_id,
        status=result["status"],
        result=result.get("result"),
        error=result.get("error"),
        processing_time_ms=result.get("processing_time_ms", 0)
    )

@app.post("/contract/update")
async def update_contract_info(request: ContractUpdateRequest):
    """Update contract information in the system"""
    try:
        # Create the directory if it doesn't exist
        os.makedirs(CONTRACT_UPDATES_DIR, exist_ok=True)
        
        # Generate a unique filename based on timestamp and contract
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"{timestamp}_{request.contract_type}_{request.network}.json"
        
        # Prepare the data to save
        data = request.dict()
        
        # Save to file
        file_path = os.path.join(CONTRACT_UPDATES_DIR, filename)
        with open(file_path, 'w') as f:
            json.dump(data, f, default=str)
            
        # Log the update
        logger.info(f"Contract info updated: {request.address} on {request.network}")
        
        return {"status": "success", "message": "Contract information updated"}
        
    except Exception as e:
        logger.error(f"Error updating contract info: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update contract info: {str(e)}")

@app.get("/contract/updates", response_model=List[Dict[str, Any]])
async def get_contract_updates(limit: int = 10):
    """Get recent contract updates"""
    try:
        updates = []
        
        # Check if directory exists
        if not os.path.exists(CONTRACT_UPDATES_DIR):
            return updates
            
        # List all JSON files in the directory
        files = [f for f in os.listdir(CONTRACT_UPDATES_DIR) if f.endswith('.json')]
        
        # Sort files by name (which includes timestamp)
        files.sort(reverse=True)
        
        # Load the most recent files
        for filename in files[:limit]:
            file_path = os.path.join(CONTRACT_UPDATES_DIR, filename)
            with open(file_path, 'r') as f:
                update = json.load(f)
                updates.append(update)
                
        return updates
        
    except Exception as e:
        logger.error(f"Error getting contract updates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get contract updates: {str(e)}")

# Simple request ID generator
def generate_request_id():
    return f"req_{int(time.time() * 1000)}"

# Cache decorator for expensive operations
def cache_result(ttl_seconds=3600):
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Create a cache key from function name and arguments
            key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            
            # Check if result is in cache and not expired
            if key in analysis_cache:
                entry = analysis_cache[key]
                if time.time() - entry["timestamp"] < ttl_seconds:
                    entry["result"]["cached"] = True
                    return entry["result"]
            
            # Call the original function
            result = await func(*args, **kwargs)
            
            # Store in cache
            analysis_cache[key] = {
                "timestamp": time.time(),
                "result": result
            }
            
            # Limit cache size
            if len(analysis_cache) > MAX_CACHE_SIZE:
                # Remove oldest entry
                oldest_key = min(analysis_cache.keys(), key=lambda k: analysis_cache[k]["timestamp"])
                del analysis_cache[oldest_key]
                
            return result
        return wrapper
    return decorator

# Background task for code analysis
async def analyze_code_task(request_id: str, code: str, language: Optional[str] = None):
    try:
        start_time = time.time()
        
        # Perform code analysis
        result = predict_code(code)
        
        # Store results
        analysis_results[request_id] = {
            "status": "completed",
            "result": result,
            "processing_time_ms": int((time.time() - start_time) * 1000)
        }
        
    except Exception as e:
        logger.error(f"Error analyzing code: {str(e)}")
        analysis_results[request_id] = {
            "status": "error",
            "error": str(e)
        }

# Background task for GitHub repository analysis
async def analyze_github_task(request_id: str, url: str, max_files: int = 10):
    try:
        start_time = time.time()
        
        # Perform GitHub repository analysis
        result = await analyze_github_repo(url)
        
        # Store results
        analysis_results[request_id] = {
            "status": "completed",
            "result": result,
            "processing_time_ms": int((time.time() - start_time) * 1000)
        }
        
    except Exception as e:
        logger.error(f"Error analyzing GitHub repository: {str(e)}")
        analysis_results[request_id] = {
            "status": "error",
            "error": str(e)
        }

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True) 