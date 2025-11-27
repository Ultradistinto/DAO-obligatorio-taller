import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, encodeFunctionData, isAddress } from 'viem';
import { DAO_ADDRESS, TOKEN_ADDRESS, DAO_ABI, TOKEN_ABI, MULTISIG_OWNER_ADDRESS, MULTISIG_ABI } from './contracts/config';
import './AdminPanel.css';

function AdminPanel() {
  const { address } = useAccount();
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Estados para inputs
  const [mintTo, setMintTo] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [newOwnerAddress, setNewOwnerAddress] = useState('');
  const [newTokenPrice, setNewTokenPrice] = useState('');
  const [newMinStakeVote, setNewMinStakeVote] = useState('');
  const [newMinStakePropose, setNewMinStakePropose] = useState('');
  const [newStakingLockTime, setNewStakingLockTime] = useState('');
  const [newProposalDuration, setNewProposalDuration] = useState('');
  const [newTokensPerVP, setNewTokensPerVP] = useState('');

  // Leer parámetros actuales de la DAO
  const { data: tokenPrice } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'tokenPrice',
  });

  const { data: minStakeToVote } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'minStakeToVote',
  });

  const { data: minStakeToPropose } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'minStakeToPropose',
  });

  const { data: isPaused } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'isPaused',
  });

  const { data: stakingLockTime } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'stakingLockTime',
  });

  const { data: proposalDuration } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'proposalDuration',
  });

  const { data: tokensPerVotingPower } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'tokensPerVotingPower',
  });

  const { data: daoTokenBalance } = useReadContract({
    address: TOKEN_ADDRESS,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: [DAO_ADDRESS],
  });

  // Leer owners del multisig Owner
  const { data: multisigOwnerOwners } = useReadContract({
    address: MULTISIG_OWNER_ADDRESS,
    abi: MULTISIG_ABI,
    functionName: 'owners',
  });

  // Verificar si el usuario es owner del multisig owner
  const isOwnerMultisig = multisigOwnerOwners?.some(owner =>
    owner.toLowerCase() === address?.toLowerCase()
  );

  // ============ FUNCIONES DE MULTISIG OWNER ============

  const handleMintTokens = async () => {
    if (!mintTo || !mintAmount) return;

    // Codificar la llamada a mintTokens del DAO
    const mintData = encodeFunctionData({
      abi: DAO_ABI,
      functionName: 'mintTokens',
      args: [mintTo, parseEther(mintAmount)],
    });

    // Proponer transacción en el multisig
    writeContract({
      address: MULTISIG_OWNER_ADDRESS,
      abi: MULTISIG_ABI,
      functionName: 'submitTransaction',
      args: [DAO_ADDRESS, 0n, mintData],
    });

    // Nota: El usuario tendrá que confirmar manualmente en una segunda transacción
    // o podemos agregar auto-confirmación después
  };

  const handleUpdateTokenPrice = async () => {
    if (!newTokenPrice) return;

    const updateData = encodeFunctionData({
      abi: DAO_ABI,
      functionName: 'updateTokenPrice',
      args: [parseEther(newTokenPrice)],
    });

    writeContract({
      address: MULTISIG_OWNER_ADDRESS,
      abi: MULTISIG_ABI,
      functionName: 'submitTransaction',
      args: [DAO_ADDRESS, 0n, updateData],
    });
  };

  const handleUpdateMinStakeVote = async () => {
    if (!newMinStakeVote) return;

    const updateData = encodeFunctionData({
      abi: DAO_ABI,
      functionName: 'updateMinStakeToVote',
      args: [parseEther(newMinStakeVote)],
    });

    writeContract({
      address: MULTISIG_OWNER_ADDRESS,
      abi: MULTISIG_ABI,
      functionName: 'submitTransaction',
      args: [DAO_ADDRESS, 0n, updateData],
    });
  };

  const handleUpdateMinStakePropose = async () => {
    if (!newMinStakePropose) return;

    const updateData = encodeFunctionData({
      abi: DAO_ABI,
      functionName: 'updateMinStakeToPropose',
      args: [parseEther(newMinStakePropose)],
    });

    writeContract({
      address: MULTISIG_OWNER_ADDRESS,
      abi: MULTISIG_ABI,
      functionName: 'submitTransaction',
      args: [DAO_ADDRESS, 0n, updateData],
    });
  };

  const handleUpdateStakingLockTime = async () => {
    if (!newStakingLockTime) return;

    const updateData = encodeFunctionData({
      abi: DAO_ABI,
      functionName: 'updateStakingLockTime',
      args: [BigInt(newStakingLockTime)], // En segundos
    });

    writeContract({
      address: MULTISIG_OWNER_ADDRESS,
      abi: MULTISIG_ABI,
      functionName: 'submitTransaction',
      args: [DAO_ADDRESS, 0n, updateData],
    });
  };

  const handleUpdateProposalDuration = async () => {
    if (!newProposalDuration) return;

    const updateData = encodeFunctionData({
      abi: DAO_ABI,
      functionName: 'updateProposalDuration',
      args: [BigInt(newProposalDuration)], // En segundos
    });

    writeContract({
      address: MULTISIG_OWNER_ADDRESS,
      abi: MULTISIG_ABI,
      functionName: 'submitTransaction',
      args: [DAO_ADDRESS, 0n, updateData],
    });
  };

  const handleUpdateTokensPerVP = async () => {
    if (!newTokensPerVP) return;

    const updateData = encodeFunctionData({
      abi: DAO_ABI,
      functionName: 'updateTokensPerVotingPower',
      args: [parseEther(newTokensPerVP)],
    });
    

    writeContract({
      address: MULTISIG_OWNER_ADDRESS,
      abi: MULTISIG_ABI,
      functionName: 'submitTransaction',
      args: [DAO_ADDRESS, 0n, updateData],
    });
  };

  const handleTransferOwnership = async () => {
    if (!newOwnerAddress || !isAddress(newOwnerAddress)) return;

    const transferData = encodeFunctionData({
      abi: DAO_ABI,
      functionName: 'transferOwnership',
      args: [newOwnerAddress],
    });

    writeContract({
      address: MULTISIG_OWNER_ADDRESS,
      abi: MULTISIG_ABI,
      functionName: 'submitTransaction',
      args: [DAO_ADDRESS, 0n, transferData],
    });
  };

  return (
    <div className="admin-panel">
      <h2>⚙️ Panel de Administración</h2>

      {/* ESTADO DE LA DAO */}
      <section className="admin-section status-section">
        <h3>📊 Estado de la DAO</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">Estado:</span>
            <span className={isPaused ? "status-paused" : "status-active"}>
              {isPaused ? '🔴 PAUSADA' : '🟢 ACTIVA'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Precio del token:</span>
            <span>{tokenPrice ? formatEther(tokenPrice) : '...'} ETH</span>
          </div>
          <div className="status-item">
            <span className="status-label">Min stake para votar:</span>
            <span>{minStakeToVote ? formatEther(minStakeToVote) : '...'} DAOG</span>
          </div>
          <div className="status-item">
            <span className="status-label">Min stake para proponer:</span>
            <span>{minStakeToPropose ? formatEther(minStakeToPropose) : '...'} DAOG</span>
          </div>
          <div className="status-item">
            <span className="status-label">Balance del DAO:</span>
            <span>{daoTokenBalance ? formatEther(daoTokenBalance) : '...'} DAOG</span>
          </div>
          <div className="status-item">
            <span className="status-label">Staking Lock Time:</span>
            <span>{stakingLockTime ? Number(stakingLockTime) : '...'} segundos</span>
          </div>
          <div className="status-item">
            <span className="status-label">Duración de propuestas:</span>
            <span>{proposalDuration ? Number(proposalDuration) : '...'} segundos</span>
          </div>
          <div className="status-item">
            <span className="status-label">Tokens por Voting Power:</span>
            <span>{tokensPerVotingPower ? formatEther(tokensPerVotingPower) : '...'} DAOG</span>
          </div>
        </div>
      </section>

      {/* MULTISIG OWNER */}
      <section className="admin-section">
        <h3>🏛️ Funciones del Owner (Multisig: {MULTISIG_OWNER_ADDRESS.slice(0, 6)}...)</h3>
        <p className="section-note">
          {isOwnerMultisig ? (
            <span className="owner-badge">✅ Eres owner de este multisig - Puedes proponer transacciones</span>
          ) : (
            <span className="not-owner-badge">❌ No eres owner de este multisig</span>
          )}
        </p>

        <div className="admin-action">
          <h4>Mintear Tokens</h4>
          <input
            type="text"
            placeholder="Address destino"
            value={mintTo}
            onChange={(e) => setMintTo(e.target.value)}
          />
          <input
            type="number"
            placeholder="Cantidad de tokens"
            value={mintAmount}
            onChange={(e) => setMintAmount(e.target.value)}
          />
          <button onClick={handleMintTokens} disabled={isPending || isConfirming}>
            {isPending ? 'Confirmando...' : isConfirming ? 'Minteando...' : 'Mintear'}
          </button>
        </div>

        <div className="admin-action">
          <h4>Cambiar Precio del Token</h4>
          <input
            type="number"
            step="0.0001"
            placeholder="Nuevo precio en ETH"
            value={newTokenPrice}
            onChange={(e) => setNewTokenPrice(e.target.value)}
          />
          <button onClick={handleUpdateTokenPrice} disabled={isPending || isConfirming}>
            Actualizar Precio
          </button>
        </div>

        <div className="admin-action">
          <h4>Cambiar Mínimo de Stake para Votar</h4>
          <input
            type="number"
            placeholder="Nueva cantidad de tokens"
            value={newMinStakeVote}
            onChange={(e) => setNewMinStakeVote(e.target.value)}
          />
          <button onClick={handleUpdateMinStakeVote} disabled={isPending || isConfirming}>
            Actualizar
          </button>
        </div>

        <div className="admin-action">
          <h4>Cambiar Mínimo de Stake para Proponer</h4>
          <input
            type="number"
            placeholder="Nueva cantidad de tokens"
            value={newMinStakePropose}
            onChange={(e) => setNewMinStakePropose(e.target.value)}
          />
          <button onClick={handleUpdateMinStakePropose} disabled={isPending || isConfirming}>
            Actualizar
          </button>
        </div>
        <div className="admin-action">
          <h4>Cambiar Tiempo de Bloqueo del Staking</h4>
          <input
            type="number"
            placeholder="Segundos (ej: 300 = 5 minutos)"
            value={newStakingLockTime}
            onChange={(e) => setNewStakingLockTime(e.target.value)}
          />
          <button onClick={handleUpdateStakingLockTime} disabled={isPending || isConfirming}>
            Actualizar Lock Time
          </button>
        </div>

        <div className="admin-action">
          <h4>Cambiar Duración de Propuestas</h4>
          <input
            type="number"
            placeholder="Segundos (ej: 86400 = 1 día)"
            value={newProposalDuration}
            onChange={(e) => setNewProposalDuration(e.target.value)}
          />
          <button onClick={handleUpdateProposalDuration} disabled={isPending || isConfirming}>
            Actualizar Duración
          </button>
        </div>

        <div className="admin-action">
          <h4>Cambiar Tokens por Voting Power</h4>
          <input
            type="number"
            placeholder="Cantidad de tokens = 1 VP"
            value={newTokensPerVP}
            onChange={(e) => setNewTokensPerVP(e.target.value)}
          />
          <button onClick={handleUpdateTokensPerVP} disabled={isPending || isConfirming}>
            Actualizar Tokens/VP
          </button>
        </div>

      <div className="admin-action" style={{borderTop: '2px solid #e74c3c', paddingTop: '16px', marginTop: '16px'}}>
        <h4 style={{color: '#e74c3c'}}>⚠️ Transferir Ownership del DAO</h4>
        <input
          type="text"
          placeholder="Nueva dirección owner (debe ser multisig)"
          value={newOwnerAddress}
          onChange={(e) => setNewOwnerAddress(e.target.value)}
        />
        <button
          onClick={handleTransferOwnership}
          disabled={isPending || isConfirming || !isAddress(newOwnerAddress)}
          style={{background: '#e74c3c'}}
        >
          Transferir Ownership
        </button>
        <p style={{fontSize: '12px', color: '#888'}}>
          ⚠️ Requiere 2/3 confirmaciones del Multisig Owner actual
        </p>
      </div>

      </section>

      {/* MENSAJES DE ESTADO */}
      {isPending && <p className="status-message pending">⏳ Esperando confirmación en wallet...</p>}
      {isConfirming && <p className="status-message confirming">⏳ Procesando transacción...</p>}
      {isSuccess && <p className="status-message success">✅ Transacción exitosa!</p>}
    </div>
  );
}

export default AdminPanel;
