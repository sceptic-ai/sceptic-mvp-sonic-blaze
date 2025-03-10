import React, { useState, useEffect, ReactElement } from 'react';
import { getProjectName, updateProjectName, getContractOwner, isContractOwner } from '../utils/contract';
import { AnimatedButton } from './AnimatedButton';
import { useWallet } from '../contexts/WalletContext';
import { toast } from 'sonner';
import { updateContractProjectName } from '../lib/api';

// Export types for TypeScript
export interface ContractInteractionProps {}

export function ContractInteraction(): ReactElement {
  const [projectName, setProjectName] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [ownerAddress, setOwnerAddress] = useState<string>('');
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { address } = useWallet();

  useEffect(() => {
    if (address) {
      loadContractData();
    }
  }, [address]);

  const loadContractData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Get the project name from the contract
      const name = await getProjectName();
      setProjectName(name);
      
      // Get the contract owner address
      const owner = await getContractOwner();
      setOwnerAddress(owner);
      
      // Check if the current wallet is the owner
      const ownerStatus = await isContractOwner();
      setIsOwner(ownerStatus);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading contract data:', error);
      toast.error('Error loading contract data. Make sure your wallet is connected and on the correct network.');
      setIsLoading(false);
    }
  };

  const syncWithBackend = async (projectName: string, txHash: string): Promise<void> => {
    try {
      if (!import.meta.env.VITE_CONTRACT_ADDRESS) {
        console.warn('Contract address not found in environment variables');
        return;
      }
      
      await updateContractProjectName(
        import.meta.env.VITE_CONTRACT_ADDRESS as string,
        projectName,
        txHash
      );
      
      console.log('Contract information synchronized with backend');
    } catch (error) {
      console.error('Failed to sync with backend:', error);
      // Don't show error to user as this is a background sync
    }
  };

  const handleUpdateName = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!newName.trim()) {
      toast.error('Please enter a valid project name');
      return;
    }
    
    try {
      setIsLoading(true);
      const txHash = await updateProjectName(newName);
      
      toast.success(
        <div>
          <p>Project name updated successfully!</p>
          <p className="text-xs mt-1">
            Transaction: {txHash.slice(0, 8)}...{txHash.slice(-6)}
          </p>
        </div>
      );
      
      // Update the displayed project name
      setProjectName(newName);
      setNewName('');
      
      // Sync with backend
      await syncWithBackend(newName, txHash);
      
      setIsLoading(false);
    } catch (error: any) {
      console.error('Error updating project name:', error);
      
      // Check if it's an ownership error
      if (error.message && error.message.includes('Only owner')) {
        toast.error('Only the contract owner can update the project name');
      } else {
        toast.error('Error updating project name. Check console for details.');
      }
      
      setIsLoading(false);
    }
  };

  if (!address) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-semibold mb-4">Contract Interaction</h2>
        <p className="text-gray-600 mb-4">Connect your wallet to interact with the ScepticSimple contract.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-md">
      <h2 className="text-xl font-semibold mb-4">Contract Interaction</h2>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-200"></div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h3 className="font-medium text-gray-700 mb-2">Current Project Name:</h3>
            <p className="text-2xl font-semibold text-primary-200">{projectName}</p>
          </div>
          
          <div className="mb-6">
            <h3 className="font-medium text-gray-700 mb-2">Contract Owner:</h3>
            <p className="font-mono text-sm">{ownerAddress}</p>
            {isOwner && (
              <span className="inline-block mt-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                You are the owner
              </span>
            )}
          </div>
          
          {isOwner && (
            <form onSubmit={handleUpdateName} className="mt-6">
              <h3 className="font-medium text-gray-700 mb-2">Update Project Name:</h3>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter new project name"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
                <AnimatedButton type="submit" disabled={isLoading}>
                  Update
                </AnimatedButton>
              </div>
            </form>
          )}
          
          <div className="mt-6">
            <p className="text-sm text-gray-500">
              The ScepticSimple contract allows only the owner to update the project name.
            </p>
          </div>
        </>
      )}
    </div>
  );
} 