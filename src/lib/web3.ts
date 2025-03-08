import { ethers } from 'ethers';
import { create } from 'zustand';

interface Web3Store {
  provider: ethers.Provider | null;
  signer: ethers.Signer | null;
  address: string | null;
  chainId: number | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const useWeb3Store = create<Web3Store>((set) => ({
  provider: null,
  signer: null,
  address: null,
  chainId: null,
  connect: async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);

        set({ provider, signer, address, chainId });
      } catch (error) {
        console.error('Error connecting to Web3:', error);
      }
    }
  },
  disconnect: () => {
    set({ provider: null, signer: null, address: null, chainId: null });
  },
}));