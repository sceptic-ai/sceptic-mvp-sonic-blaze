import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'sonner';

interface WalletContextType {
  address: string | null;
  chainId: number | null;
  isConnecting: boolean;
  isModalOpen: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  openModal: () => void;
  closeModal: () => void;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Check if we have a stored address
    const storedAddress = localStorage.getItem('walletAddress');
    if (storedAddress) {
      connectToStoredWallet();
    }

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const connectToStoredWallet = async () => {
    if (!window.ethereum) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      
      if (accounts.length > 0) {
        const network = await provider.getNetwork();
        setAddress(accounts[0].address);
        setChainId(Number(network.chainId));
      }
    } catch (error) {
      console.error('Error reconnecting wallet:', error);
      localStorage.removeItem('walletAddress');
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnect();
    } else {
      setAddress(accounts[0]);
      localStorage.setItem('walletAddress', accounts[0]);
    }
  };

  const handleChainChanged = (chainId: string) => {
    setChainId(Number(chainId));
  };

  const connect = async () => {
    if (!window.ethereum) {
      toast.error('Please install MetaMask to connect your wallet');
      return;
    }

    setIsConnecting(true);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const network = await provider.getNetwork();
      
      setAddress(accounts[0]);
      setChainId(Number(network.chainId));
      localStorage.setItem('walletAddress', accounts[0]);
      
      toast.success('Wallet connected successfully');
      closeModal();
    } catch (error) {
      console.error('Error connecting wallet:', error);
      toast.error('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setChainId(null);
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
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}