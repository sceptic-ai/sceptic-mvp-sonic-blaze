import json
import hashlib
import time
import logging
import os
from typing import Dict, Any, Optional, List
import requests
from web3 import Web3
from eth_account import Account
import eth_account
from web3.middleware import geth_poa_middleware
from dotenv import load_dotenv

# Environment variables yükle
load_dotenv()

# Logging konfigürasyonu
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("blockchain.log")
    ]
)

# Sonic Network RPC endpoints
SONIC_MAINNET_RPC = "https://mainnet.sonic.techpay.io/"
SONIC_TESTNET_RPC = "https://testnet.sonic.techpay.io/"

# Contract addresses - Bunları gerçek deployment sonrası güncelleyin
TOKEN_CONTRACT_ADDRESS = os.getenv("TOKEN_CONTRACT_ADDRESS", "0x1234567890123456789012345678901234567890")
AUDIT_CONTRACT_ADDRESS = os.getenv("AUDIT_CONTRACT_ADDRESS", "0x0987654321098765432109876543210987654321")

# ABI dosya yolları
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TOKEN_ABI_PATH = os.path.join(SCRIPT_DIR, 'abi/token_abi.json')
AUDIT_ABI_PATH = os.path.join(SCRIPT_DIR, 'abi/sceptic_abi.json')
SCEPTIC_CONTRACT_ABI_PATH = AUDIT_ABI_PATH 

# Cüzdan konfigürasyonu
WALLET_PRIVATE_KEY = os.getenv('WALLET_PRIVATE_KEY', '')
NETWORK_TYPE = os.getenv('SONIC_NETWORK', 'testnet')  # 'testnet' veya 'mainnet'

# Sonic Network bağlantısını başlat
def initialize_web3(testnet=True):
    """
    Web3 bağlantısını başlatır ve konfigüre eder
    """
    try:
        rpc_url = SONIC_TESTNET_RPC if testnet else SONIC_MAINNET_RPC
        web3 = Web3(Web3.HTTPProvider(rpc_url))
        
        # PoA ağları için gerekli middleware ekle
        web3.middleware_onion.inject(geth_poa_middleware, layer=0)
        
        if not web3.is_connected():
            logging.error(f"Sonic Network'e bağlanılamadı: {rpc_url}")
            return None
            
        # Chain ID kontrolü
        chain_id = web3.eth.chain_id
        expected_chain_id = 59140 if testnet else 59144  # Sonic testnet ve mainnet chain ID'leri
        
        if chain_id != expected_chain_id:
            logging.error(f"Beklenmeyen chain ID: {chain_id}, beklenen: {expected_chain_id}")
            return None
            
        logging.info(f"Sonic Network'e başarıyla bağlandı. Chain ID: {chain_id}")
        return web3
    except Exception as e:
        logging.error(f"Web3 başlatma hatası: {str(e)}")
        return None

# Akıllı sözleşme yükleme
def load_contract(web3, contract_type="audit"):
    """
    Akıllı sözleşmeyi yükler
    """
    try:
        if contract_type == "token":
            contract_address = TOKEN_CONTRACT_ADDRESS
            abi_path = TOKEN_ABI_PATH
        else:  # audit
            contract_address = AUDIT_CONTRACT_ADDRESS
            abi_path = AUDIT_ABI_PATH
            
        if not os.path.exists(abi_path):
            logging.error(f"Sözleşme ABI dosyası bulunamadı: {abi_path}")
            return None
            
        with open(abi_path, 'r') as f:
            contract_abi = json.load(f)
            
        contract = web3.eth.contract(
            address=web3.to_checksum_address(contract_address),
            abi=contract_abi
        )
        
        return contract
    except Exception as e:
        logging.error(f"Sözleşme yükleme hatası: {str(e)}")
        return None

# Cüzdan hesabı oluşturma
def get_account(web3):
    """
    İşlemler için kullanılacak hesabı döndürür
    """
    if not WALLET_PRIVATE_KEY:
        logging.error("Cüzdan private key bulunamadı. Lütfen .env dosyasını kontrol edin.")
        return None
        
    try:
        account = Account.from_key(WALLET_PRIVATE_KEY)
        return account
    except Exception as e:
        logging.error(f"Hesap oluşturma hatası: {str(e)}")
        return None

