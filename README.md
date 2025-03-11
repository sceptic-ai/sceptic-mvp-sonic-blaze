# Sceptic AI: AI-Powered Code Analysis & Blockchain Verification Platform


## [Watch Demo Video](https://screen.studio/share/xIXBd3BT)

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Technical Implementation](#technical-implementation)
  - [Frontend](#frontend)
  - [Backend](#backend)
  - [Blockchain Integration](#blockchain-integration)
  - [AI Model](#ai-model)
- [Smart Contracts](#smart-contracts)
  - [Contract Addresses](#contract-addresses)
  - [Contract Functionality](#contract-functionality)
- [API Reference](#api-reference)
- [Data Flow](#data-flow)
- [Security Considerations](#security-considerations)
- [Deployment](#deployment)
- [Development Setup](#development-setup)
- [Contributing](#contributing)
- [License](#license)

## Overview

Sceptic AI is a cutting-edge platform that combines artificial intelligence and blockchain technology to analyze code repositories, detect AI-generated code, perform security audits, and store analysis results securely on the Sonic Network blockchain. The platform provides developers, auditors, and organizations with powerful tools to verify code authenticity, identify security vulnerabilities, and maintain a transparent record of code analysis.

## Architecture

The Sceptic AI platform follows a modern microservices architecture:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React Frontend │────▶│ FastAPI Backend │────▶│  Sonic Network  │
│                 │     │                 │     │   Blockchain    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                       │
         │                      │                       │
         ▼                      ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    Web3/ethers  │     │   TensorFlow    │     │ Smart Contracts │
│    Integration  │     │   ML Models     │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Features

- **AI Code Detection**: Identify AI-generated code with high accuracy
- **GitHub Repository Analysis**: Analyze entire repositories with detailed metrics
- **Security Vulnerability Detection**: Identify potential security issues in code
- **Blockchain Verification**: Store analysis results on-chain for immutable record-keeping
- **Risk Assessment**: Calculate risk scores based on multiple factors
- **Interactive Dashboard**: Visualize analysis results and metrics
- **Token Analysis**: Analyze token contracts and price data
- **DAO Governance**: Vote on analysis results and participate in platform governance
- **Data Marketplace**: Share and monetize code analysis datasets

## Technical Implementation

### Frontend

The frontend is built with React, TypeScript, and Vite, providing a modern and responsive user interface.

**Key Technologies:**
- **React 18**: For building the user interface
- **TypeScript**: For type safety and better developer experience
- **Vite**: For fast development and optimized builds
- **TailwindCSS**: For styling and responsive design
- **ethers.js**: For blockchain interaction
- **Framer Motion**: For animations and transitions
- **Recharts/Chart.js**: For data visualization
- **React Router**: For client-side routing

**Key Components:**
- `AnalysisPage`: Handles code and GitHub repository analysis
- `DashboardPage`: Displays analysis metrics and recent activities
- `TokenAnalysisPage`: Analyzes token contracts and price data
- `DAOPage`: Facilitates governance and voting
- `WalletContext`: Manages wallet connection and blockchain interactions
- `ContractInteraction`: Handles smart contract interactions

### Backend

The backend is built with Python, FastAPI, and TensorFlow, providing robust API endpoints and ML capabilities.

**Key Technologies:**
- **FastAPI**: For high-performance API endpoints
- **TensorFlow**: For machine learning models
- **Celery**: For asynchronous task processing
- **Redis**: For caching and task queue
- **Web3.py**: For blockchain interaction
- **Pydantic**: For data validation and settings management

**Key Modules:**
- `api/app.py`: Main FastAPI application with API endpoints
- `ml/model.py`: Machine learning model for code analysis
- `blockchain/sonic.py`: Blockchain interaction with Sonic Network
- `utils/setup.py`: Setup utilities for the application

### Blockchain Integration

Sceptic AI integrates with the Sonic Network blockchain for storing analysis results and facilitating token transactions.

**Key Features:**
- **Analysis Storage**: Store analysis results on-chain for immutable record-keeping
- **Signature Verification**: Verify user signatures for secure transactions
- **Smart Contract Interaction**: Interact with deployed smart contracts
- **Token Transactions**: Facilitate token transfers and payments

**Implementation Details:**
- The `blockchain/sonic.py` module handles all blockchain interactions
- The `store_analysis_on_chain` function stores analysis results on-chain
- The `get_analysis_from_chain` function retrieves analysis results from the blockchain
- The `check_connection` function verifies blockchain connectivity

### AI Model

The AI model is trained to detect AI-generated code and identify security vulnerabilities.

**Model Architecture:**
- Hybrid model combining LSTM and feature-based approaches
- Input features include code metrics, syntax patterns, and semantic analysis
- Output includes prediction (AI or human), confidence score, and risk assessment

**Training Data:**
- Combination of real-world code samples and synthetic data
- Balanced dataset of AI-generated and human-written code
- Multiple programming languages represented

**Training Process:**
- Feature extraction from code samples
- Tokenization and sequence padding
- Model training with validation split
- Hyperparameter tuning for optimal performance

**Implementation Details:**
- The `ml/models/train_model.py` script handles model training
- The `predict_code` function in `ml/model.py` performs code analysis
- The `analyze_code_vulnerabilities` function identifies security issues
- The `extract_code_features` function extracts features from code

## Smart Contracts

### Contract Addresses

**Sonic Testnet (Chain ID: 57054)**

| Contract | Address | Description |
|----------|---------|-------------|
| ScepticSimple | 0xF9978A310aD03151E4B09d8D03b30F863eaD38eC | Basic contract for project name management |
| ScepticToken | 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 | ERC-20 token for platform governance |
| ScepticAudit | 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 | Main contract for storing analysis results |

**Deployment Addresses**

| Role | Address | Description |
|------|---------|-------------|
| Deployer | 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 | Address used for contract deployment |
| Treasury | 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 | Address for platform fees and revenue |
| Validator | 0xF9978A310aD03151E4B09d8D03b30F863eaD38eC | Address for validating analysis results |

### Contract Functionality

**ScepticSimple Contract**

The ScepticSimple contract is a basic contract for project name management.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract ScepticSimple {
    string public projectName;
    address public owner;
    
    constructor(string memory _name) {
        projectName = _name;
        owner = msg.sender;
    }
    
    function updateName(string memory _newName) external {
        require(msg.sender == owner, "Only owner can update");
        projectName = _newName;
    }
}
```

**ScepticAudit Contract**

The ScepticAudit contract stores analysis results on-chain and facilitates validation.

Key functions:
- `storeAnalysis`: Store analysis results on-chain
- `getAnalysis`: Retrieve analysis results
- `validateAnalysis`: Validate analysis results
- `voteOnAnalysis`: Vote on analysis results

## API Reference

### Analysis Endpoints

#### Analyze Code

```
POST /analyze
```

Request body:
```json
{
  "code": "string",
  "language": "string",
  "signature": "string"
}
```

Response:
```json
{
  "request_id": "string",
  "status": "string",
  "result": {
    "prediction": "string",
    "confidence": "number",
    "risk_score": "number",
    "source": "string",
    "analysis_details": {
      "total_lines": "number",
      "code_lines": "number",
      "comment_lines": "number",
      "empty_lines": "number",
      "complexity_score": "number",
      "avg_line_length": "number",
      "max_line_length": "number",
      "functions_count": "number",
      "classes_count": "number"
    },
    "security_analysis": {
      "vulnerabilities": [
        {
          "type": "string",
          "name": "string",
          "risk": "string",
          "description": "string",
          "score": "number"
        }
      ],
      "code_quality": {
        "indentation_consistency": "number",
        "naming_consistency": "number",
        "comment_ratio": "number"
      },
      "risk_level": "string"
    }
  }
}
```

#### Analyze GitHub Repository

```
POST /analyze/github
```

Request body:
```json
{
  "url": "string",
  "max_files": "number",
  "signature": "string"
}
```

Response:
```json
{
  "request_id": "string",
  "status": "string",
  "result": {
    "repository_info": {
      "name": "string",
      "stars": "number",
      "forks": "number",
      "last_updated": "string",
      "description": "string"
    },
    "analysis_summary": {
      "total_files": "number",
      "analyzed_files": "number",
      "total_lines": "number",
      "code_lines": "number",
      "comment_lines": "number",
      "empty_lines": "number",
      "total_functions": "number",
      "total_classes": "number",
      "average_risk_score": "number",
      "languages": {
        "language": "number"
      },
      "vulnerability_summary": {
        "high": "number",
        "medium": "number",
        "low": "number"
      }
    },
    "analyses": [
      {
        "file": "string",
        "language": "string",
        "analysis": {
          "prediction": "string",
          "source": "string",
          "risk_score": "number",
          "security_analysis": {
            "code_quality": {
              "comment_ratio": "number"
            },
            "warnings": ["string"],
            "vulnerabilities": [
              {
                "name": "string",
                "description": "string"
              }
            ]
          }
        }
      }
    ]
  }
}
```

### Contract Endpoints

#### Get Contract Info

```
GET /contract/info
```

Response:
```json
{
  "contracts": {
    "sceptic_simple": {
      "address": "string",
      "name": "string",
      "description": "string"
    },
    "sceptic_token": {
      "address": "string",
      "name": "string",
      "description": "string"
    },
    "sceptic_audit": {
      "address": "string",
      "name": "string",
      "description": "string"
    }
  },
  "network": {
    "name": "string",
    "chainId": "string",
    "rpcUrl": "string",
    "symbol": "string",
    "explorerUrl": "string",
    "faucetUrl": "string"
  }
}
```

#### Update Contract

```
POST /contract/update
```

Request body:
```json
{
  "address": "string",
  "contract_type": "string",
  "network": "string",
  "transaction_hash": "string",
  "deployer": "string",
  "verified": "boolean"
}
```

## Data Flow

The data flow in Sceptic AI follows these steps:

1. **User Input**: User submits code or GitHub repository URL for analysis
2. **Signature Verification**: User signs the request with their wallet
3. **Analysis Request**: Frontend sends the request to the backend
4. **Code Analysis**: Backend analyzes the code using the ML model
5. **Result Storage**: Analysis results are stored on-chain
6. **Result Display**: Results are displayed to the user in the frontend
7. **Validation**: Validators can vote on the analysis results
8. **Reward Distribution**: Rewards are distributed to validators

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant ML Model
    participant Blockchain

    User->>Frontend: Submit code/repo
    Frontend->>User: Request signature
    User->>Frontend: Provide signature
    Frontend->>Backend: Send analysis request
    Backend->>ML Model: Analyze code
    ML Model->>Backend: Return analysis results
    Backend->>Blockchain: Store results on-chain
    Blockchain->>Backend: Confirm transaction
    Backend->>Frontend: Return analysis results
    Frontend->>User: Display results
```

## Security Considerations

Sceptic AI implements several security measures to protect user data and ensure platform integrity:

- **Signature Verification**: All requests require a valid signature from the user's wallet
- **Rate Limiting**: API endpoints are rate-limited to prevent abuse
- **Input Validation**: All user inputs are validated using Pydantic models
- **Secure Storage**: Sensitive data is stored securely and never exposed
- **CORS Protection**: Cross-Origin Resource Sharing is properly configured
- **Error Handling**: Proper error handling to prevent information leakage
- **Dependency Management**: Regular updates to dependencies to address vulnerabilities

## Deployment

### Frontend Deployment

The frontend is deployed using Docker:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

### Backend Deployment

The backend is deployed using Docker:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install system packages for TensorFlow and scientific computing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    libgomp1 \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create models directory
RUN mkdir -p /app/backend/ml/models

EXPOSE 8000

# Start FastAPI application
CMD ["uvicorn", "backend.api.app:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

### Docker Compose

The entire application is orchestrated using Docker Compose:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    volumes:
      - ./src:/app/src
      - ./public:/app/public
    depends_on:
      - backend
    networks:
      - sceptic-network
    environment:
      - REACT_APP_API_URL=http://backend:8000

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app/backend
    depends_on:
      - redis
    networks:
      - sceptic-network
    environment:
      - PYTHONUNBUFFERED=1
      - REDIS_URL=redis://redis:6379/0
      - SOLANA_NETWORK=devnet
      - GITHUB_TOKEN=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
      
  celery:
    build:
      context: .
      dockerfile: Dockerfile.backend
    command: celery -A backend.api.celery_app worker --loglevel=info
    volumes:
      - ./backend:/app/backend
    depends_on:
      - redis
      - backend
    networks:
      - sceptic-network
    environment:
      - PYTHONUNBUFFERED=1
      - REDIS_URL=redis://redis:6379/0
      - SOLANA_NETWORK=devnet

  redis:
    image: redis:7.0-alpine
    ports:
      - "6379:6379"
    networks:
      - sceptic-network
    volumes:
      - redis-data:/data

networks:
  sceptic-network:
    driver: bridge

volumes:
  redis-data:
```

## Development Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- Docker and Docker Compose (optional)
- Metamask or compatible wallet

### Frontend Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/sceptic-mvp.git
cd sceptic-mvp

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start development server
npm run dev
```

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start development server
python main.py
```

### Smart Contract Deployment

```bash
# Install Hardhat dependencies
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox

# Create wallet for deployment
npx hardhat create-wallet

# Deploy contracts
npx hardhat run scripts/deploy.js --network sonicTestnet
```

## On-Chain Data Storage

Sceptic AI stores analysis results on the Sonic Network blockchain for several reasons:

1. **Immutability**: Once stored on-chain, analysis results cannot be altered
2. **Transparency**: Anyone can verify the analysis results
3. **Decentralization**: No single entity controls the data
4. **Incentivization**: Validators can be rewarded for their contributions
5. **Auditability**: All actions are recorded on the blockchain

The `store_analysis_on_chain` function in `blockchain/sonic.py` handles the on-chain storage:

```python
def store_analysis_on_chain(analysis_data: Dict[str, Any], testnet=None) -> Dict[str, Any]:
    """
    Store analysis results on the Sonic Network blockchain.
    
    Args:
        analysis_data: Analysis results to store
        testnet: Whether to use testnet or mainnet
        
    Returns:
        Dictionary with transaction details
    """
    try:
        # Initialize Web3
        web3 = initialize_web3(testnet)
        
        # Load contract
        contract = load_contract(web3, "audit")
        
        # Get account
        account = get_account(web3)
        
        # Prepare data for on-chain storage
        analysis_hash = web3.keccak(text=json.dumps(analysis_data)).hex()
        analysis_summary = {
            "prediction": analysis_data.get("prediction", "Unknown"),
            "confidence": int(analysis_data.get("confidence", 0) * 100),
            "risk_score": analysis_data.get("risk_score", 0),
            "timestamp": int(time.time())
        }
        
        # Build transaction
        tx = contract.functions.storeAnalysis(
            analysis_hash,
            analysis_summary["prediction"],
            analysis_summary["confidence"],
            analysis_summary["risk_score"],
            analysis_summary["timestamp"]
        ).build_transaction({
            'from': account.address,
            'nonce': web3.eth.get_transaction_count(account.address),
            'gas': 2000000,
            'gasPrice': web3.eth.gas_price
        })
        
        # Sign and send transaction
        signed_tx = account.sign_transaction(tx)
        tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        # Wait for transaction receipt
        tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        
        return {
            "success": True,
            "transaction_hash": tx_hash.hex(),
            "block_number": tx_receipt["blockNumber"],
            "analysis_hash": analysis_hash
        }
    except Exception as e:
        logging.error(f"Error storing analysis on chain: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }
```

## AI Implementation

Sceptic AI uses a sophisticated machine learning model to detect AI-generated code and identify security vulnerabilities. The model is implemented in `ml/model.py` and trained using `ml/models/train_model.py`.

### Model Architecture

The model uses a hybrid approach combining:

1. **Feature-based analysis**: Extracts code metrics and patterns
2. **LSTM neural network**: Analyzes code structure and semantics
3. **Rule-based analysis**: Identifies specific security vulnerabilities

### Feature Extraction

The `extract_code_features` function extracts features from code:

```python
def extract_code_features(code):
    """
    Extract features from code for AI detection.
    
    Args:
        code: Source code to analyze
        
    Returns:
        List of features
    """
    features = []
    
    # Split code into lines
    lines = code.split('\n')
    
    # Basic metrics
    total_lines = len(lines)
    empty_lines = len([l for l in lines if not l.strip()])
    code_lines = total_lines - empty_lines
    comment_lines = len([l for l in lines if l.strip().startswith(('#', '//', '/*', '*', '"""', "'''"))])
    
    # Line length metrics
    line_lengths = [len(l) for l in lines if l.strip()]
    avg_line_length = sum(line_lengths) / len(line_lengths) if line_lengths else 0
    max_line_length = max(line_lengths) if line_lengths else 0
    
    # Indentation metrics
    indentation_consistency = calculate_indentation_consistency(code)
    
    # Complexity metrics
    complexity_score = calculate_cyclomatic_complexity(code)
    
    # Function and class count
    function_pattern = r'(def\s+\w+|function\s+\w+|\w+\s*=\s*function|\w+\s*=\s*\(.*\)\s*=>'
    class_pattern = r'(class\s+\w+|interface\s+\w+|struct\s+\w+)'
    functions_count = len(re.findall(function_pattern, code))
    classes_count = len(re.findall(class_pattern, code))
    
    # Variable naming consistency
    variable_pattern = r'(\b[a-zA-Z_][a-zA-Z0-9_]*\b)\s*='
    variables = re.findall(variable_pattern, code)
    naming_consistency = calculate_naming_consistency(variables)
    
    # Combine features
    features = [
        total_lines,
        code_lines,
        comment_lines,
        empty_lines,
        avg_line_length,
        max_line_length,
        indentation_consistency,
        complexity_score,
        functions_count,
        classes_count,
        naming_consistency
    ]
    
    return features
```

### AI Detection

The `predict_code` function analyzes code and predicts whether it's AI-generated:

```python
def predict_code(code: str, model=None, tokenizer=None, scaler=None) -> Dict[str, Any]:
    """
    Predict whether code is AI-generated.
    
    Args:
        code: Source code to analyze
        model: Pre-loaded model (optional)
        tokenizer: Pre-loaded tokenizer (optional)
        scaler: Pre-loaded scaler (optional)
        
    Returns:
        Dictionary with prediction results
    """
    try:
        # Load model if not provided
        if model is None or tokenizer is None or scaler is None:
            model, tokenizer, scaler = load_model()
        
        # Extract features
        features = extract_code_features(code)
        
        # Prepare features for model
        features_df = pd.DataFrame([features], columns=FEATURE_NAMES)
        features_scaled = scaler.transform(features_df)
        
        # Prepare text features
        text_features = ' '.join(map(str, features))
        text_seq = tokenizer.texts_to_sequences([text_features])
        text_padded = pad_sequences(text_seq, maxlen=MAX_SEQUENCE_LENGTH)
        
        # Make prediction
        prediction = model.predict([text_padded, features_scaled])[0][0]
        
        # Determine source and confidence
        is_ai = prediction > 0.5
        confidence = prediction if is_ai else 1 - prediction
        source = "AI-generated" if is_ai else "Human-written"
        
        # Calculate risk score
        risk_score = compute_risk_score(features, is_ai, confidence)
        
        # Analyze vulnerabilities
        security_analysis = analyze_code_vulnerabilities(code)
        
        # Prepare analysis details
        analysis_details = {
            "total_lines": features[0],
            "code_lines": features[1],
            "comment_lines": features[2],
            "empty_lines": features[3],
            "avg_line_length": features[4],
            "max_line_length": features[5],
            "complexity_score": features[7],
            "functions_count": features[8],
            "classes_count": features[9]
        }
        
        return {
            "prediction": "AI" if is_ai else "Human",
            "confidence": float(confidence),
            "risk_score": risk_score,
            "source": source,
            "analysis_details": analysis_details,
            "security_analysis": security_analysis
        }
    except Exception as e:
        logging.error(f"Error predicting code: {str(e)}")
        return {
            "prediction": "Unknown",
            "confidence": 0.0,
            "risk_score": 50,
            "source": "Error during analysis",
            "error": str(e)
        }
```

## Contributing

We welcome contributions to Sceptic AI! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---
Author: @virjilakrum
© 2025 Sceptic AI. All rights reserved.