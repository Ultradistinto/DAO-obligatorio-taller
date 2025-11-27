import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { LayoutDashboard, Settings, FileText, Vote, AlertTriangle, Lock, Coins, Copy, ExternalLink, CheckCircle, XCircle, Clock, Info, Wallet, DollarSign } from 'lucide-react';
import { DAO_ADDRESS, TOKEN_ADDRESS, DAO_ABI, TOKEN_ABI, MULTISIG_OWNER_ADDRESS, MULTISIG_PANIC_ADDRESS } from './contracts/config';
import addresses from './contracts/addresses.json';
import AdminPanel from './AdminPanel';
import MultisigPanel from './MultisigPanel';
import ProposalsPanel from './ProposalsPanel';
import PanicPanel from './PanicPanel';
import './App.css';

function App() {
  const { address, isConnected } = useAccount();
  const [ethAmount, setEthAmount] = useState('0.01');
  const [activeTab, setActiveTab] = useState('dashboard');

  const [stakeAmountVote, setStakeAmountVote] = useState('');
  const [stakeAmountPropose, setStakeAmountPropose] = useState('');
  const [unstakeAmountVote, setUnstakeAmountVote] = useState('');
  const [unstakeAmountPropose, setUnstakeAmountPropose] = useState('');
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));
  const [error, setError] = useState('');

  const { data: tokenBalance, refetch: refetchTokenBalance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
    query: {
      enabled: !!address,
    }
  });

  const { data: stakeInfo, refetch: refetchStakeInfo } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'getStakeInfo',
    args: [address],
    query: {
      enabled: !!address,
    }
  });

  const { data: tokenPrice } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'tokenPrice',
  });

  const { data: votingPower, refetch: refetchVotingPower } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'calculateVotingPower',
    args: [address],
    query: { enabled: !!address }
  });

  const { data: daoTokenBalance, refetch: refetchDaoTokenBalance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: [DAO_ADDRESS],
  });

  const { data: treasuryBalance, refetch: refetchTreasuryBalance } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'getTreasuryBalance',
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const votingLockedUntil = stakeInfo?.lockedUntilVoting ? Number(stakeInfo.lockedUntilVoting) : 0;
  const proposingLockedUntil = stakeInfo?.lockedUntilProposing ? Number(stakeInfo.lockedUntilProposing) : 0;
  const isVotingLocked = votingLockedUntil > currentTime;
  const isProposingLocked = proposingLockedUntil > currentTime;
  const votingTimeLeft = isVotingLocked ? votingLockedUntil - currentTime : 0;
  const proposingTimeLeft = isProposingLocked ? proposingLockedUntil - currentTime : 0;

  const { data: hash, writeContract, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleBuyTokens = async () => {
    try {
      setError('');

      const ethValue = parseEther(ethAmount);
      const tokensToReceive = (ethValue * parseEther('1')) / tokenPrice;

      if (daoTokenBalance < tokensToReceive) {
        const availableTokens = formatEther(daoTokenBalance);
        const requestedTokens = formatEther(tokensToReceive);
        setError(`⚠️ No hay suficientes tokens en el DAO. Disponibles: ${availableTokens} DAOG, Solicitados: ${requestedTokens} DAOG`);
        return;
      }

      writeContract({
        address: DAO_ADDRESS,
        abi: DAO_ABI,
        functionName: 'buyTokens',
        value: ethValue,
      });
    } catch (err) {
      console.error('Error buying tokens:', err);
      setError(`❌ Error: ${err.message || 'Error desconocido'}`);
    }
  };

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'allowance',
    args: [address, DAO_ADDRESS],
    query: { enabled: !!address }
  });

  useEffect(() => {
    if (isSuccess) {
      setError('');

      setEthAmount('0.01');
      setStakeAmountVote('');
      setStakeAmountPropose('');
      setUnstakeAmountVote('');
      setUnstakeAmountPropose('');

      refetchTokenBalance();
      refetchStakeInfo();
      refetchVotingPower();
      refetchAllowance();
      refetchDaoTokenBalance();
      refetchTreasuryBalance();
    }
  }, [isSuccess]);

  const handleStakeForVoting = async () => {
    try {
      setError('');
      if (!stakeAmountVote) return;
      const amount = parseEther(stakeAmountVote);

      if (!tokenBalance || tokenBalance < amount) {
        const available = tokenBalance ? formatEther(tokenBalance) : '0';
        setError(`⚠️ No tienes suficientes tokens. Disponibles: ${available} DAOG, Necesitas: ${stakeAmountVote} DAOG`);
        return;
      }

      if (!allowance || allowance < amount) {
        writeContract({
          address: TOKEN_ADDRESS,
          abi: TOKEN_ABI,
          functionName: 'approve',
          args: [DAO_ADDRESS, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
        });
        return;
      }

      writeContract({
        address: DAO_ADDRESS,
        abi: DAO_ABI,
        functionName: 'stakeForVoting',
        args: [amount],
      });
    } catch (err) {
      console.error('Error staking for voting:', err);
      setError(`❌ Error: ${err.message || 'Error desconocido'}`);
    }
  };

  const handleStakeForProposing = async () => {
    try {
      setError('');
      if (!stakeAmountPropose) return;
      const amount = parseEther(stakeAmountPropose);

      if (!tokenBalance || tokenBalance < amount) {
        const available = tokenBalance ? formatEther(tokenBalance) : '0';
        setError(`⚠️ No tienes suficientes tokens. Disponibles: ${available} DAOG, Necesitas: ${stakeAmountPropose} DAOG`);
        return;
      }

      if (!allowance || allowance < amount) {
        writeContract({
          address: TOKEN_ADDRESS,
          abi: TOKEN_ABI,
          functionName: 'approve',
          args: [DAO_ADDRESS, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
        });
        return;
      }

      writeContract({
        address: DAO_ADDRESS,
        abi: DAO_ABI,
        functionName: 'stakeForProposing',
        args: [amount],
      });
    } catch (err) {
      console.error('Error staking for proposing:', err);
      setError(`❌ Error: ${err.message || 'Error desconocido'}`);
    }
  };

  const handleUnstakeFromVoting = () => {
    try {
      setError('');
      if (!unstakeAmountVote) return;
      const amount = parseEther(unstakeAmountVote);

      if (!stakeInfo || stakeInfo.amountForVoting < amount) {
        const staked = stakeInfo ? formatEther(stakeInfo.amountForVoting) : '0';
        setError(`⚠️ No tienes suficiente stake. Stakeado: ${staked} DAOG, Intentas unstakear: ${unstakeAmountVote} DAOG`);
        return;
      }

      writeContract({
        address: DAO_ADDRESS,
        abi: DAO_ABI,
        functionName: 'unstakeFromVoting',
        args: [amount],
      });
    } catch (err) {
      console.error('Error unstaking from voting:', err);
      setError(`❌ Error: ${err.message || 'Error desconocido'}`);
    }
  };

  const handleUnstakeFromProposing = () => {
    try {
      setError('');
      if (!unstakeAmountPropose) return;
      const amount = parseEther(unstakeAmountPropose);

      if (!stakeInfo || stakeInfo.amountForProposing < amount) {
        const staked = stakeInfo ? formatEther(stakeInfo.amountForProposing) : '0';
        setError(`⚠️ No tienes suficiente stake. Stakeado: ${staked} DAOG, Intentas unstakear: ${unstakeAmountPropose} DAOG`);
        return;
      }

      writeContract({
        address: DAO_ADDRESS,
        abi: DAO_ABI,
        functionName: 'unstakeFromProposing',
        args: [amount],
      });
    } catch (err) {
      console.error('Error unstaking from proposing:', err);
      setError(`❌ Error: ${err.message || 'Error desconocido'}`);
    }
  };

  const formatTimeLeft = (seconds) => {
    if (seconds <= 0) return '';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    alert(`✅ ${label} copiada al portapapeles!`);
  };

  return (
    <div className="App">
      <header>
        <h1>DAO Governance System</h1>
        <ConnectButton />
      </header>

      <nav className="tabs">
        <button
          className={activeTab === 'dashboard' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('dashboard')}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>
        <button
          className={activeTab === 'admin' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('admin')}
        >
          <Settings size={18} />
          <span>Admin</span>
        </button>
        <button
          className={activeTab === 'multisig' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('multisig')}
        >
          <FileText size={18} />
          <span>Multisig</span>
        </button>
        <button
          className={activeTab === 'proposals' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('proposals')}
        >
          <Vote size={18} />
          <span>Propuestas</span>
        </button>
        <button
          className={activeTab === 'panic' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('panic')}
        >
          <AlertTriangle size={18} />
          <span>Pánico</span>
        </button>
      </nav>

      <main>
        {activeTab === 'dashboard' && (
          <>
            <section className="info-card">
              <h2><Coins size={24} className="section-icon" /> Tu Balance</h2>
              {isConnected ? (
                <>
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
                  <div style={{
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '2px solid #e0e0e0'
                  }}>
                    <p style={{
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      color: '#ff8f00',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <DollarSign size={20} /> Treasury del DAO: {treasuryBalance ? formatEther(treasuryBalance) : '0'} ETH
                    </p>
                  </div>
                </>
              ) : (
                <p className="connect-message"><Wallet size={16} /> Conecta tu wallet para ver tu balance</p>
              )}
            </section>

            <section className="info-card">
              <h2><FileText size={24} className="section-icon" /> Direcciones de Contratos</h2>
              <div className="contract-addresses">
                <div className="contract-item">
                  <div className="contract-info">
                    <span className="contract-label">DAO Contract</span>
                    <div className="contract-address">{DAO_ADDRESS}</div>
                  </div>
                  <div className="contract-actions">
                    <button
                      className="icon-button"
                      onClick={() => copyToClipboard(DAO_ADDRESS, 'Dirección del DAO')}
                      title="Copiar dirección"
                    >
                      <Copy size={16} />
                    </button>
                    <a
                      className="etherscan-link"
                      href={addresses.explorerUrls.dao}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Ver en Etherscan"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>

                <div className="contract-item">
                  <div className="contract-info">
                    <span className="contract-label">Token (DAOG)</span>
                    <div className="contract-address">{TOKEN_ADDRESS}</div>
                  </div>
                  <div className="contract-actions">
                    <button
                      className="icon-button"
                      onClick={() => copyToClipboard(TOKEN_ADDRESS, 'Dirección del Token')}
                      title="Copiar dirección"
                    >
                      <Copy size={16} />
                    </button>
                    <a
                      className="etherscan-link"
                      href={addresses.explorerUrls.token}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Ver en Etherscan"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>

                <div className="contract-item">
                  <div className="contract-info">
                    <span className="contract-label">Multisig Owner</span>
                    <div className="contract-address">{MULTISIG_OWNER_ADDRESS}</div>
                  </div>
                  <div className="contract-actions">
                    <button
                      className="icon-button"
                      onClick={() => copyToClipboard(MULTISIG_OWNER_ADDRESS, 'Dirección Multisig Owner')}
                      title="Copiar dirección"
                    >
                      <Copy size={16} />
                    </button>
                    <a
                      className="etherscan-link"
                      href={addresses.explorerUrls.multisigOwner}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Ver en Etherscan"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>

                <div className="contract-item">
                  <div className="contract-info">
                    <span className="contract-label">Multisig Panic</span>
                    <div className="contract-address">{MULTISIG_PANIC_ADDRESS}</div>
                  </div>
                  <div className="contract-actions">
                    <button
                      className="icon-button"
                      onClick={() => copyToClipboard(MULTISIG_PANIC_ADDRESS, 'Dirección Multisig Panic')}
                      title="Copiar dirección"
                    >
                      <Copy size={16} />
                    </button>
                    <a
                      className="etherscan-link"
                      href={addresses.explorerUrls.multisigPanic}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Ver en Etherscan"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
              </div>
            </section>

            <section className="buy-card">
              <h2><Coins size={24} className="section-icon" /> Comprar Tokens</h2>
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
              {!isConnected && (
                <p className="warning-message">⚠️ Necesitas conectar tu wallet para comprar tokens</p>
              )}
              <button
                onClick={handleBuyTokens}
                disabled={isPending || isConfirming || !isConnected}
              >
                {!isConnected ? 'Conecta tu wallet' : isPending ? 'Confirmando en wallet...' : isConfirming ? 'Comprando...' : 'Comprar Tokens'}
              </button>
              {isSuccess && <p className="success">✅ ¡Tokens comprados exitosamente!</p>}
            </section>

            <section className="staking-card">
              <h2><Lock size={24} className="section-icon" /> Staking</h2>
              {isConnected ? (
                <>
                  <div className="staking-info">
                    <p><strong>Staked para votar:</strong> {stakeInfo ? formatEther(stakeInfo.amountForVoting) : '0'} DAOG</p>
                    <p><strong>Staked para proponer:</strong> {stakeInfo ? formatEther(stakeInfo.amountForProposing) : '0'} DAOG</p>
                    <p><strong>Voting Power:</strong> {votingPower ? votingPower.toString() : '0'} VP</p>
                  </div>

                  <div className="staking-section">
                    <h3>Stakear para Votar</h3>
                    <div className="input-group">
                      <input
                        type="number"
                        placeholder="Cantidad de tokens"
                        value={stakeAmountVote}
                        onChange={(e) => setStakeAmountVote(e.target.value)}
                      />
                    </div>
                    <button onClick={handleStakeForVoting} disabled={isPending || isConfirming}>
                      {isPending ? 'Confirmando...' : isConfirming ? 'Procesando...' : 'Stakear'}
                    </button>
                    {stakeAmountVote && allowance && allowance < parseEther(stakeAmountVote) && (
                      <p className="info-message">ℹ️ Primera vez: necesitarás aprobar y luego stakear (2 transacciones)</p>
                    )}
                  </div>

                  <div className="staking-section">
                    <h3>Stakear para Proponer</h3>
                    <div className="input-group">
                      <input
                        type="number"
                        placeholder="Cantidad de tokens"
                        value={stakeAmountPropose}
                        onChange={(e) => setStakeAmountPropose(e.target.value)}
                      />
                    </div>
                    <button onClick={handleStakeForProposing} disabled={isPending || isConfirming}>
                      {isPending ? 'Confirmando...' : isConfirming ? 'Procesando...' : 'Stakear'}
                    </button>
                    {stakeAmountPropose && allowance && allowance < parseEther(stakeAmountPropose) && (
                      <p className="info-message">ℹ️ Primera vez: necesitarás aprobar y luego stakear (2 transacciones)</p>
                    )}
                  </div>

                  <div className="staking-section">
                    <h3>Unstakear de Votación</h3>
                    <div className="input-group">
                      <input
                        type="number"
                        placeholder="Cantidad de tokens"
                        value={unstakeAmountVote}
                        onChange={(e) => setUnstakeAmountVote(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={handleUnstakeFromVoting}
                      disabled={isPending || isConfirming || isVotingLocked}
                    >
                      {isVotingLocked ? `Bloqueado (${formatTimeLeft(votingTimeLeft)})` : 'Unstakear'}
                    </button>
                    {isVotingLocked && (
                      <p className="warning-message">⏳ Debes esperar {formatTimeLeft(votingTimeLeft)} para unstakear (lock time: 5 min)</p>
                    )}
                  </div>

                  <div className="staking-section">
                    <h3>Unstakear de Propuestas</h3>
                    <div className="input-group">
                      <input
                        type="number"
                        placeholder="Cantidad de tokens"
                        value={unstakeAmountPropose}
                        onChange={(e) => setUnstakeAmountPropose(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={handleUnstakeFromProposing}
                      disabled={isPending || isConfirming || isProposingLocked}
                    >
                      {isProposingLocked ? `Bloqueado (${formatTimeLeft(proposingTimeLeft)})` : 'Unstakear'}
                    </button>
                    {isProposingLocked && (
                      <p className="warning-message">⏳ Debes esperar {formatTimeLeft(proposingTimeLeft)} para unstakear (lock time: 5 min)</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="connect-message"><Wallet size={16} /> Conecta tu wallet para stakear</p>
              )}
            </section>
          </>
        )}
        {activeTab === 'admin' && <AdminPanel />}
        {activeTab === 'multisig' && <MultisigPanel />}
        {activeTab === 'proposals' && <ProposalsPanel />}
        {activeTab === 'panic' && <PanicPanel />}
      </main>

      {/* Mensajes flotantes globales */}
      {error && (
        <div className="alert-box error-alert">
          <span className="alert-icon"><XCircle size={24} /></span>
          <span className="alert-text">{error}</span>
          <button className="alert-close" onClick={() => setError('')}>✕</button>
        </div>
      )}
      {isSuccess && (
        <div className="alert-box success-alert">
          <span className="alert-icon"><CheckCircle size={24} /></span>
          <span className="alert-text">¡Transacción exitosa!</span>
        </div>
      )}
      {isPending && (
        <div className="alert-box pending-alert">
          <span className="alert-icon"><Clock size={24} /></span>
          <span className="alert-text">Esperando confirmación en wallet...</span>
        </div>
      )}
      {isConfirming && (
        <div className="alert-box confirming-alert">
          <span className="alert-icon"><Clock size={24} /></span>
          <span className="alert-text">Procesando transacción...</span>
        </div>
      )}
    </div>
  );
}

export default App;