# Sceptic AI - Code Analysis & Fraud Detection Platform

Sceptic AI is a powerful platform for analyzing code repositories, detecting AI-generated code, performing security audits, and storing analysis results securely on the Sonic Network blockchain.

## Features

- **Code Analysis**: Analyze GitHub repositories or direct code input
- **AI Detection**: Identify AI-generated code with high accuracy
- **Security Analysis**: Find vulnerabilities and code quality issues
- **Blockchain Integration**: Store analysis results permanently on Sonic Network
- **DAO Governance**: Community validation of analysis results through token voting
- **Data Marketplace**: Share and access quality datasets

## Project Structure

The project consists of:

- **Frontend**: React/TypeScript application with Tailwind CSS
- **Backend**: FastAPI Python service with ML models and blockchain integration
- **Blockchain**: Solidity contracts deployed on Sonic Network

## Prerequisites

- Node.js 16+
- Python 3.10+
- Docker and Docker Compose (optional)
- MetaMask or compatible Ethereum wallet

## Environment Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/sceptic-mvp.git
cd sceptic-mvp
```

2. Create a `.env` file with the following content:
```
# API ve blockchain ayarları
VITE_API_URL=http://localhost:8000
WALLET_PRIVATE_KEY=your_private_key_here
GITHUB_TOKEN=your_github_token
SONIC_NETWORK=testnet

# Proje ayarları
NODE_ENV=development
DEBUG=true
```

Replace placeholder values with your own keys.

## Installation

### Frontend

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Backend

```bash
# Create and activate virtual environment (optional)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r backend/requirements.txt

# Start backend server
uvicorn backend.api.app:app --reload --host 0.0.0.0 --port 8000
```

### Using Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

## Deploying Smart Contracts

The project uses two Solidity contracts on Sonic Network:

- `ScepticToken`: ERC20 governance token
- `ScepticAudit`: Main contract for storing analysis results and voting

To deploy:

```bash
cd contracts
npm install
npx hardhat run scripts/deploy.js --network sonicTestnet
```

This will:
1. Deploy both contracts
2. Register the deployer as an auditor
3. Update your `.env` file with the contract addresses

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Connect your MetaMask wallet (set to Sonic Network)
3. Use the "Analiz" page to analyze GitHub repositories or code snippets
4. View results and blockchain verification details
5. Participate in DAO voting on analysis results

## API Documentation

The backend API is documented at `http://localhost:8000/docs`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License.