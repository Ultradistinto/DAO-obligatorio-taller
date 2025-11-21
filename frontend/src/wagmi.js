import { getDefaultConfig } from '@rainbow-me/rainbowkit';
  import { defineChain } from 'viem';

  // Define chain customizado con ID 1337
  const hardhatLocal = defineChain({
    id: 1337,
    name: 'Hardhat Local',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['http://127.0.0.1:8545'] },
    },
  });

  export const config = getDefaultConfig({
    appName: 'Athenium',
    projectId: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
    chains: [hardhatLocal], // Usa custom chain con ID 1337
    ssr: false,
  });