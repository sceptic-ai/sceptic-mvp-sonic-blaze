import axios from 'axios';
import { ethers } from 'ethers';

// API URL'yi ortam değişkeninden al veya varsayılan değeri kullan
const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:8000';

// TypeScript için ethereum window tanımı
declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface Analysis {
  id: string;
  contractAddress: string;
  riskScore: number;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  findings: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface AnalysisResult {
  id: string;
  repoUrl: string;
  timestamp: string;
  status: string;
  result?: {
    prediction: string;
    confidence: number;
    source: string;
    source_probabilities?: Record<string, number>;
    risk_score: number;
    features?: Record<string, number>;
    security_analysis?: {
      vulnerabilities: Array<{
        type: string;
        name: string;
        risk: string;
        description: string;
        score: number;
      }>;
      code_quality: Record<string, any>;
      risk_level: number;
      high_risk: boolean;
      medium_risk: boolean;
      low_risk: boolean;
    };
  };
  blockchainTx?: string;
  explorerUrl?: string;
}

export interface DailyMetrics {
  date: string;
  analysisCount: number;
  averageRiskScore: number;
}

export interface GithubAnalysisRequest {
  repo_url: string;
  branch?: string;
  file_path?: string;
}

export interface CodeAnalysisRequest {
  code: string;
}

export interface ContractInfo {
  contracts: {
    sceptic_simple: {
      address: string;
      name: string;
      description: string;
    };
    sceptic_token: {
      address: string;
      name: string;
      description: string;
    };
    sceptic_audit: {
      address: string;
      name: string;
      description: string;
    };
  };
  network: {
    name: string;
    chainId: string;
    rpcUrl: string;
  };
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// GitHub repolarını analiz etme
export const analyzeGithubRepo = async (data: GithubAnalysisRequest): Promise<AnalysisResult> => {
  try {
    const response = await api.post('/analyze/github', data);
    return {
      id: response.data.id,
      repoUrl: response.data.repo_url,
      timestamp: response.data.timestamp,
      status: response.data.status,
      result: response.data.result,
      blockchainTx: response.data.blockchain_tx,
      explorerUrl: response.data.explorer_url
    };
  } catch (error) {
    console.error('GitHub repo analiz hatası:', error);
    throw error;
  }
};

// Doğrudan kod analizi yapma
export const analyzeCode = async (data: CodeAnalysisRequest): Promise<any> => {
  try {
    const response = await api.post('/analyze/code', data);
    return response.data;
  } catch (error) {
    console.error('Kod analiz hatası:', error);
    throw error;
  }
};

// Analiz sonuçlarını getirme
export const getAnalysisResult = async (analysisId: string): Promise<AnalysisResult> => {
  try {
    const response = await api.get(`/analysis/${analysisId}`);
    return {
      id: response.data.id,
      repoUrl: response.data.repo_url,
      timestamp: response.data.timestamp,
      status: response.data.status,
      result: response.data.result,
      blockchainTx: response.data.blockchain_tx,
      explorerUrl: response.data.explorer_url
    };
  } catch (error) {
    console.error('Analiz sonucu getirme hatası:', error);
    throw error;
  }
};

// Mevcut analiz listesini getirme - Backend API'dan gerçek verileri alıyor
export const fetchAnalyses = async (): Promise<AnalysisResult[]> => {
  try {
    const response = await api.get('/analyses');
    return response.data.map((item: any) => ({
      id: item.id,
      repoUrl: item.repo_url,
      timestamp: item.timestamp,
      status: item.status,
      result: item.result,
      blockchainTx: item.blockchain_tx,
      explorerUrl: item.explorer_url
    }));
  } catch (error) {
    console.error('Analizleri getirme hatası:', error);
    // Hata durumunda mocklanmış veri dönebiliriz
    return [
      {
        id: 'error_1',
        repoUrl: 'Error fetching analyses',
        timestamp: new Date().toISOString(),
        status: 'failed',
        result: {
          risk_score: 0,
          prediction: 'Unknown',
          confidence: 0,
          source: 'Error'
        }
      }
    ];
  }
};

// Günlük metrikleri hesaplama - Backend'den gelen verilerle oluştur
export const fetchDailyMetrics = async (): Promise<DailyMetrics[]> => {
  try {
    // Gerçek analizleri al
    const analyses = await fetchAnalyses();
    
    // Son 7 gün için günlük metrikler oluştur
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();
    
    // Her gün için analiz sayısını ve ortalama risk skorunu hesapla
    return last7Days.map(date => {
      // O güne ait analizleri filtrele
      const dailyAnalyses = analyses.filter(a => 
        a.timestamp.split('T')[0] === date && 
        a.status === 'completed' && 
        a.result?.risk_score !== undefined
      );
      
      // Analiz sayısı ve ortalama risk skoru
      const analysisCount = dailyAnalyses.length;
      const totalRiskScore = dailyAnalyses.reduce((sum, item) => 
        sum + (item.result?.risk_score || 0), 0);
      const averageRiskScore = analysisCount > 0 
        ? Math.round(totalRiskScore / analysisCount) 
        : 0;
      
      return {
        date,
        analysisCount,
        averageRiskScore
      };
    });
  } catch (error) {
    console.error('Günlük metrikleri getirme hatası:', error);
    
    // Hata durumunda mocklanmış veri dön
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        analysisCount: Math.floor(Math.random() * 5),
        averageRiskScore: Math.floor(Math.random() * 40) + 20
      };
    }).reverse();
  }
};

