import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { decodeFunctionData, formatEther } from 'viem';
import { MULTISIG_OWNER_ADDRESS, MULTISIG_PANIC_ADDRESS, MULTISIG_ABI, DAO_ABI, DAO_ADDRESS } from './contracts/config';
import './MultisigPanel.css';

function MultisigPanel() {
  const { address } = useAccount();
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [selectedTxId, setSelectedTxId] = useState('');
  const [activeMultisig, setActiveMultisig] = useState('owner'); // 'owner' o 'panic'

  const currentMultisigAddress = activeMultisig === 'owner' ? MULTISIG_OWNER_ADDRESS : MULTISIG_PANIC_ADDRESS;

  const { data: txCount, refetch: refetchTxCount } = useReadContract({
    address: currentMultisigAddress,
    abi: MULTISIG_ABI,
    functionName: 'transactionCount',
  });

  const { data: multisigOwners } = useReadContract({
    address: currentMultisigAddress,
    abi: MULTISIG_ABI,
    functionName: 'owners',
  });

  const { data: requiredConfirmations } = useReadContract({
    address: currentMultisigAddress,
    abi: MULTISIG_ABI,
    functionName: '_requiredConfirmations',
  });

  const isOwner = multisigOwners?.some(owner =>
    owner.toLowerCase() === address?.toLowerCase()
  );

  const handleConfirmTransaction = (txId) => {
    writeContract({
      address: currentMultisigAddress,
      abi: MULTISIG_ABI,
      functionName: 'confirmTransaction',
      args: [BigInt(txId)],
    });
  };

  const transactionIds = txCount ? Array.from({ length: Number(txCount) }, (_, i) => i) : [];

  return (
    <div className="multisig-panel">
      <h2>📋 Transacciones del Multisig</h2>

      {/* Selector de Multisig */}
      <div className="multisig-selector">
        <button
          className={activeMultisig === 'owner' ? 'selector-btn active' : 'selector-btn'}
          onClick={() => setActiveMultisig('owner')}
        >
          🏛️ Multisig Owner
        </button>
        <button
          className={activeMultisig === 'panic' ? 'selector-btn active' : 'selector-btn'}
          onClick={() => setActiveMultisig('panic')}
        >
          🚨 Multisig Panic
        </button>
      </div>

      {/* Información del Multisig */}
      <div className="multisig-info">
        <p><strong>Address:</strong> {currentMultisigAddress.slice(0, 10)}...{currentMultisigAddress.slice(-8)}</p>
        <p><strong>Owners:</strong> {multisigOwners?.length || 0}</p>
        <p><strong>Confirmaciones requeridas:</strong> {requiredConfirmations?.toString() || '...'}</p>
        <p><strong>Total de transacciones:</strong> {txCount?.toString() || '0'}</p>
        <p>
          <strong>Estado:</strong>{' '}
          {isOwner ? (
            <span className="owner-badge-small">✅ Eres owner</span>
          ) : (
            <span className="not-owner-badge-small">❌ No eres owner</span>
          )}
        </p>
      </div>

      {/* Lista de Transacciones */}
      <div className="transactions-section">
        <h3>Transacciones Recientes</h3>

        {transactionIds.length === 0 ? (
          <p className="no-transactions">No hay transacciones en este multisig</p>
        ) : (
          <div className="transactions-list">
            {transactionIds.slice().reverse().slice(0, 10).map(txId => (
              <TransactionCard
                key={txId}
                txId={txId}
                multisigAddress={currentMultisigAddress}
                userAddress={address}
                isOwner={isOwner}
                onConfirm={handleConfirmTransaction}
                requiredConfirmations={requiredConfirmations}
                isPending={isPending}
                isConfirming={isConfirming}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirmar por ID manualmente */}
      <div className="manual-confirm">
        <h3>Confirmar Transacción por ID</h3>
        <div className="input-group">
          <input
            type="number"
            placeholder="ID de la transacción"
            value={selectedTxId}
            onChange={(e) => setSelectedTxId(e.target.value)}
          />
          <button
            onClick={() => handleConfirmTransaction(selectedTxId)}
            disabled={!selectedTxId || isPending || isConfirming || !isOwner || !address}
          >
            {!address ? 'Conecta wallet' : !isOwner ? 'No eres owner' : isPending ? 'Confirmando...' : 'Confirmar'}
          </button>
        </div>
      </div>

      {/* Mensajes de estado */}
      {isSuccess && <p className="status-message success">✅ Transacción confirmada exitosamente!</p>}
      {isPending && <p className="status-message pending">⏳ Esperando confirmación en wallet...</p>}
      {isConfirming && <p className="status-message confirming">⏳ Procesando transacción...</p>}
    </div>
  );
}

function TransactionCard({ txId, multisigAddress, userAddress, isOwner, onConfirm, requiredConfirmations, isPending, isConfirming }) {
  const { data: confirmationCount } = useReadContract({
    address: multisigAddress,
    abi: MULTISIG_ABI,
    functionName: 'confirmations',
    args: [BigInt(txId)],
  });

  const { data: txDetails } = useReadContract({
    address: multisigAddress,
    abi: MULTISIG_ABI,
    functionName: 'getTransaction',
    args: [BigInt(txId)],
  });

  const confirmations = confirmationCount ? Number(confirmationCount) : 0;
  const required = requiredConfirmations ? Number(requiredConfirmations) : 0;
  const isExecuted = txDetails ? txDetails[3] : false;

  let functionName = 'Unknown';
  let functionArgs = [];

  if (txDetails && txDetails[2]) {
    try {
      const decoded = decodeFunctionData({
        abi: DAO_ABI,
        data: txDetails[2],
      });
      functionName = decoded.functionName;
      functionArgs = decoded.args || [];
    } catch (e) {
      functionName = 'Raw call';
    }
  }

  const targetAddress = txDetails ? txDetails[0] : '';
  const value = txDetails ? txDetails[1] : 0n;

  return (
    <div className={`transaction-card ${isExecuted ? 'executed' : 'pending'}`}>
      <div className="tx-header">
        <span className="tx-id">TX #{txId}</span>
        <span className={`tx-status ${isExecuted ? 'status-executed' : 'status-pending'}`}>
          {isExecuted ? '✅ Ejecutada' : '⏳ Pendiente'}
        </span>
      </div>

      <div className="tx-body">
        <div className="tx-details">
          <p className="tx-function">
            <strong>Función:</strong> <code>{functionName}()</code>
          </p>
          <p className="tx-target">
            <strong>Destino:</strong>{' '}
            <code className="address-short">
              {targetAddress === DAO_ADDRESS ? 'DAO Contract' : `${targetAddress.slice(0, 6)}...${targetAddress.slice(-4)}`}
            </code>
          </p>
          {value > 0n && (
            <p className="tx-value">
              <strong>Valor:</strong> {formatEther(value)} ETH
            </p>
          )}
          {functionArgs.length > 0 && (
            <details className="tx-args">
              <summary>Ver argumentos ({functionArgs.length})</summary>
              <ul>
                {functionArgs.map((arg, idx) => (
                  <li key={idx}>
                    <code>{typeof arg === 'bigint' ? formatEther(arg) + ' tokens' : arg.toString()}</code>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <p className="tx-confirmations">
          <strong>Confirmaciones:</strong> {confirmations} / {required}
        </p>
        <div className="confirmation-bar">
          <div
            className="confirmation-progress"
            style={{ width: `${(confirmations / required) * 100}%` }}
          />
        </div>
      </div>

      <div className="tx-footer">
        {!isExecuted && isOwner && userAddress && (
          <button
            className="confirm-btn"
            onClick={() => onConfirm(txId)}
            disabled={isPending || isConfirming}
          >
            Confirmar
          </button>
        )}
        {isExecuted && (
          <span className="executed-label">Transacción ejecutada</span>
        )}
      </div>
    </div>
  );
}

export default MultisigPanel;
