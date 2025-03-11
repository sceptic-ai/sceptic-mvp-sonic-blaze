import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { toast } from 'sonner';
import { getContractInfo, ContractInfo } from '../lib/api';

interface WalletContextType {
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  isModalOpen: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  openModal: () => void;
  closeModal: () => void;
  switchToSonicNetwork: () => Promise<void>;
  networkInfo: ContractInfo | null;
  signAnalysisRequest: (repoUrl: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const WELCOME_MESSAGE = `Welcome to Sceptic AI!

Please sign this message to verify your wallet ownership.
This signature will not trigger any blockchain transaction or cost any gas fees.

Nonce: ${Date.now()}`;

const SONIC_BLAZE_TESTNET = {
  chainId: "0xDECE", // 57054 in hex
  chainName: "Sonic Blaze Testnet",
  nativeCurrency: {
    name: "SONIC",
    symbol: "S",
    decimals: 18
  },
  rpcUrls: ["https://rpc.blaze.soniclabs.com"],
  blockExplorerUrls: ["https://testnet.sonicscan.org"]
};

const ANALYSIS_SIGN_MESSAGE = (repoUrl: string) => `
I authorize Sceptic AI to analyze the following repository:
${repoUrl}

This signature confirms your request to analyze the repository.
It will not trigger any blockchain transaction or cost any gas fees.

Timestamp: ${Date.now()}
`;

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<ContractInfo | null>(null);

  // Fetch contract and network information
  useEffect(() => {
    const fetchNetworkInfo = async () => {
      try {
        const info = await getContractInfo();
        setNetworkInfo(info);
      } catch (error) {
        console.error('Error fetching network info:', error);
      }
    };
    
    fetchNetworkInfo();
  }, []);

  // Check if wallet was previously connected
  useEffect(() => {
    const connectToStoredWallet = async () => {
      const storedAddress = localStorage.getItem('walletAddress');
      
      if (storedAddress && window.ethereum) {
        try {
          setIsConnecting(true);
          
          // Check if wallet is still connected
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          
          if (accounts && accounts.length > 0) {
            setAddress(accounts[0]);
            
            // Get current chain
            const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
            setChainId(parseInt(chainIdHex, 16));
          } else {
            // Clear stored wallet if no longer connected
            localStorage.removeItem('walletAddress');
          }
          
          setIsConnecting(false);
        } catch (error) {
          console.error('Failed to connect to stored wallet:', error);
          localStorage.removeItem('walletAddress');
          setIsConnecting(false);
        }
      }
    };
    
    connectToStoredWallet();
  }, []);

  // Set up event listeners for wallet
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      // User disconnected wallet
      setAddress(null);
      localStorage.removeItem('walletAddress');
      toast.error('Wallet disconnected');
    } else {
      // User switched account
      setAddress(accounts[0]);
      localStorage.setItem('walletAddress', accounts[0]);
    }
  };

  const handleChainChanged = (chainIdHex: string) => {
    setChainId(parseInt(chainIdHex, 16));
  };

  const connect = async () => {
    if (!window.ethereum) {
      toast.error('No Ethereum wallet found. Please install MetaMask or similar wallet.');
      return;
    }
    
    try {
      setIsConnecting(true);
      
      // Request accounts
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts && accounts.length > 0) {
        const userAddress = accounts[0];
        
        // Request signature
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const signature = await signer.signMessage(WELCOME_MESSAGE);
          
          // Verify signature
          const recoveredAddress = ethers.verifyMessage(WELCOME_MESSAGE, signature);
          
          if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
            throw new Error('Invalid signature');
          }
          
          // If signature is valid, proceed with connection
          setAddress(userAddress);
          localStorage.setItem('walletAddress', userAddress);
          
          // Get current chain
          const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
          const currentChainId = parseInt(chainIdHex, 16);
          setChainId(currentChainId);
          
          closeModal();
          
          toast.success('Wallet connected successfully!');
          
          // Automatically switch to Sonic network after successful connection
          if (currentChainId !== parseInt(SONIC_BLAZE_TESTNET.chainId, 16)) {
            await switchToSonicNetwork();
          }
        } catch (signError: any) {
          if (signError.code === 4001) {
            // User rejected signature
            toast.error('Please sign the message to connect your wallet');
          } else {
            console.error('Signature error:', signError);
            toast.error('Failed to verify wallet ownership');
          }
          setAddress(null);
          localStorage.removeItem('walletAddress');
        }
      }
      
      setIsConnecting(false);
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      if (error.code === 4001) {
        toast.error('Please approve the connection request in your wallet');
      } else {
        toast.error('Failed to connect wallet. Please try again.');
      }
      setIsConnecting(false);
    }
  };

  const switchToSonicNetwork = async () => {
    if (!window.ethereum) return;
    
    try {
      // Try to switch to Sonic network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SONIC_BLAZE_TESTNET.chainId }],
      });
      
      toast.success(`Switched to ${SONIC_BLAZE_TESTNET.chainName}`);
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902 || switchError.code === -32603) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [SONIC_BLAZE_TESTNET],
          });
          
          // After adding, try to switch again
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SONIC_BLAZE_TESTNET.chainId }],
          });
          
          toast.success(`Added and switched to ${SONIC_BLAZE_TESTNET.chainName}`);
        } catch (addError: any) {
          if (addError.code === 4001) {
            toast.error('Please approve adding Sonic Network in your wallet');
          } else {
            console.error('Failed to add Sonic Network:', addError);
            toast.error('Failed to add Sonic Network. Please try adding it manually.');
          }
        }
      } else if (switchError.code === 4001) {
        toast.error('Please approve the network switch in your wallet');
      } else {
        console.error('Failed to switch to Sonic Network:', switchError);
        toast.error('Failed to switch network. Please try manually.');
      }
    }
  };

  const disconnect = () => {
    setAddress(null);
    localStorage.removeItem('walletAddress');
    toast.success('Wallet disconnected');
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const signAnalysisRequest = async (repoUrl: string): Promise<string> => {
    if (!window.ethereum || !address) {
      throw new Error('Wallet not connected');
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(ANALYSIS_SIGN_MESSAGE(repoUrl));
      return signature;
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('User rejected signature request');
      }
      throw error;
    }
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        chainId,
        isConnecting,
        isModalOpen,
        connect,
        disconnect,
        openModal,
        closeModal,
        switchToSonicNetwork,
        networkInfo,
        signAnalysisRequest
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  
  return context;
}