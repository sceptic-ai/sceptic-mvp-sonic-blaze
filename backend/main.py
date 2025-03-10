from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging

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

class AnalysisResponse(BaseModel):
    request_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# Routes
@app.get("/")
async def root():
    return {"message": "Welcome to Sceptic AI API"}

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_code(request: CodeAnalysisRequest):
    try:
        # Placeholder for actual analysis
        return {
            "request_id": "test-123",
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 