// Return type genişletilmiş versiyonu
interface VoteResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
}

// DAO oy verme - Blockchain'e bağlanacak
export const voteOnAnalysis = async (analysisId: string, vote: 'approve' | 'reject'): Promise<VoteResult> => {
  try {
    // Kullanıcının cüzdanı bağlı olmalı
    if (!window.ethereum) {
      throw new Error('MetaMask veya uyumlu bir cüzdan bulunamadı');
    }
    
    // Cüzdan bağlantısı iste
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send('eth_requestAccounts', []);
    
    if (accounts.length === 0) {
      throw new Error('Lütfen cüzdanınızı bağlayın');
    }
    
    const signer = await provider.getSigner();
    
    // Kontrat ABI ve adresi
    const response = await fetch('/api/contract-info');
    const { auditContractAddress, auditContractAbi } = await response.json();
    
    // Kontrat oluştur
    const contract = new ethers.Contract(auditContractAddress, auditContractAbi, signer);
    
    // Minimum stake miktarını kontrol et
    const minStake = await contract.minStakeForVoting();
    
    // Kullanıcının token bakiyesini kontrol et
    const tokenAddress = await contract.scepticToken();
    const tokenContract = new ethers.Contract(
      tokenAddress,
      [
        'function balanceOf(address owner) view returns (uint256)',
        'function approve(address spender, uint256 amount) returns (bool)'
      ],
      signer
    );
    
    // Kullanıcının bakiyesini kontrol et
    const balance = await tokenContract.balanceOf(signer.getAddress());
    
    if (balance < minStake) {
      throw new Error(`Oy vermek için en az ${ethers.formatUnits(minStake, 18)} SCEP token gerekli`);
    }
    
    // Token kontrat izni
    const approveTx = await tokenContract.approve(auditContractAddress, minStake);
    await approveTx.wait();
    
    // Oy verme işlemi
    const voteTx = await contract.voteOnAudit(
      analysisId,
      vote === 'approve', // true = approve, false = reject
      minStake
    );
    
    // İşlemin tamamlanmasını bekle
    const receipt = await voteTx.wait();
    
    return { 
      success: true, 
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('Oy verme hatası:', error);
    throw error;
  }
};

// Dataset yayınlama sonucu
interface DatasetPublishResult {
  success: boolean;
  datasetId: string;
  name?: string;
  description?: string;
  fileSize?: number;
  uploadDate?: string;
  transactionHash?: string;
}

// Veri seti yayınlama endpoint'i
export const publishDataset = async (data: FormData): Promise<DatasetPublishResult> => {
  try {
    // Backend'e verileri gönder
    const response = await api.post('/datasets/publish', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    const result = response.data;
    
    // Cüzdan bağlantısı kontrol et
    if (!window.ethereum) {
      throw new Error('MetaMask veya uyumlu bir cüzdan bulunamadı');
    }
    
    // Blockchain'e veri kaydı için cüzdan bağlantısı iste
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send('eth_requestAccounts', []);
    
    if (accounts.length === 0) {
      throw new Error('Lütfen cüzdanınızı bağlayın');
    }
    
    const signer = await provider.getSigner();
    
    // Kontrat bilgilerini al
    const contractResponse = await fetch('/api/contract-info');
    const { auditContractAddress, auditContractAbi } = await contractResponse.json();
    
    // Kontrat oluştur
    const contract = new ethers.Contract(auditContractAddress, auditContractAbi, signer);
    
    // Veri hash'ini hesapla
    const dataHash = ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify({
        id: result.datasetId,
        name: data.get('name'),
        description: data.get('description'),
        timestamp: new Date().toISOString()
      }))
    );
    
    // Blockchain'e kaydet - storeAuditResult kullan (datasetId'yi auditId olarak kullan)
    const tx = await contract.storeAuditResult(
      result.datasetId,
      dataHash,
      50 // Sabit bir risk skoru (veri seti için anlamlı değil)
    );
    
    await tx.wait();
    
    // Transaction bilgisini sonuca ekle
    result.transactionHash = tx.hash;
    
    return result;
  } catch (error) {
    console.error('Veri seti yayınlama hatası:', error);
    throw error;
  }
};

// Fetch contract information
export const getContractInfo = async (): Promise<ContractInfo> => {
  try {
    const response = await api.get('/api/contract-info');
    return response.data;
  } catch (error) {
    console.error('Error fetching contract info:', error);
    throw error;
  }
};

// Update contract information
export const updateContractProjectName = async (
  contractAddress: string,
  projectName: string,
  txHash: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.post('/api/contract-update', {
      contract_address: contractAddress,
      project_name: projectName,
      tx_hash: txHash
    });
    return response.data;
  } catch (error) {
    console.error('Error updating contract information:', error);
    throw error;
  }
};

export interface ContractUpdate {
  contract_address: string;
  project_name: string;
  tx_hash: string;
  timestamp: string;
}

export const getContractUpdates = async (): Promise<ContractUpdate[]> => {
  try {
    const response = await api.get('/api/contract-updates');
    return response.data.updates;
  } catch (error) {
    console.error('Error fetching contract updates:', error);
    return [];
  }
};