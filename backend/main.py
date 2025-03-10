from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import Optional, Dict, Any, List
import logging
import uuid
import json
from datetime import datetime
import aiohttp
import asyncio
import re
from urllib.parse import urlparse

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

# Analysis cache
analysis_cache = {}

async def fetch_github_content(url: str) -> Dict[str, Any]:
    """Fetch repository content from GitHub"""
    # Convert URL to API URL
    parsed = urlparse(str(url))
    path_parts = parsed.path.strip('/').split('/')
    if len(path_parts) < 2:
        raise ValueError("Invalid GitHub URL")
    
    owner, repo = path_parts[:2]
    api_url = f"https://api.github.com/repos/{owner}/{repo}"
    
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Sceptic-AI"
    }
    
    async with aiohttp.ClientSession() as session:
        # Fetch repo info
        async with session.get(api_url, headers=headers) as response:
            if response.status != 200:
                raise HTTPException(status_code=response.status, detail="Failed to fetch repository")
            repo_info = await response.json()
        
        # Fetch files
        async with session.get(f"{api_url}/contents", headers=headers) as response:
            if response.status != 200:
                raise HTTPException(status_code=response.status, detail="Failed to fetch repository contents")
            contents = await response.json()
    
    return {
        "repo_info": repo_info,
        "contents": contents
    }