# Blockchain'e veri kaydetme
def store_analysis_on_chain(analysis_data: Dict[str, Any], testnet=None) -> Dict[str, Any]:
    """
    Analiz sonuçlarını Sonic Network üzerindeki akıllı sözleşmeye kaydeder
    """
    # Testnet değerini override et veya default değeri kullan
    if testnet is None:
        testnet = NETWORK_TYPE == 'testnet'
        
    try:
        web3 = initialize_web3(testnet)
        if not web3:
            return {"success": False, "error": "Web3 bağlantısı kurulamadı"}
            
        contract = load_contract(web3, "audit")
        if not contract:
            return {"success": False, "error": "Akıllı sözleşme yüklenemedi"}
            
        account = get_account(web3)
        if not account:
            return {"success": False, "error": "Hesap oluşturulamadı"}
            
        # Analiz verilerini hazırla
        audit_id = analysis_data.get("id", "")
        
        # Verileri kırp veya ayarla çünkü blockchain'de depolama pahalıdır
        result = analysis_data.get("result", {})
        risk_score = int(result.get("risk_score", 0)) if result else 0
        prediction = result.get("prediction", "Unknown") if result else "Unknown"
        confidence = result.get("confidence", 0) if result else 0
        
        # Tüm veriyi hash'leyelim, blockchain'e sadece hash'i kaydedelim
        data_to_hash = {
            "id": audit_id,
            "repo_url": analysis_data.get("repo_url", ""),
            "timestamp": analysis_data.get("timestamp", ""),
            "prediction": prediction,
            "confidence": confidence,
            "risk_score": risk_score
        }
        
        data_hash = Web3.keccak(text=json.dumps(data_to_hash, sort_keys=True)).hex()
        
        # Nonce değerini al
        nonce = web3.eth.get_transaction_count(account.address)
        
        logging.info(f"Storing analysis {audit_id} on chain with risk score {risk_score}")
        
        # Transaction oluştur
        tx = contract.functions.storeAuditResult(
            audit_id, 
            data_hash, 
            risk_score
        ).build_transaction({
            'from': account.address,
            'gas': 200000,  # Gas limiti
            'gasPrice': web3.eth.gas_price,
            'nonce': nonce,
            'chainId': web3.eth.chain_id
        })
        
        # Transaction'ı imzala ve gönder
        signed_tx = web3.eth.account.sign_transaction(tx, account.key)
        tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        # Transaction'ın onaylanmasını bekle
        logging.info(f"Transaction submitted, waiting for confirmation: {tx_hash.hex()}")
        tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        # Block explorer URL
        explorer_url = f"https://explorer.sonic.techpay.io/tx/{tx_receipt.transactionHash.hex()}"
        if testnet:
            explorer_url = f"https://testnet-explorer.sonic.techpay.io/tx/{tx_receipt.transactionHash.hex()}"
        
        logging.info(f"Transaction confirmed: {explorer_url}")
        
        return {
            "success": True,
            "transaction_hash": tx_receipt.transactionHash.hex(),
            "explorer_url": explorer_url,
            "timestamp": int(time.time()),
            "block_number": tx_receipt.blockNumber
        }
    except Exception as e:
        logging.error(f"Blockchain kayıt hatası: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

# Blockchain'den veri okuma
def get_analysis_from_chain(audit_id: str, testnet=None) -> Optional[Dict[str, Any]]:
    """
    Belirli bir audit ID için blockchain'den kayıtlı veriyi okur
    """
    # Testnet değerini override et veya default değeri kullan
    if testnet is None:
        testnet = NETWORK_TYPE == 'testnet'
        
    try:
        web3 = initialize_web3(testnet)
        if not web3:
            return None
            
        contract = load_contract(web3, "audit")
        if not contract:
            return None
        
        # Sözleşmeden veriyi oku
        logging.info(f"Fetching analysis {audit_id} from chain")
        audit_result = contract.functions.getAuditResult(audit_id).call()
        
        if not audit_result or audit_result[0] == "":
            logging.warning(f"No data found for analysis {audit_id}")
            return None
            
        data_hash = audit_result[0]
        risk_score = audit_result[1]
        timestamp = audit_result[2]
        auditor = audit_result[3]
        
        # Block explorer URL
        explorer_base = "https://testnet-explorer.sonic.techpay.io" if testnet else "https://explorer.sonic.techpay.io"
        
        return {
            "id": audit_id,
            "data_hash": data_hash,
            "risk_score": risk_score,
            "timestamp": timestamp,
            "auditor": auditor,
            "explorer_base": explorer_base
        }
    except Exception as e:
        logging.error(f"Blockchain veri okuma hatası: {str(e)}")
        return None

def compute_risk_score(analysis_result: Dict[str, Any]) -> int:
    """
    Analiz sonucuna göre risk skoru hesaplar
    """
    # Detaylı risk analizi
    base_score = 0
    
    # AI Tespiti
    if analysis_result.get("prediction") == "AI":
        base_score += 40 * analysis_result.get("confidence", 0.5)
    
    # Riskli kod kalıpları
    has_suspicious_imports = bool(analysis_result.get("features", {}).get("suspicious_imports", False))
    has_exec_functions = bool(analysis_result.get("features", {}).get("exec_functions", False))
    has_file_operations = bool(analysis_result.get("features", {}).get("file_operations", False))
    
    if has_suspicious_imports:
        base_score += 15
    if has_exec_functions:
        base_score += 25
    if has_file_operations:
        base_score += 10
    
    # Kompleksite faktörleri
    complexity = analysis_result.get("features", {}).get("cyclomatic_complexity", 0) / 10
    indentation_irregularity = 1 - analysis_result.get("features", {}).get("indentation_consistency", 1)
    
    base_score += complexity * 10
    base_score += indentation_irregularity * 15
    
    return min(100, max(0, round(base_score)))

# Token contract fonksiyonları
def create_sceptic_token_transaction(recipient_address: str, amount: float, testnet=True) -> Dict[str, Any]:
    """
    $SCEPTIC token transfer işlemi oluşturur
    """
    try:
        web3 = initialize_web3(testnet)
        if not web3:
            return {"success": False, "error": "Web3 bağlantısı kurulamadı"}
            
        contract = load_contract(web3)
        if not contract:
            return {"success": False, "error": "Akıllı sözleşme yüklenemedi"}
            
        account = get_account(web3)
        if not account:
            return {"success": False, "error": "Hesap oluşturulamadı"}
        
        # Token miktarını wei'ye çevir (örn: 18 decimal)
        amount_wei = int(amount * (10 ** 18))
        
        # Nonce değerini al
        nonce = web3.eth.get_transaction_count(account.address)
        
        # Transfer işlemi hazırla
        tx = contract.functions.transfer(
            recipient_address,
            amount_wei
        ).build_transaction({
            'from': account.address,
            'gas': 100000,  # Sabit bir değer, gerçekte estimate_gas kullanılmalı
            'gasPrice': web3.eth.gas_price,
            'nonce': nonce,
            'chainId': web3.eth.chain_id
        })
        
        # Transaction'ı imzala ve gönder
        signed_tx = web3.eth.account.sign_transaction(tx, account.key)
        tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        # Transaction'ın onaylanmasını bekle
        tx_receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        # Block explorer URL
        explorer_url = f"https://explorer.sonic.techpay.io/tx/{tx_receipt.transactionHash.hex()}"
        if testnet:
            explorer_url = f"https://testnet-explorer.sonic.techpay.io/tx/{tx_receipt.transactionHash.hex()}"
        
        return {
            "success": True,
            "transaction_hash": tx_receipt.transactionHash.hex(),
            "explorer_url": explorer_url,
            "amount": amount,
            "recipient": recipient_address
        }
    except Exception as e:
        logging.error(f"Token transfer hatası: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

# DAO oylama sonuçlarını alma
def get_validator_votes(analysis_id: str, testnet=True) -> Dict[str, Any]:
    """
    Belirli bir analiz için DAO üyelerinin oylarını alır
    """
    try:
        web3 = initialize_web3(testnet)
        if not web3:
            return {"success": False, "error": "Web3 bağlantısı kurulamadı"}
            
        contract = load_contract(web3)
        if not contract:
            return {"success": False, "error": "Akıllı sözleşme yüklenemedi"}
        
        # Sözleşmeden oylama verilerini al
        votes = contract.functions.getVotes(analysis_id).call()
        
        approve_votes = votes[0]
        reject_votes = votes[1]
        total_votes = approve_votes + reject_votes
        
        validator_details = contract.functions.getVoters(analysis_id).call()
        
        validators = []
        for i in range(len(validator_details[0])):
            validators.append({
                "address": validator_details[0][i],
                "vote": "approve" if validator_details[1][i] else "reject",
                "stake": validator_details[2][i] / (10 ** 18)  # Wei'den token'a çevir
            })
        
        stake_weighted_approval = 0
        if total_votes > 0:
            stake_weighted_approval = approve_votes / total_votes
        
        return {
            "success": True,
            "analysis_id": analysis_id,
            "total_votes": total_votes,
            "approve": approve_votes,
            "reject": reject_votes,
            "stake_weighted_approval": stake_weighted_approval,
            "validators": validators
        }
    except Exception as e:
        logging.error(f"Oylama verisi alma hatası: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

# Akıllı sözleşme ABI oluşturma (yalnızca geliştirme amaçlı)
def create_contract_abi():
    """
    Temel bir akıllı sözleşme ABI'si oluşturur
    """
    abi_directory = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'abi')
    os.makedirs(abi_directory, exist_ok=True)
    
    contract_abi = [
        {
            "inputs": [
                {"name": "auditId", "type": "string"},
                {"name": "dataHash", "type": "string"},
                {"name": "riskScore", "type": "uint256"}
            ],
            "name": "storeAuditResult",
            "outputs": [{"name": "success", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{"name": "auditId", "type": "string"}],
            "name": "getAuditResult",
            "outputs": [
                {"name": "dataHash", "type": "string"},
                {"name": "riskScore", "type": "uint256"},
                {"name": "timestamp", "type": "uint256"},
                {"name": "auditor", "type": "address"}
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                {"name": "to", "type": "address"},
                {"name": "amount", "type": "uint256"}
            ],
            "name": "transfer",
            "outputs": [{"name": "success", "type": "bool"}],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [{"name": "auditId", "type": "string"}],
            "name": "getVotes",
            "outputs": [
                {"name": "approveVotes", "type": "uint256"},
                {"name": "rejectVotes", "type": "uint256"}
            ],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [{"name": "auditId", "type": "string"}],
            "name": "getVoters",
            "outputs": [
                {"name": "voters", "type": "address[]"},
                {"name": "votes", "type": "bool[]"},
                {"name": "stakes", "type": "uint256[]"}
            ],
            "stateMutability": "view",
            "type": "function"
        }
    ]
    
    with open(SCEPTIC_CONTRACT_ABI_PATH, 'w') as f:
        json.dump(contract_abi, f, indent=2)
    
    logging.info(f"Contract ABI created at: {SCEPTIC_CONTRACT_ABI_PATH}")
    return True

# Blockchain bağlantısını kontrol et
def check_connection(testnet=None) -> bool:
    """
    Blockchain bağlantısını test eder
    """
    # Testnet değerini override et veya default değeri kullan
    if testnet is None:
        testnet = NETWORK_TYPE == 'testnet'
        
    web3 = initialize_web3(testnet)
    if not web3:
        return False
    
    try:
        block_number = web3.eth.block_number
        logging.info(f"Current block number: {block_number}")
        
        # Contract'ı da kontrol et
        contract = load_contract(web3, "audit")
        if not contract:
            logging.error("Contract bağlantısı başarısız")
            return False
            
        return True
    except Exception as e:
        logging.error(f"Bağlantı kontrol hatası: {str(e)}")
        return False 