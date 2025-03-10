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
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

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
        setAddress(accounts[0]);
        localStorage.setItem('walletAddress', accounts[0]);
        
        // Get current chain
        const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        const currentChainId = parseInt(chainIdHex, 16);
        setChainId(currentChainId);
        
        closeModal();
        
        // Check if on Sonic Network and offer to switch if not
        if (networkInfo && currentChainId !== parseInt(networkInfo.network.chainId)) {
          toast.info('Your wallet is not connected to Sonic Network. Click to switch.', {
            action: {
              label: 'Switch',
              onClick: switchToSonicNetwork
            }
          });
        }
      }
      
      setIsConnecting(false);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setIsConnecting(false);
      toast.error('Failed to connect wallet. Please try again.');
    }
  };

  const switchToSonicNetwork = async () => {
    if (!window.ethereum || !networkInfo) return;
    
    const targetChainId = networkInfo.network.chainId;
    const chainIdHex = `0x${parseInt(targetChainId).toString(16)}`;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
      
      toast.success(`Switched to ${networkInfo.network.name}`);
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: chainIdHex,
                chainName: networkInfo.network.name,
                nativeCurrency: {
                  name: 'Sonic',
                  symbol: 'SONIC',
                  decimals: 18
                },
                rpcUrls: [networkInfo.network.rpcUrl],
                blockExplorerUrls: [`https://testnet.sonicscan.org`],
              },
            ],
          });
          toast.success(`Added and switched to ${networkInfo.network.name}`);
        } catch (addError) {
          console.error('Failed to add Sonic Network:', addError);
          toast.error('Failed to add Sonic Network. Please try adding it manually.');
        }
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
        networkInfo
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