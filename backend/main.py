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
        "name": "Sonic Blaze Testnet",
        "chainId": "57054",
        "rpcUrl": "https://rpc.blaze.soniclabs.com",
        "explorerUrl": "https://testnet.sonicscan.org",
        "symbol": "S",
        "faucetUrl": "https://testnet.soniclabs.com/account"
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
    """
    Analyze code content and return detailed metrics
    """
    try:
        if not content or not content.strip():
            raise ValueError("Empty code content")

        # Split into lines for analysis
        lines = content.strip().split('\n')
        total_lines = len(lines)
        
        # Basic metrics
        code_lines = len([l for l in lines if l.strip() and not l.strip().startswith(('#', '//', '/*', '*', '"""', "'''"))])
        comment_lines = len([l for l in lines if l.strip().startswith(('#', '//', '/*', '*', '"""', "'''"))])
        empty_lines = len([l for l in lines if not l.strip()])
        
        # Function and class analysis
        function_pattern = r'(def\s+[a-zA-Z_][a-zA-Z0-9_]*\s*\()'
        class_pattern = r'(class\s+[a-zA-Z_][a-zA-Z0-9_]*\s*[:\(])'
        functions = re.findall(function_pattern, content)
        classes = re.findall(class_pattern, content)
        
        # Complexity metrics
        complexity_indicators = [
            'if', 'else', 'elif', 'for', 'while', 'try', 'except',
            'with', 'break', 'continue', 'return', 'yield', 'match', 'case'
        ]
        complexity_score = sum(1 for word in complexity_indicators if re.search(rf'\b{word}\b', content))
        
        # Line length analysis
        line_lengths = [len(l) for l in lines if l.strip()]
        avg_line_length = sum(line_lengths) / len(line_lengths) if line_lengths else 0
        max_line_length = max(line_lengths) if line_lengths else 0
        
        # Variable naming consistency
        var_pattern = r'\b([a-zA-Z_][a-zA-Z0-9_]*)\s*='
        variables = re.findall(var_pattern, content)
        snake_case = sum(1 for v in variables if re.match(r'^[a-z][a-z0-9_]*$', v))
        camel_case = sum(1 for v in variables if re.match(r'^[a-z][a-zA-Z0-9]*$', v))
        naming_consistency = max(snake_case, camel_case) / len(variables) if variables else 1
        
        # AI detection indicators
        ai_indicators = {
            'consistent_formatting': 0.8 if all(l.startswith((' ' * 4, '\t')) for l in lines if l.strip()) else 0.4,
            'comprehensive_comments': 0.9 if comment_lines / total_lines > 0.1 else 0.3,
            'structured_functions': 0.8 if len(functions) > 0 and all('"""' in f or "'''" in f for f in functions) else 0.4,
            'variable_naming': 0.9 if naming_consistency > 0.8 else 0.5,
            'complexity_balance': 0.7 if 0.05 < complexity_score / code_lines < 0.2 else 0.4
        }
        
        # Calculate confidence score
        confidence_score = sum(ai_indicators.values()) / len(ai_indicators)
        
        # Risk assessment
        risk_factors = {
            'high_complexity': complexity_score > 20,
            'long_lines': max_line_length > 100,
            'poor_commenting': comment_lines / total_lines < 0.05 if total_lines > 0 else True,
            'inconsistent_naming': naming_consistency < 0.7,
            'deep_nesting': bool(re.search(r'^\s{16,}', content, re.MULTILINE))
        }
        
        risk_score = sum(risk_factors.values()) * 20  # Scale to 0-100
        
        # Generate warnings
        warnings = []
        if risk_factors['high_complexity']:
            warnings.append("High code complexity detected - consider breaking down into smaller functions")
        if risk_factors['long_lines']:
            warnings.append("Long lines detected - consider breaking into multiple lines for readability")
        if risk_factors['poor_commenting']:
            warnings.append("Low comment ratio - consider adding more documentation")
        if risk_factors['inconsistent_naming']:
            warnings.append("Inconsistent variable naming detected - stick to one convention")
        if risk_factors['deep_nesting']:
            warnings.append("Deep nesting detected - consider restructuring the code")
        
        # Determine source prediction
        prediction = "AI" if confidence_score > 0.6 else "Human"
        source_confidence = confidence_score if prediction == "AI" else (1 - confidence_score)
        
        # Security vulnerabilities check
        vulnerabilities = []
        security_patterns = {
            'sql_injection': (r'execute\s*\(|cursor\.execute|raw_input|input\s*\(', 'Potential SQL injection vulnerability'),
            'command_injection': (r'os\.system|subprocess\.call|eval\(|exec\(', 'Potential command injection vulnerability'),
            'hardcoded_secrets': (r'password\s*=|secret\s*=|api_key\s*=', 'Hardcoded secrets detected'),
            'unsafe_deserialization': (r'pickle\.loads|yaml\.load', 'Unsafe deserialization detected'),
            'path_traversal': (r'\.\.\/|\.\.\\', 'Potential path traversal vulnerability')
        }
        
        for vuln_type, (pattern, message) in security_patterns.items():
            if re.search(pattern, content, re.IGNORECASE):
                vulnerabilities.append({
                    "type": vuln_type,
                    "name": message,
                    "risk": "high",
                    "description": f"Found pattern matching {message.lower()}",
                    "score": 8
                })
        
        return {
            "prediction": prediction,
            "confidence": round(source_confidence * 100, 2),
            "risk_score": min(100, round(risk_score)),
            "source": f"{prediction} ({round(source_confidence * 100)}% confidence)",
            "analysis_details": {
                "total_lines": total_lines,
                "code_lines": code_lines,
                "comment_lines": comment_lines,
                "empty_lines": empty_lines,
                "complexity_score": complexity_score,
                "avg_line_length": round(avg_line_length, 2),
                "max_line_length": max_line_length,
                "functions_count": len(functions),
                "classes_count": len(classes)
            },
            "security_analysis": {
                "vulnerabilities": vulnerabilities,
                "code_quality": {
                    "indentation_consistency": round(ai_indicators['consistent_formatting'] * 100),
                    "naming_consistency": round(naming_consistency * 100),
                    "comment_ratio": round((comment_lines / total_lines * 100) if total_lines > 0 else 0, 2)
                },
                "risk_level": "high" if risk_score > 70 else "medium" if risk_score > 40 else "low",
                "high_risk": risk_score > 70,
                "medium_risk": 40 < risk_score <= 70,
                "low_risk": risk_score <= 40,
                "warnings": warnings
            }
        }
    except Exception as e:
        logging.error(f"Error in analyze_code_content: {str(e)}")
        return {
            "prediction": "Error",
            "confidence": 0,
            "risk_score": 0,
            "source": "Analysis Error",
            "analysis_details": {
                "total_lines": 0,
                "code_lines": 0,
                "comment_lines": 0,
                "empty_lines": 0,
                "complexity_score": 0,
                "avg_line_length": 0,
                "max_line_length": 0,
                "functions_count": 0,
                "classes_count": 0
            },
            "security_analysis": {
                "vulnerabilities": [],
                "code_quality": {
                    "indentation_consistency": 0,
                    "naming_consistency": 0,
                    "comment_ratio": 0
                },
                "risk_level": "unknown",
                "high_risk": False,
                "medium_risk": False,
                "low_risk": False,
                "warnings": ["Analysis failed due to an error"]
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
        
        # Cache'e kaydet
        await store_analysis_result(request_id, result)
        
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
        
        request_id = generate_request_id()
        
        try:
            repo_content = await fetch_github_content(str(request.url))
            if not repo_content.get("contents"):
                raise HTTPException(status_code=400, detail="No suitable files found for analysis")
            
            # Repository level metrics
            total_files = len(repo_content["contents"])
            analyzed_files = min(total_files, request.max_files)
            total_lines = 0
            total_code_lines = 0
            total_comment_lines = 0
            total_empty_lines = 0
            total_functions = 0
            total_classes = 0
            total_complexity = 0
            languages_used = {}
            file_results = []
            overall_risk_score = 0
            all_vulnerabilities = []
            
            for file_info in repo_content["contents"][:request.max_files]:
                try:
                    async with aiohttp.ClientSession() as session:
                        async with session.get(file_info["download_url"]) as response:
                            if response.status == 200:
                                content = await response.text()
                                result = analyze_code_content(content)
                                
                                # Update repository metrics
                                details = result["analysis_details"]
                                total_lines += details["total_lines"]
                                total_code_lines += details["code_lines"]
                                total_comment_lines += details["comment_lines"]
                                total_empty_lines += details["empty_lines"]
                                total_functions += details["functions_count"]
                                total_classes += details["classes_count"]
                                total_complexity += details["complexity_score"]
                                
                                # Track language usage
                                ext = file_info["name"].split('.')[-1].lower()
                                lang_map = {
                                    'py': 'Python',
                                    'js': 'JavaScript',
                                    'ts': 'TypeScript',
                                    'sol': 'Solidity',
                                    'java': 'Java',
                                    'cpp': 'C++',
                                    'go': 'Go'
                                }
                                lang = lang_map.get(ext, 'Other')
                                languages_used[lang] = languages_used.get(lang, 0) + 1
                                
                                # Collect vulnerabilities
                                if result["security_analysis"]["vulnerabilities"]:
                                    all_vulnerabilities.extend(result["security_analysis"]["vulnerabilities"])
                                
                                # Update risk score
                                overall_risk_score += result["risk_score"]
                                
                                file_results.append({
                                    "file": file_info["path"],
                                    "language": lang,
                                    "analysis": result
                                })
                except Exception as e:
                    logger.error(f"Error analyzing file {file_info['name']}: {str(e)}")
                    continue
            
            # Calculate repository-wide metrics
            avg_risk_score = overall_risk_score / len(file_results) if file_results else 0
            
            # Group vulnerabilities by type and risk level
            vulnerability_summary = {
                "high": len([v for v in all_vulnerabilities if v["risk"] == "high"]),
                "medium": len([v for v in all_vulnerabilities if v["risk"] == "medium"]),
                "low": len([v for v in all_vulnerabilities if v["risk"] == "low"])
            }
            
            # Calculate code quality metrics
            code_quality = {
                "maintainability_index": min(100, (total_comment_lines / total_lines * 50 + 
                                                 (total_functions + total_classes) / total_lines * 50)) if total_lines > 0 else 0,
                "documentation_ratio": (total_comment_lines / total_lines * 100) if total_lines > 0 else 0,
                "code_complexity": total_complexity / len(file_results) if file_results else 0
            }
            
            analysis_result = {
                "repository": str(request.url),
                "repository_info": {
                    "name": repo_content["repo_info"]["name"],
                    "description": repo_content["repo_info"]["description"],
                    "stars": repo_content["repo_info"]["stargazers_count"],
                    "forks": repo_content["repo_info"]["forks_count"],
                    "last_updated": repo_content["repo_info"]["updated_at"]
                },
                "analysis_summary": {
                    "total_files": total_files,
                    "analyzed_files": analyzed_files,
                    "total_lines": total_lines,
                    "code_lines": total_code_lines,
                    "comment_lines": total_comment_lines,
                    "empty_lines": total_empty_lines,
                    "total_functions": total_functions,
                    "total_classes": total_classes,
                    "languages": languages_used,
                    "average_risk_score": round(avg_risk_score, 2),
                    "vulnerability_summary": vulnerability_summary,
                    "code_quality": code_quality
                },
                "files_analyzed": len(file_results),
                "analyses": file_results
            }
            
            # Cache'e kaydet
            await store_analysis_result(request_id, analysis_result, str(request.url))
            
            return {
                "request_id": request_id,
                "status": "completed",
                "result": analysis_result
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

@app.get("/analyses")
async def get_analyses():
    try:
        # Analiz sonuçlarını cache'den al ve formatla
        analyses = []
        for request_id, analysis in analysis_cache.items():
            analyses.append({
                "id": request_id,
                "repoUrl": analysis.get("result", {}).get("repository"),
                "timestamp": analysis.get("timestamp", datetime.now().isoformat()),
                "status": analysis.get("status", "completed"),
                "result": analysis.get("result", {}),
                "blockchainTx": analysis.get("blockchainTx"),
                "explorerUrl": analysis.get("explorerUrl")
            })
        
        # En son yapılan analizleri başa getir
        analyses.sort(key=lambda x: x["timestamp"], reverse=True)
        return analyses
    except Exception as e:
        logger.error(f"Error getting analyses: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Analiz sonuçlarını cache'e kaydetme fonksiyonunu güncelleyelim
async def store_analysis_result(request_id: str, result: Dict[str, Any], repository_url: Optional[str] = None):
    analysis_cache[request_id] = {
        "status": "completed",
        "timestamp": datetime.now().isoformat(),
        "result": result,
        "repository": repository_url
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 