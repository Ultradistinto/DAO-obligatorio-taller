import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { decodeFunctionData, encodeFunctionData } from 'viem';
import { MULTISIG_PANIC_ADDRESS, MULTISIG_ABI, DAO_ABI, DAO_ADDRESS } from './contracts/config';
import './PanicPanel.css';

function PanicPanel() {
  const { address } = useAccount();
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Leer datos del multisig panic
  const { data: panicOwners } = useReadContract({
    address: MULTISIG_PANIC_ADDRESS,
    abi: MULTISIG_ABI,
    functionName: 'owners',
  });

  const { data: requiredConfirmations } = useReadContract({
    address: MULTISIG_PANIC_ADDRESS,
    abi: MULTISIG_ABI,
    functionName: '_requiredConfirmations',
  });

  const { data: txCount, refetch: refetchTxCount } = useReadContract({
    address: MULTISIG_PANIC_ADDRESS,
    abi: MULTISIG_ABI,
    functionName: 'transactionCount',
  });

  // Leer estado actual de la DAO
  const { data: isPaused, refetch: refetchPaused } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'isPaused',
  });

  const isOwner = panicOwners?.some(owner =>
    owner.toLowerCase() === address?.toLowerCase()
  );

  // Función para crear transacción de pánico
  const handlePanic = () => {
    const panicData = encodeFunctionData({
      abi: DAO_ABI,
      functionName: 'panic',
      args: [],
    });

    writeContract({
      address: MULTISIG_PANIC_ADDRESS,
      abi: MULTISIG_ABI,
      functionName: 'submitTransaction',
      args: [DAO_ADDRESS, 0n, panicData],
    });
  };

  // Función para crear transacción de tranquilidad
  const handleTranquilidad = () => {
    const tranquilidadData = encodeFunctionData({
      abi: DAO_ABI,
      functionName: 'tranquilidad',
      args: [],
    });

    writeContract({
      address: MULTISIG_PANIC_ADDRESS,
      abi: MULTISIG_ABI,
      functionName: 'submitTransaction',
      args: [DAO_ADDRESS, 0n, tranquilidadData],
    });
  };

  const transactionIds = txCount ? Array.from({ length: Number(txCount) }, (_, i) => i) : [];

  return (
    <div className="panic-panel">
      <h2>🚨 Panel de Pánico</h2>

      {/* Estado actual */}
      <section className="panic-status">
        <div className="status-card">
          <div className="status-icon">
            {isPaused ? '🔴' : '🟢'}
          </div>
          <div className="status-info">
            <h3>Estado de la DAO</h3>
            <p className={isPaused ? 'status-paused' : 'status-active'}>
              {isPaused ? 'PAUSADA (Modo Pánico)' : 'ACTIVA (Normal)'}
            </p>
          </div>
        </div>

        <div className="multisig-info-card">
          <h4>Multisig Panic</h4>
          <p><strong>Address:</strong> {MULTISIG_PANIC_ADDRESS.slice(0, 10)}...{MULTISIG_PANIC_ADDRESS.slice(-8)}</p>
          <p><strong>Owners:</strong> {panicOwners?.length || 0}</p>
          <p><strong>Confirmaciones requeridas:</strong> {requiredConfirmations?.toString() || '...'}</p>
          <p>
            <strong>Tu rol:</strong>{' '}
            {isOwner ? (
              <span className="owner-badge">✅ Eres owner</span>
            ) : (
              <span className="not-owner-badge">❌ No eres owner</span>
            )}
          </p>
        </div>
      </section>

      {/* Acciones rápidas */}
      {address && isOwner && (
        <section className="quick-actions">
          <h3>Acciones Rápidas</h3>
          <div className="action-buttons">
            <button
              className="panic-btn"
              onClick={handlePanic}
              disabled={isPending || isConfirming || isPaused}
            >
              🚨 Activar Pánico
            </button>
            <button
              className="tranquil-btn"
              onClick={handleTranquilidad}
              disabled={isPending || isConfirming || !isPaused}
            >
              ✅ Restaurar Tranquilidad
            </button>
          </div>
          <p className="action-note">
            ℹ️ Estas acciones crean una transacción en el multisig. Necesitas {requiredConfirmations?.toString() || '...'} confirmación(es) para ejecutarla.
          </p>
        </section>
      )}

      {/* Lista de transacciones */}
      <section className="panic-transactions">
        <h3>Transacciones de Pánico ({transactionIds.length})</h3>
        {transactionIds.length === 0 ? (
          <p className="no-transactions">No hay transacciones en el multisig panic</p>
        ) : (
          <div className="transactions-list">
            {transactionIds.slice().reverse().map(txId => (
              <PanicTransactionCard
                key={txId}
                txId={txId}
                userAddress={address}
                isOwner={isOwner}
                requiredConfirmations={requiredConfirmations}
                isPending={isPending}
                isConfirming={isConfirming}
              />
            ))}
          </div>
        )}
      </section>

      {/* Mensajes de estado */}
      {isSuccess && <p className="status-message success">✅ Transacción confirmada exitosamente!</p>}
      {isPending && <p className="status-message pending">⏳ Esperando confirmación en wallet...</p>}
      {isConfirming && <p className="status-message confirming">⏳ Procesando transacción...</p>}
    </div>
  );
}