def analyze_code_content(content: str) -> Dict[str, Any]:
    """Analyze code content for AI patterns"""
    # Simple analysis metrics
    lines = content.split('\n')
    total_lines = len(lines)
    empty_lines = len([l for l in lines if not l.strip()])
    comment_lines = len([l for l in lines if l.strip().startswith(('#', '//', '/*', '*', '"""', "'"""))])
    
    # Code complexity metrics
    complexity_score = 0
    nested_levels = 0
    max_line_length = 0
    function_count = 0
    
    for line in lines:
        # Count indentation levels
        indent = len(line) - len(line.lstrip())
        nested_levels = max(nested_levels, indent // 4)
        
        # Track max line length
        max_line_length = max(max_line_length, len(line))
        
        # Count function definitions
        if re.search(r'(def|function|class|\) {|\) =>) ', line):
            function_count += 1
        
        # Add to complexity score
        if re.search(r'(if|for|while|switch|catch|try|else|elif) ', line):
            complexity_score += 1
    
    # Calculate metrics
    comment_ratio = comment_lines / total_lines if total_lines > 0 else 0
    code_density = (total_lines - empty_lines) / total_lines if total_lines > 0 else 0
    avg_line_length = sum(len(l) for l in lines) / total_lines if total_lines > 0 else 0
    
    # AI detection heuristics
    ai_indicators = {
        "consistent_style": comment_ratio > 0.1 and comment_ratio < 0.4,
        "reasonable_length": 20 < avg_line_length < 100,
        "moderate_complexity": 0.05 < complexity_score / total_lines < 0.2 if total_lines > 0 else False,
        "natural_nesting": nested_levels < 5,
    }
    
    ai_confidence = sum(1 for v in ai_indicators.values() if v) / len(ai_indicators)
    is_ai_generated = ai_confidence > 0.7
    
    return {
        "metrics": {
            "total_lines": total_lines,
            "comment_ratio": comment_ratio,
            "code_density": code_density,
            "complexity_score": complexity_score,
            "max_line_length": max_line_length,
            "avg_line_length": avg_line_length,
            "function_count": function_count,
            "nested_levels": nested_levels
        },
        "ai_analysis": {
            "is_ai_generated": is_ai_generated,
            "confidence": ai_confidence,
            "indicators": ai_indicators
        },
        "risk_assessment": {
            "risk_score": min(100, int(
                (complexity_score * 10 +
                nested_levels * 15 +
                (max_line_length > 120) * 20 +
                (comment_ratio < 0.1) * 25) / 2
            )),
            "warnings": [
                "High complexity" if complexity_score > 10 else None,
                "Deep nesting" if nested_levels > 4 else None,
                "Long lines" if max_line_length > 120 else None,
                "Low comment ratio" if comment_ratio < 0.1 else None
            ]
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
        analysis = analyze_code_content(request.code)
        
        return {
            "request_id": request_id,
            "status": "completed",
            "result": {
                "prediction": "ai" if analysis["ai_analysis"]["is_ai_generated"] else "human",
                "confidence": analysis["ai_analysis"]["confidence"],
                "risk_score": analysis["risk_assessment"]["risk_score"],
                "metrics": analysis["metrics"],
                "ai_indicators": analysis["ai_analysis"]["indicators"],
                "warnings": [w for w in analysis["risk_assessment"]["warnings"] if w]
            }
        }
    except Exception as e:
        logger.error(f"Error analyzing code: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/github", response_model=AnalysisResponse)
async def analyze_github_repo(request: GitHubAnalysisRequest):
    try:
        request_id = generate_request_id()
        
        # Start analysis process
        analysis_cache[request_id] = {
            "status": "processing",
            "progress": 0,
            "files_analyzed": 0
        }
        
        # Fetch repository content
        repo_data = await fetch_github_content(str(request.url))
        
        # Analyze repository structure
        files_to_analyze = [
            f for f in repo_data["contents"]
            if f["type"] == "file" and f["name"].endswith(('.py', '.js', '.ts', '.sol', '.java', '.cpp', '.go'))
        ][:request.max_files]
        
        total_files = len(files_to_analyze)
        if total_files == 0:
            raise HTTPException(status_code=400, detail="No suitable files found for analysis")
        
        # Analyze each file
        analyses = []
        files_analyzed = 0
        
        async with aiohttp.ClientSession() as session:
            for file_info in files_to_analyze:
                try:
                    async with session.get(file_info["download_url"]) as response:
                        if response.status == 200:
                            content = await response.text()
                            analysis = analyze_code_content(content)
                            analyses.append({
                                "file": file_info["name"],
                                "analysis": analysis
                            })
                            files_analyzed += 1
                            
                            # Update progress
                            analysis_cache[request_id]["progress"] = (files_analyzed / total_files) * 100
                            analysis_cache[request_id]["files_analyzed"] = files_analyzed
                except Exception as e:
                    logger.error(f"Error analyzing file {file_info['name']}: {str(e)}")
                    continue
        
        # Calculate aggregate metrics
        total_risk_score = sum(a["analysis"]["risk_assessment"]["risk_score"] for a in analyses) / len(analyses)
        ai_confidence = sum(a["analysis"]["ai_analysis"]["confidence"] for a in analyses) / len(analyses)
        is_ai_generated = ai_confidence > 0.7
        
        # Collect all warnings
        all_warnings = []
        for a in analyses:
            all_warnings.extend([w for w in a["analysis"]["risk_assessment"]["warnings"] if w])
        
        # Update cache with final results
        analysis_cache[request_id] = {
            "status": "completed",
            "result": {
                "prediction": "ai" if is_ai_generated else "human",
                "confidence": ai_confidence,
                "risk_score": total_risk_score,
                "repository": str(request.url),
                "files_analyzed": files_analyzed,
                "security_analysis": {
                    "vulnerabilities": [
                        {
                            "type": "code_quality",
                            "name": warning,
                            "risk": "high" if "High" in warning else "medium",
                            "description": warning,
                            "score": 8 if "High" in warning else 5
                        }
                        for warning in set(all_warnings)
                    ],
                    "risk_level": "high" if total_risk_score > 70 else "medium" if total_risk_score > 40 else "low",
                    "high_risk": total_risk_score > 70,
                    "medium_risk": 40 < total_risk_score <= 70,
                    "low_risk": total_risk_score <= 40,
                    "code_quality": {
                        "complexity": sum(a["analysis"]["metrics"]["complexity_score"] for a in analyses) / len(analyses),
                        "maintainability": 10 - (total_risk_score / 10)
                    }
                },
                "file_details": [
                    {
                        "name": a["file"],
                        "metrics": a["analysis"]["metrics"],
                        "ai_confidence": a["analysis"]["ai_analysis"]["confidence"],
                        "risk_score": a["analysis"]["risk_assessment"]["risk_score"]
                    }
                    for a in analyses
                ]
            }
        }
        
        return {
            "request_id": request_id,
            "status": "completed",
            "result": analysis_cache[request_id]["result"]
        }
        
    except Exception as e:
        logger.error(f"Error analyzing GitHub repository: {str(e)}")
        if request_id in analysis_cache:
            analysis_cache[request_id]["status"] = "error"
            analysis_cache[request_id]["error"] = str(e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/analysis/{request_id}", response_model=AnalysisResponse)
async def get_analysis_result(request_id: str):
    try:
        if request_id not in analysis_cache:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        analysis = analysis_cache[request_id]
        return {
            "request_id": request_id,
            "status": analysis["status"],
            "result": analysis.get("result"),
            "error": analysis.get("error")
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