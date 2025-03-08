import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, X, AlertCircle } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { AnimatedButton } from './AnimatedButton';
import { LoadingSpinner } from './LoadingSpinner';

export function WalletModal() {
  const { isModalOpen, closeModal, connect, isConnecting } = useWallet();

  if (!isModalOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-secondary-50 rounded-xl shadow-xl w-full max-w-md mx-4"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-secondary-300">
            <h2 className="text-2xl font-bold text-primary-200">Connect Wallet</h2>
            <button
              onClick={closeModal}
              className="text-secondary-950 hover:text-primary-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {!window.ethereum ? (
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-primary-200 mx-auto mb-4" />
                <h3 className="text-lg font-bold mb-2">MetaMask Not Detected</h3>
                <p className="text-secondary-950 mb-4">
                  Please install MetaMask to connect your wallet and interact with the application.
                </p>
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary inline-flex items-center"
                >
                  <Wallet className="w-5 h-5 mr-2" />
                  Install MetaMask
                </a>
              </div>
            ) : (
              <div>
                <div className="text-center mb-6">
                  <Wallet className="w-12 h-12 text-primary-200 mx-auto mb-4" />
                  <h3 className="text-lg font-bold mb-2">Connect with MetaMask</h3>
                  <p className="text-secondary-950">
                    Connect your wallet to access all features of the platform.
                  </p>
                </div>

                <AnimatedButton
                  onClick={connect}
                  disabled={isConnecting}
                  className="w-full"
                >
                  {isConnecting ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner />
                      <span className="ml-2">Connecting...</span>
                    </div>
                  ) : (
                    <>
                      <Wallet className="w-5 h-5 mr-2" />
                      Connect Wallet
                    </>
                  )}
                </AnimatedButton>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}