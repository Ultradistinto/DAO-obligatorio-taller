import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, encodeFunctionData } from 'viem';
import { DAO_ADDRESS, TOKEN_ADDRESS, DAO_ABI, TOKEN_ABI, MULTISIG_OWNER_ADDRESS, MULTISIG_ABI } from './contracts/config';
import './AdminPanel.css';

function AdminPanel() {
  const { address } = useAccount();
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Estados para inputs
  const [mintTo, setMintTo] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [newTokenPrice, setNewTokenPrice] = useState('');
  const [newMinStakeVote, setNewMinStakeVote] = useState('');
  const [newMinStakePropose, setNewMinStakePropose] = useState('');

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
      </section>

      {/* MENSAJES DE ESTADO */}
      {isPending && <p className="status-message pending">⏳ Esperando confirmación en wallet...</p>}
      {isConfirming && <p className="status-message confirming">⏳ Procesando transacción...</p>}
      {isSuccess && <p className="status-message success">✅ Transacción exitosa!</p>}
    </div>
  );
}

export default AdminPanel;
