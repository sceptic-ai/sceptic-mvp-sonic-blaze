import React, { ReactElement } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { Network, AlertTriangle, Shield, Check } from 'lucide-react';
import { AnimatedButton } from './AnimatedButton';

export function NetworkInfo(): ReactElement {
  const { networkInfo, chainId, switchToSonicNetwork } = useWallet();
  
  if (!networkInfo) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-lg p-6 h-40"></div>
    );
  }
  
  const isOnCorrectNetwork = chainId === parseInt(networkInfo.network.chainId);
  
  return (
    <div className="bg-white rounded-lg p-6 shadow-md mb-6">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <Network className="w-5 h-5 mr-2 text-primary-200" />
        Network Status
      </h2>
      
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-600">Required Network:</span>
          <span className="font-medium">{networkInfo.network.name}</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-600">Chain ID:</span>
          <span className="font-medium">{networkInfo.network.chainId}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Connection Status:</span>
          {chainId ? (
            isOnCorrectNetwork ? (
              <span className="text-green-600 flex items-center">
                <Check className="w-4 h-4 mr-1" />
                Connected
              </span>
            ) : (
              <span className="text-yellow-600 flex items-center">
                <AlertTriangle className="w-4 h-4 mr-1" />
                Wrong Network
              </span>
            )
          ) : (
            <span className="text-red-600 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1" />
              Not Connected
            </span>
          )}
        </div>
      </div>
      
      {chainId && !isOnCorrectNetwork && (
        <AnimatedButton 
          onClick={switchToSonicNetwork}
          className="w-full mt-2"
        >
          <Shield className="w-4 h-4 mr-2" />
          Switch to {networkInfo.network.name}
        </AnimatedButton>
      )}
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <h3 className="font-medium mb-2">Smart Contracts</h3>
        <div className="space-y-2 text-sm">
          {Object.entries(networkInfo.contracts).map(([key, contract]) => (
            <div key={key} className="flex flex-col">
              <span className="font-medium text-primary-200">{contract.name}</span>
              <span className="font-mono text-xs truncate">{contract.address}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 