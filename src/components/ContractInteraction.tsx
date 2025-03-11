import React, { useState, useEffect } from 'react';
import { getProjectName, updateProjectName, getContractOwner, isContractOwner } from '../utils/contract';
import { AnimatedButton } from './AnimatedButton';
import { useWallet } from '../contexts/WalletContext';
import { toast } from 'sonner';
import { updateContractProjectName, getContractInfo } from '../lib/api';

// Export types for TypeScript
export interface ContractInteractionProps {}

export const ContractInteraction: React.FC<ContractInteractionProps> = () => {
  const [projectName, setProjectName] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [ownerAddress, setOwnerAddress] = useState<string>('');
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const { address } = useWallet();

  useEffect(() => {
    if (address) {
      loadContractData();
    }
  }, [address]);

  const loadContractData = async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Get the project name from the contract
      const name = await getProjectName().catch(error => {
        console.warn('Error getting project name:', error);
        return 'Unnamed Project';
      });
      setProjectName(name);
      
      // Get the contract owner address
      const owner = await getContractOwner().catch(error => {
        console.warn('Error getting contract owner:', error);
        return null;
      });
      if (owner) {
        setOwnerAddress(owner);
      }
      
      // Check if the current wallet is the owner
      if (address && owner) {
        const ownerStatus = await isContractOwner().catch(() => false);
        setIsOwner(ownerStatus);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading contract data:', error);
      toast.error('Error loading contract data. Please check your wallet connection.');
      setLoading(false);
    }
  };

  const syncWithBackend = async (_projectName: string, txHash: string): Promise<void> => {
    try {
      const networkInfo = await getContractInfo();
      const network = networkInfo?.network?.name || 'Sonic Network';
      
      await updateContractProjectName(
        import.meta.env.VITE_CONTRACT_ADDRESS,
        'simple',
        network,
        txHash
      );
      
      toast.success('Contract update synchronized with backend');
    } catch (error) {
      console.error('Backend sync error:', error);
      toast.error('Failed to synchronize with backend');
    }
  };

  const handleUpdateName = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    if (!newName.trim()) {
      toast.error('Please enter a valid project name');
      return;
    }
    
    try {
      setLoading(true);
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
      
      setLoading(false);
    } catch (error: any) {
      console.error('Error updating project name:', error);
      
      // Check if it's an ownership error
      if (error.message && error.message.includes('Only owner')) {
        toast.error('Only the contract owner can update the project name');
      } else {
        toast.error('Error updating project name. Please try again.');
      }
      
      setLoading(false);
    }
  };

  if (!address) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 shadow-md border border-gray-800">
        <h2 className="text-xl font-semibold mb-4 text-white">Contract Interaction</h2>
        <p className="text-gray-400 mb-4">Connect your wallet to interact with the ScepticSimple contract.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6 shadow-md border border-gray-800">
      <h2 className="text-xl font-semibold mb-4 text-white">Contract Interaction</h2>
      
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-200"></div>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <h3 className="font-medium text-gray-300 mb-2">Current Project Name:</h3>
            <p className="text-2xl font-semibold text-primary-200">{projectName || 'Loading...'}</p>
          </div>
          
          <div className="mb-6">
            <h3 className="font-medium text-gray-300 mb-2">Contract Owner:</h3>
            <p className="font-mono text-sm text-gray-400">{ownerAddress || 'Loading...'}</p>
            {isOwner && (
              <span className="inline-block mt-2 bg-green-900 text-green-200 text-xs px-2 py-1 rounded">
                You are the owner
              </span>
            )}
          </div>
          
          {isOwner && (
            <form onSubmit={handleUpdateName} className="mt-6">
              <h3 className="font-medium text-gray-300 mb-2">Update Project Name:</h3>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter new project name"
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
                <AnimatedButton type="submit" disabled={loading}>
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
}; 