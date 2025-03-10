import { ethers } from 'ethers';
import ScepticSimpleABI from './abis/ScepticSimple.json';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const getContract = async (): Promise<ethers.Contract> => {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('No Ethereum wallet found. Please install MetaMask or similar wallet.');
  }
  
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(
    import.meta.env.VITE_CONTRACT_ADDRESS,
    ScepticSimpleABI,
    signer
  );
};

// Get the project name from the contract
export const getProjectName = async (): Promise<string> => {
  try {
    const contract = await getContract();
    return await contract.projectName();
  } catch (error) {
    console.error('Error getting project name:', error);
    throw error;
  }
};

// Update the project name (only owner can call this)
export const updateProjectName = async (newName: string): Promise<string> => {
  try {
    const contract = await getContract();
    const tx = await contract.updateName(newName);
    await tx.wait();
    return tx.hash;
  } catch (error) {
    console.error('Error updating project name:', error);
    throw error;
  }
};

// Get the contract owner address
export const getContractOwner = async (): Promise<string> => {
  try {
    const contract = await getContract();
    return await contract.owner();
  } catch (error) {
    console.error('Error getting contract owner:', error);
    throw error;
  }
};

// Check if the current wallet is the contract owner
export const isContractOwner = async (): Promise<boolean> => {
  try {
    const contract = await getContract();
    const owner = await contract.owner();
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    return owner.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Error checking if wallet is owner:', error);
    return false;
  }
}; 