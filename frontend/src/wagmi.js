import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import { http } from 'viem';

export const config = getDefaultConfig({
  appName: 'DAO Governance System',
  projectId: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(import.meta.env.VITE_SEPOLIA_RPC_URL),
  },
  ssr: false,
});