function PanicTransactionCard({ txId, userAddress, isOwner, requiredConfirmations, isPending, isConfirming }) {
  const { writeContract } = useWriteContract();

  // Leer confirmaciones
  const { data: confirmationCount } = useReadContract({
    address: MULTISIG_PANIC_ADDRESS,
    abi: MULTISIG_ABI,
    functionName: 'confirmations',
    args: [BigInt(txId)],
  });

  // Leer detalles de la transacción
  const { data: txDetails } = useReadContract({
    address: MULTISIG_PANIC_ADDRESS,
    abi: MULTISIG_ABI,
    functionName: 'getTransaction',
    args: [BigInt(txId)],
  });

  const confirmations = confirmationCount ? Number(confirmationCount) : 0;
  const required = requiredConfirmations ? Number(requiredConfirmations) : 0;
  const isExecuted = txDetails ? txDetails[3] : false;

  // Decodificar la función
  let functionName = 'Unknown';
  if (txDetails && txDetails[2]) {
    try {
      const decoded = decodeFunctionData({
        abi: DAO_ABI,
        data: txDetails[2],
      });
      functionName = decoded.functionName;
    } catch (e) {
      functionName = 'Raw call';
    }
  }

  const handleConfirm = () => {
    writeContract({
      address: MULTISIG_PANIC_ADDRESS,
      abi: MULTISIG_ABI,
      functionName: 'confirmTransaction',
      args: [BigInt(txId)],
    });
  };

  return (
    <div className={`panic-tx-card ${isExecuted ? 'executed' : 'pending'}`}>
      <div className="tx-header">
        <span className="tx-id">TX #{txId}</span>
        <span className={`tx-status ${isExecuted ? 'status-executed' : 'status-pending'}`}>
          {isExecuted ? '✅ Ejecutada' : '⏳ Pendiente'}
        </span>
      </div>

      <div className="tx-body">
        <div className="tx-function">
          <strong>Acción:</strong>{' '}
          {functionName === 'panic' ? (
            <span className="action-panic">🚨 Activar Pánico</span>
          ) : functionName === 'tranquilidad' ? (
            <span className="action-tranquil">✅ Restaurar Tranquilidad</span>
          ) : (
            <span>{functionName}()</span>
          )}
        </div>

        <div className="tx-confirmations">
          <strong>Confirmaciones:</strong> {confirmations} / {required}
          <div className="confirmation-bar">
            <div
              className="confirmation-progress"
              style={{ width: `${(confirmations / required) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="tx-footer">
        {!isExecuted && isOwner && userAddress && (
          <button
            className="confirm-btn"
            onClick={handleConfirm}
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

export default PanicPanel;
