import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'DAO Governance System',
  projectId: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  chains: [sepolia],
  ssr: false,
});