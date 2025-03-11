import React, { ReactElement } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { Network, AlertTriangle, Shield, Check, ExternalLink } from 'lucide-react';
import { AnimatedButton } from './AnimatedButton';

export function NetworkInfo(): ReactElement {
  const { networkInfo, chainId, switchToSonicNetwork } = useWallet();
  
  if (!networkInfo) {
    return (
      <div className="animate-pulse bg-gray-900 rounded-lg p-6 h-40 border border-gray-800"></div>
    );
  }
  
  const isOnCorrectNetwork = chainId === parseInt(networkInfo.network.chainId);
  
  return (
    <div className="bg-gray-900 rounded-lg p-6 shadow-md border border-gray-800">
      <h2 className="text-xl font-semibold mb-4 flex items-center text-white">
        <Network className="w-5 h-5 mr-2 text-primary-200" />
        Network Status
      </h2>
      
      <div className="space-y-4">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Network:</span>
            <span className="font-medium text-gray-200">{networkInfo.network.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Chain ID:</span>
            <span className="font-medium text-gray-200">{networkInfo.network.chainId}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Symbol:</span>
            <span className="font-medium text-gray-200">{networkInfo.network.symbol}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Status:</span>
            {chainId ? (
              isOnCorrectNetwork ? (
                <span className="text-green-400 flex items-center">
                  <Check className="w-4 h-4 mr-1" />
                  Connected
                </span>
              ) : (
                <span className="text-yellow-400 flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Wrong Network
                </span>
              )
            ) : (
              <span className="text-red-400 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Not Connected
              </span>
            )}
          </div>
        </div>
        
        {chainId && !isOnCorrectNetwork && (
          <AnimatedButton 
            onClick={switchToSonicNetwork}
            className="w-full"
          >
            <Shield className="w-4 h-4 mr-2" />
            Switch to {networkInfo.network.name}
          </AnimatedButton>
        )}
        
        <div className="pt-4 border-t border-gray-800">
          <div className="flex flex-col space-y-2">
            <a
              href={networkInfo.network.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-200 hover:text-primary-300 flex items-center text-sm"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Block Explorer
            </a>
            <a
              href={networkInfo.network.faucetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-200 hover:text-primary-300 flex items-center text-sm"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Faucet
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 