import { ethers } from 'ethers';
import ScepticSimpleABI from './abis/ScepticSimple.json';

const getContract = async () => {
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(
    import.meta.env.VITE_CONTRACT_ADDRESS,
    ScepticSimpleABI.abi,
    signer
  );
};

// Örnek Kullanım
export const getProjectName = async () => {
  const contract = await getContract();
  return await contract.projectName();
};

export const updateProjectName = async (newName) => {
  const contract = await getContract();
  const tx = await contract.updateName(newName);
  await tx.wait();
}; 