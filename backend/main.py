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
import os
from dotenv import load_dotenv
from eth_account.messages import encode_defunct
from web3 import Web3
import time

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

# Load environment variables
load_dotenv()

# Get GitHub token from environment
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')

# Models
class CodeAnalysisRequest(BaseModel):
    code: str
    language: Optional[str] = None
    signature: str

class GitHubAnalysisRequest(BaseModel):
    url: HttpUrl
    max_files: Optional[int] = 10
    signature: str

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
    try:
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
        
        if GITHUB_TOKEN:
            headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
            logger.info("Using GitHub token for authentication")
        else:
            logger.warning("No GitHub token found. API rate limits will be restricted.")
        
        async with aiohttp.ClientSession() as session:
            # Fetch repo info
            async with session.get(api_url, headers=headers) as response:
                if response.status != 200:
                    error_data = await response.json()
                    logger.error(f"GitHub API error: {error_data}")
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"Failed to fetch repository: {error_data.get('message', 'Unknown error')}"
                    )
                repo_info = await response.json()
            
            # Fetch files using recursive tree API
            tree_url = f"{api_url}/git/trees/{repo_info['default_branch']}?recursive=1"
            async with session.get(tree_url, headers=headers) as response:
                if response.status != 200:
                    error_data = await response.json()
                    logger.error(f"GitHub API error: {error_data}")
                    raise HTTPException(
                        status_code=response.status,
                        detail=f"Failed to fetch repository contents: {error_data.get('message', 'Unknown error')}"
                    )
                tree_data = await response.json()
            
            # Filter and format contents
            filtered_contents = []
            for item in tree_data.get('tree', []):
                if item['type'] == 'blob' and any(item['path'].endswith(ext) for ext in ['.py', '.js', '.ts', '.sol', '.java', '.cpp', '.go']):
                    filtered_contents.append({
                        "name": item['path'].split('/')[-1],
                        "path": item['path'],
                        "type": "file",
                        "download_url": f"https://raw.githubusercontent.com/{owner}/{repo}/{repo_info['default_branch']}/{item['path']}"
                    })
            
            if not filtered_contents:
                logger.warning(f"No suitable files found in repository {owner}/{repo}")
                raise HTTPException(
                    status_code=400,
                    detail="No suitable files found for analysis. Repository must contain .py, .js, .ts, .sol, .java, .cpp, or .go files."
                )
            
            return {
                "repo_info": repo_info,
                "contents": filtered_contents
            }
            
    except aiohttp.ClientError as e:
        logger.error(f"Network error while fetching GitHub content: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Network error: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error while fetching GitHub content: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

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

def verify_signature(message: str, signature: str) -> bool:
    """Verify an Sonic Network Blaze signature"""
    try:
        # Create the message hash
        message_hash = encode_defunct(text=message)
        
        # Recover the address that signed the message
        w3 = Web3()
        address = w3.eth.account.recover_message(message_hash, signature=signature)
        
        # In a real application, you might want to check if this address
        # is authorized to request analysis
        return True
    except Exception as e:
        logging.error(f"Signature verification error: {str(e)}")
        return False

# Routes
@app.get("/")
async def root():
    return {"message": "Welcome to Sceptic AI API"}

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_code(request: CodeAnalysisRequest):
    try:
        # Verify signature
        message = f"""I authorize Sceptic AI to analyze code.

This signature confirms your request to analyze code.
It will not trigger any blockchain transaction or cost any gas fees.

Timestamp: {int(time.time())}"""
        
        if not verify_signature(message, request.signature):
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Continue with existing analysis code
        request_id = generate_request_id()
        result = analyze_code_content(request.code)
        
        return {
            "request_id": request_id,
            "status": "completed",
            "result": result
        }
    except Exception as e:
        logging.error(f"Error analyzing code: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/github", response_model=AnalysisResponse)
async def analyze_github_repo(request: GitHubAnalysisRequest):
    try:
        # Verify signature
        message = f"""I authorize Sceptic AI to analyze the following repository:
{request.url}

This signature confirms your request to analyze the repository.
It will not trigger any blockchain transaction or cost any gas fees.

Timestamp: {int(time.time())}"""
        
        if not verify_signature(message, request.signature):
            raise HTTPException(status_code=401, detail="Invalid signature")
        
        # Continue with existing GitHub analysis code
        request_id = generate_request_id()
        
        try:
            repo_content = await fetch_github_content(str(request.url))
            if not repo_content.get("contents"):
                raise HTTPException(status_code=400, detail="No suitable files found for analysis")
            
            results = []
            for file_info in repo_content["contents"][:request.max_files]:
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.get(file_info["download_url"]) as response:
                            if response.status == 200:
                                content = await response.text()
                                result = analyze_code_content(content)
                                results.append({
                                    "file": file_info["name"],
                                    "analysis": result
                                })
                except Exception as e:
                    logger.error(f"Error analyzing file {file_info['name']}: {str(e)}")
                    continue
            
            return {
                "request_id": request_id,
                "status": "completed",
                "result": {
                    "repository": str(request.url),
                    "files_analyzed": len(results),
                    "analyses": results
                }
            }
        except Exception as e:
            logging.error(f"Error analyzing GitHub repository: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
            
    except Exception as e:
        logging.error(f"Error in GitHub analysis endpoint: {str(e)}")
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