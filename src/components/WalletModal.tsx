import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, X, AlertCircle, Network, SwitchCamera } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { AnimatedButton } from './AnimatedButton';
import { LoadingSpinner } from './LoadingSpinner';

export function WalletModal() {
  const { 
    isModalOpen, 
    closeModal, 
    connect, 
    isConnecting, 
    networkInfo, 
    chainId,
    switchToSonicNetwork 
  } = useWallet();

  if (!isModalOpen) return null;

  const isOnSonicNetwork = networkInfo && chainId === parseInt(networkInfo.network.chainId);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold flex items-center">
              <Wallet className="w-5 h-5 mr-2 text-primary-200" />
              Connect Wallet
            </h2>
            <button 
              onClick={closeModal}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Connect your wallet to interact with the Sceptic AI platform and its smart contracts.
            </p>
            
            {networkInfo && (
              <div className="bg-secondary-100 p-4 rounded-lg mb-4">
                <h3 className="font-medium flex items-center mb-2">
                  <Network className="w-4 h-4 mr-2" />
                  Recommended Network
                </h3>
                <div className="text-sm">
                  <p><span className="font-semibold">Network:</span> {networkInfo.network.name}</p>
                  <p><span className="font-semibold">Chain ID:</span> {networkInfo.network.chainId}</p>
                  {chainId && !isOnSonicNetwork && (
                    <div className="mt-2">
                      <AnimatedButton
                        variant="secondary"
                        className="text-xs py-1 px-2"
                        onClick={switchToSonicNetwork}
                      >
                        <SwitchCamera className="w-3 h-3 mr-1" />
                        Switch Network
                      </AnimatedButton>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {!window.ethereum && (
              <div className="flex items-start bg-red-50 text-red-800 p-3 rounded-md mb-4">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">No wallet detected</p>
                  <p className="text-sm">Please install MetaMask or another Ethereum-compatible wallet to continue.</p>
                </div>
              </div>
            )}
          </div>

          <AnimatedButton
            onClick={connect}
            disabled={isConnecting || !window.ethereum}
            className="w-full justify-center"
          >
            {isConnecting ? (
              <>
                <LoadingSpinner />
                <span className="ml-2">Connecting...</span>
              </>
            ) : (
              'Connect MetaMask'
            )}
          </AnimatedButton>
          
          <div className="mt-4 text-center text-xs text-gray-500">
            By connecting your wallet, you agree to our Terms of Service and Privacy Policy.
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}