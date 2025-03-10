from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import Optional, Dict, Any, List
import logging
import uuid
import json
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="Sceptic AI API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class CodeAnalysisRequest(BaseModel):
    code: str
    language: Optional[str] = None

class GitHubAnalysisRequest(BaseModel):
    url: HttpUrl
    max_files: Optional[int] = 10

class AnalysisResponse(BaseModel):
    request_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class ContractInfo(BaseModel):
    contracts: Dict[str, Dict[str, str]]
    network: Dict[str, str]

class ContractUpdateRequest(BaseModel):
    address: str
    contract_type: str
    network: str
    transaction_hash: Optional[str] = None
    deployer: Optional[str] = None
    verified: Optional[bool] = False

def generate_request_id() -> str:
    return str(uuid.uuid4())

# Mock contract info
MOCK_CONTRACT_INFO = {
    "contracts": {
        "sceptic_simple": {
            "address": "0xF9978A310aD03151E4B09d8D03b30F863eaD38eC",
            "name": "ScepticSimple",
            "description": "Simple contract for testing"
        },
        "sceptic_token": {
            "address": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            "name": "ScepticToken",
            "description": "Governance token"
        },
        "sceptic_audit": {
            "address": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "name": "ScepticAudit",
            "description": "Audit contract"
        }
    },
    "network": {
        "name": "Sonic Network",
        "chainId": "57054",
        "rpcUrl": "https://rpc.blaze.soniclabs.com"
    }
}

# Routes
@app.get("/")
async def root():
    return {"message": "Welcome to Sceptic AI API"}

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_code(request: CodeAnalysisRequest):
    try:
        request_id = generate_request_id()
        return {
            "request_id": request_id,
            "status": "completed",
            "result": {
                "prediction": "human",
                "confidence": 0.95,
                "risk_score": 25
            }
        }
    except Exception as e:
        logger.error(f"Error analyzing code: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/github", response_model=AnalysisResponse)
async def analyze_github_repo(request: GitHubAnalysisRequest):
    try:
        request_id = generate_request_id()
        # Placeholder for actual GitHub analysis
        return {
            "request_id": request_id,
            "status": "completed",
            "result": {
                "prediction": "human",
                "confidence": 0.92,
                "risk_score": 30,
                "repository": str(request.url),
                "files_analyzed": request.max_files,
                "security_analysis": {
                    "vulnerabilities": [
                        {
                            "type": "code_quality",
                            "name": "Complex Function",
                            "risk": "medium",
                            "description": "Function exceeds recommended complexity threshold",
                            "score": 6.5
                        }
                    ],
                    "risk_level": "medium",
                    "high_risk": False,
                    "medium_risk": True,
                    "low_risk": False,
                    "code_quality": {
                        "complexity": 6.5,
                        "maintainability": 7.2
                    }
                }
            }
        }
    except Exception as e:
        logger.error(f"Error analyzing GitHub repository: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analysis/{request_id}", response_model=AnalysisResponse)
async def get_analysis_result(request_id: str):
    try:
        # Placeholder for actual result retrieval
        return {
            "request_id": request_id,
            "status": "completed",
            "result": {
                "prediction": "human",
                "confidence": 0.95,
                "risk_score": 25
            }
        }
    except Exception as e:
        logger.error(f"Error getting analysis result: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/contract/info", response_model=ContractInfo)
async def get_contract_info():
    return MOCK_CONTRACT_INFO

@app.post("/contract/update")
async def update_contract(request: ContractUpdateRequest):
    try:
        # Placeholder for actual contract update logic
        return {
            "status": "success",
            "message": "Contract information updated successfully"
        }
    except Exception as e:
        logger.error(f"Error updating contract: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/contract/updates")
async def get_contract_updates(limit: int = 10):
    try:
        # Placeholder for actual contract updates
        return [
            {
                "address": "0xF9978A310aD03151E4B09d8D03b30F863eaD38eC",
                "contract_type": "simple",
                "network": "Sonic Network",
                "timestamp": datetime.now().isoformat(),
                "transaction_hash": "0x611de8acc2be04b7f83057335432c9c7d09391722830c246d72c9bfd92109a46",
                "verified": True
            }
        ][:limit]
    except Exception as e:
        logger.error(f"Error getting contract updates: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 