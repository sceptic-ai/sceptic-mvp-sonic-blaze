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

# Contract Settings
https://testnet.soniclabs.com/tx/0x611de8acc2be04b7f83057335432c9c7d09391722830c246d72c9bfd92109a46
VITE_CONTRACT_ADDRESS=0xF9978A310aD03151E4B09d8D03b30F863eaD38eC
TOKEN_CONTRACT_ADDRESS="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
AUDIT_CONTRACT_ADDRESS="0x70997970C51812dc3A010C7d01b50e0d17dc79C8" 
Tx Hash: 0x611de8acc2be04b7f83057335432c9c7d09391722830c246d72c9bfd92109a46
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

## Working with the Deployed Contract

This project now includes full integration with your deployed `ScepticSimple` contract on the Sonic Network. Here's how it works:

1. **Contract Interaction**: The application provides a UI for interacting with your deployed contract in the Dashboard. You can view the current project name and update it if you're the contract owner.

2. **Network Support**: The wallet integration supports connecting to the Sonic Network and automatically prompts the user to switch networks if needed.

3. **Backend Integration**: When contract changes are made (like updating the project name), the backend records these changes and can track the transaction history.

4. **Environment Variables**: The contract address is read from the .env file. Make sure your `.env` file contains:

```
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

### Interacting with the Contract

1. Connect your MetaMask wallet to the Sonic Network
2. Go to the Dashboard page
3. You'll see the current contract state and, if you're the owner, you'll be able to update the project name
4. All contract interactions are recorded and displayed in the "Recent Contract Updates" section

### Smart Contract Implementation

The core smart contract is a simple implementation that stores a project name and allows only the owner to update it:

```solidity
// ScepticSimple.sol
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

This contract has been deployed and serves as an example of how this app can integrate with blockchain contracts on the Sonic Network.