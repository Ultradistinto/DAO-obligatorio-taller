import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { DAO_ADDRESS, TOKEN_ADDRESS, DAO_ABI, TOKEN_ABI } from './contracts/config';
import './App.css';

function App() {
  const { address, isConnected } = useAccount();
  const [ethAmount, setEthAmount] = useState('0.01');

  // Leer balance de tokens del usuario
  const { data: tokenBalance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
    query: {
      enabled: !!address,
    }
  });

  // Leer staking info del usuario
  const { data: stakeInfo } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'getStakeInfo',
    args: [address],
    query: {
      enabled: !!address,
    }
  });

  // Leer precio del token
  const { data: tokenPrice } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'tokenPrice',
  });

  // Comprar tokens
  const { data: hash, writeContract, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleBuyTokens = async () => {
    try {
      writeContract({
        address: DAO_ADDRESS,
        abi: DAO_ABI,
        functionName: 'buyTokens',
        value: parseEther(ethAmount),
      });
    } catch (error) {
      console.error('Error buying tokens:', error);
    }
  };

  return (
    <div className="App">
      <header>
        <h1>🏛️ DAO Governance System</h1>
        <ConnectButton />
      </header>

      {isConnected ? (
        <main>
          <section className="info-card">
            <h2>📊 Tu Balance</h2>
            <p>Address: {address}</p>
            <p>
              Tokens: {tokenBalance ? formatEther(tokenBalance) : '0'} DAOG
            </p>
            {stakeInfo && (
              <>
                <p>Staked para votar: {formatEther(stakeInfo.amountForVoting)} DAOG</p>
                <p>Staked para proponer: {formatEther(stakeInfo.amountForProposing)} DAOG</p>
              </>
            )}
          </section>

          <section className="buy-card">
            <h2>💰 Comprar Tokens</h2>
            <p>Precio: {tokenPrice ? formatEther(tokenPrice) : '...'} ETH por token</p>
            <div className="input-group">
              <input
                type="number"
                step="0.001"
                value={ethAmount}
                onChange={(e) => setEthAmount(e.target.value)}
                placeholder="Cantidad en ETH"
              />
              <span>ETH</span>
            </div>
            <p className="estimate">
              Recibirás aprox: {tokenPrice && ethAmount ?
                formatEther((parseEther(ethAmount) * parseEther('1')) / tokenPrice) : '0'
              } DAOG
            </p>
            <button
              onClick={handleBuyTokens}
              disabled={isPending || isConfirming}
            >
              {isPending ? 'Confirmando en wallet...' : isConfirming ? 'Comprando...' : 'Comprar Tokens'}
            </button>
            {isSuccess && <p className="success">✅ ¡Tokens comprados exitosamente!</p>}
          </section>
        </main>
      ) : (
        <main>
          <p>👆 Conecta tu wallet para empezar</p>
        </main>
      )}
    </div>
  );
}

export default App;