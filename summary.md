# Sceptic AI Project - Comprehensive Summary

## Project Overview

Sceptic AI is a full-stack application designed to analyze code repositories, detect AI-generated code, perform security audits, and store analysis results securely on the Sonic Network blockchain. The platform combines machine learning-based code analysis with blockchain verification to create a trustworthy system for code auditing.

## Architecture

The project follows a three-tier architecture:

### 1. Frontend (React/TypeScript)
- Single-page application built with React and TypeScript
- Tailwind CSS for styling
- State management using React Context API
- API integration with React Query

### 2. Backend (Python/FastAPI)
- REST API built with FastAPI
- ML models for code analysis and AI detection
- Blockchain integration with Sonic Network
- File and data storage capabilities

### 3. Blockchain Layer (Solidity/Sonic Network)
- Smart contracts deployed on Sonic Network
- ERC20 token ($SCEPTIC) for governance and voting
- Immutable storage of audit results
- DAO-based validation mechanism

## Key Components

### Frontend Components

1. **Pages**
   - `HomePage`: Introduction to the platform
   - `AnalysisPage`: Core functionality for code analysis
   - `DashboardPage`: Overview of past analyses
   - `TokenAnalysisPage`: Token-specific analysis
   - `DataMarketplacePage`: Data sharing marketplace
   - `DAOPage`: Community governance
   - `ProfilePage`: User settings and wallet connection

2. **Contexts**
   - `WalletContext`: Manages web3 wallet connection via MetaMask
   - Handles chain and account changes
   - Stores connection data in localStorage

3. **Components**
   - `WalletModal`: UI for connecting crypto wallets
   - `LoadingSpinner`: Visual feedback during operations
   - `AnimatedButton`: Enhanced button UI

### Backend Components

1. **API Module (`app.py`)**
   - HTTP endpoints for code analysis
   - Background processing of GitHub repositories
   - Result storage and retrieval
   - Blockchain transaction management
   - Dataset upload and management

2. **ML Module (`model.py`)**
   - AI code detection using neural networks
   - Feature extraction from code
   - Security vulnerability analysis
   - Code quality assessment
   - Risk scoring algorithm

3. **Blockchain Module (`sonic.py`)**
   - Sonic Network integration
   - Smart contract interaction
   - Transaction signing and submission
   - Data hashing and verification
   - Token operations

### Blockchain Components

1. **ScepticToken Contract**
   - ERC20 implementation for governance token
   - Minting functionality
   - 100M initial token supply

2. **ScepticAudit Contract**
   - Stores audit results on-chain
   - Auditor registration and management
   - DAO-based voting system
   - Result validation mechanism

## Key Functionalities

### 1. Code Analysis

The system offers three methods for code analysis:
- **GitHub Repository Analysis**: Analyzes entire repositories or specific files
- **Direct Code Analysis**: Analyzes code snippets pasted by users
- **File Upload Analysis**: Processes uploaded code files

The analysis process includes:
1. Code tokenization and feature extraction
2. AI detection using ML models
3. Security vulnerability scanning
4. Code quality assessment
5. Risk score calculation

### 2. AI Detection

The AI detection system:
- Uses a neural network model to classify code as human or AI-written
- Provides confidence scores for predictions
- Identifies potential AI sources (ChatGPT, Claude, etc.)
- Extracts code characteristics that indicate AI generation

### 3. Security Analysis

Security analysis capabilities include:
- Detection of dangerous imports and functions
- Identification of code execution vulnerabilities
- Analysis of file operations and network access
- Code quality metrics (indentation, complexity, etc.)
- Overall risk scoring based on multiple factors

### 4. Blockchain Verification

High-risk findings are permanently stored on the Sonic Network:
1. Analysis results are hashed and sent to the ScepticAudit contract
2. Transaction details are stored with timestamps and auditor information
3. Results can be verified through the blockchain explorer
4. Immutable records prevent tampering with audit results

### 5. DAO Governance

The platform includes a decentralized governance system:
- Community members stake $SCEPTIC tokens to vote on analysis results
- Validators can approve or reject audit findings
- Stake-weighted voting determines consensus
- Validated results receive blockchain certification

### 6. Data Marketplace

Users can share and access code analysis datasets:
- Upload and categorize analysis datasets
- Control access with public/private settings
- Datasets are stored with metadata for searchability
- Repository for training improved AI detection models

## Technical Implementation Details

### ML Model Architecture
- Text tokenization with a vocabulary of 5000 tokens
- Embedding dimension of 64
- Feature extraction including code metrics like indentation consistency, complexity, etc.
- Risk scoring algorithm normalizing risks on a 0-100 scale

### Blockchain Integration
- Web3.py for Sonic Network interaction
- Transaction signing with private keys
- Contract interaction via ABI interfaces
- Hash-based storage to minimize on-chain costs
- Explorer URL generation for result verification

### Security Features
- Non-custodial wallet integration
- Background task processing for resource-intensive operations
- Input validation and sanitization
- Error handling and logging
- Transaction confirmation monitoring

## Deployment Configuration

The project supports multiple deployment options:
1. **Local Development**: Using npm and Python virtual environments
2. **Docker Deployment**: Containerized setup with Docker Compose
3. **Production Deployment**: Environment variables for secure configuration

## Conclusion

Sceptic AI is a comprehensive solution for code analysis and verification, combining AI-powered detection with blockchain-based certification. The platform addresses the growing need for tools to identify AI-generated code and ensure code security, while providing a decentralized governance mechanism for community verification and trust.

