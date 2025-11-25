import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { DAO_ADDRESS, DAO_ABI } from './contracts/config';
import './ProposalsPanel.css';

function ProposalsPanel() {
  const { address } = useAccount();
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, accepted, rejected
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));

  // Timer para actualizar countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Leer total de propuestas
  const { data: proposalCount, refetch: refetchProposalCount } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'proposalCount',
  });

  // Leer stake info del usuario
  const { data: stakeInfo } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'getStakeInfo',
    args: [address],
    query: { enabled: !!address }
  });

  // Leer min stakes
  const { data: minStakeToPropose } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'minStakeToPropose',
  });

  const { data: minStakeToVote } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'minStakeToVote',
  });

  const canPropose = stakeInfo && minStakeToPropose && stakeInfo.amountForProposing >= minStakeToPropose;
  const canVote = stakeInfo && minStakeToVote && stakeInfo.amountForVoting >= minStakeToVote;

  // Limpiar form después de transacción exitosa
  useEffect(() => {
    if (isSuccess) {
      setTitle('');
      setDescription('');
      refetchProposalCount();
    }
  }, [isSuccess]);

  const handleCreateProposal = () => {
    if (!title || !description) return;
    writeContract({
      address: DAO_ADDRESS,
      abi: DAO_ABI,
      functionName: 'createProposal',
      args: [title, description],
    });
  };

  const proposalIds = proposalCount ? Array.from({ length: Number(proposalCount) }, (_, i) => i) : [];

  return (
    <div className="proposals-panel">
      <h2>🗳️ Sistema de Propuestas</h2>

      {/* Crear Propuesta */}
      <section className="create-proposal-section">
        <h3>Crear Nueva Propuesta</h3>
        {address ? (
          canPropose ? (
            <>
              <div className="form-group">
                <label>Título:</label>
                <input
                  type="text"
                  placeholder="Título de la propuesta"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div className="form-group">
                <label>Descripción:</label>
                <textarea
                  placeholder="Describe tu propuesta..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                />
              </div>
              <button
                className="create-btn"
                onClick={handleCreateProposal}
                disabled={isPending || isConfirming || !title || !description}
              >
                {isPending ? 'Confirmando...' : isConfirming ? 'Creando...' : 'Crear Propuesta'}
              </button>
            </>
          ) : (
            <p className="warning-message">
              ⚠️ Necesitas tener stakeado al menos {minStakeToPropose ? (Number(minStakeToPropose) / 1e18).toString() : '...'} DAOG para proponer.
              <br />Tu stake actual: {stakeInfo ? (Number(stakeInfo.amountForProposing) / 1e18).toString() : '0'} DAOG
            </p>
          )
        ) : (
          <p className="connect-message">Conecta tu wallet para crear propuestas</p>
        )}
      </section>

      {/* Filtros */}
      <section className="filters-section">
        <h3>Propuestas ({proposalIds.length})</h3>
        <div className="filter-buttons">
          <button
            className={filterStatus === 'all' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterStatus('all')}
          >
            Todas
          </button>
          <button
            className={filterStatus === 'active' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterStatus('active')}
          >
            Activas
          </button>
          <button
            className={filterStatus === 'accepted' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterStatus('accepted')}
          >
            Aceptadas
          </button>
          <button
            className={filterStatus === 'rejected' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilterStatus('rejected')}
          >
            Rechazadas
          </button>
        </div>
      </section>

      {/* Lista de Propuestas */}
      <section className="proposals-list">
        {proposalIds.length === 0 ? (
          <p className="no-proposals">No hay propuestas aún</p>
        ) : (
          proposalIds.slice().reverse().map(id => (
            <ProposalCard
              key={id}
              proposalId={id}
              userAddress={address}
              canVote={canVote}
              filterStatus={filterStatus}
              currentTime={currentTime}
              isPending={isPending}
              isConfirming={isConfirming}
            />
          ))
        )}
      </section>

      {/* Mensajes de estado */}
      {isSuccess && <p className="status-message success">✅ Transacción exitosa!</p>}
      {isPending && <p className="status-message pending">⏳ Esperando confirmación en wallet...</p>}
      {isConfirming && <p className="status-message confirming">⏳ Procesando transacción...</p>}
    </div>
  );
}

function ProposalCard({ proposalId, userAddress, canVote, filterStatus, currentTime, isPending, isConfirming }) {
  const { writeContract } = useWriteContract();

  // Leer datos de la propuesta
  const { data: proposalData, refetch: refetchProposal } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'getProposal',
    args: [BigInt(proposalId)],
  });

  // Leer si el usuario ya votó
  const { data: hasVoted } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'userHasVoted',
    args: [BigInt(proposalId), userAddress],
    query: { enabled: !!userAddress }
  });

  if (!proposalData) return null;

  const [title, description, proposer, createdAt, deadline, votesFor, votesAgainst, status] = proposalData;

  // Status: 0 = ACTIVE, 1 = ACCEPTED, 2 = REJECTED
  const statusText = status === 0 ? 'ACTIVE' : status === 1 ? 'ACCEPTED' : 'REJECTED';

  // Filtrar por status
  if (filterStatus === 'active' && status !== 0) return null;
  if (filterStatus === 'accepted' && status !== 1) return null;
  if (filterStatus === 'rejected' && status !== 2) return null;

  const deadlineNum = Number(deadline);
  const isActive = status === 0;
  const hasExpired = currentTime > deadlineNum;
  const timeLeft = deadlineNum - currentTime;

  const totalVotes = Number(votesFor) + Number(votesAgainst);
  const votesForPercent = totalVotes > 0 ? (Number(votesFor) / totalVotes) * 100 : 0;
  const votesAgainstPercent = totalVotes > 0 ? (Number(votesAgainst) / totalVotes) * 100 : 0;

  const handleVote = (inFavor) => {
    writeContract({
      address: DAO_ADDRESS,
      abi: DAO_ABI,
      functionName: 'vote',
      args: [BigInt(proposalId), inFavor],
    });
  };

  const handleFinalize = () => {
    writeContract({
      address: DAO_ADDRESS,
      abi: DAO_ABI,
      functionName: 'finalizeProposal',
      args: [BigInt(proposalId)],
    });
  };

  const formatTime = (seconds) => {
    if (seconds <= 0) return 'Finalizada';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className={`proposal-card status-${statusText.toLowerCase()}`}>
      <div className="proposal-header">
        <div>
          <span className="proposal-id">Propuesta #{proposalId}</span>
          <span className={`proposal-status status-${statusText.toLowerCase()}`}>
            {statusText}
          </span>
        </div>
        <div className="proposal-time">
          {isActive && !hasExpired && (
            <span className="time-left">⏱️ {formatTime(timeLeft)}</span>
          )}
          {isActive && hasExpired && (
            <span className="time-expired">⏱️ Finalizada - Pendiente de cierre</span>
          )}
        </div>
      </div>

      <div className="proposal-body">
        <h4>{title}</h4>
        <p className="proposal-description">{description}</p>
        <p className="proposal-proposer">
          Propuesto por: {proposer.slice(0, 6)}...{proposer.slice(-4)}
        </p>
      </div>

      <div className="proposal-votes">
        <div className="votes-summary">
          <div className="vote-count">
            <span className="vote-label">A favor:</span>
            <span className="vote-value for">{votesFor.toString()} VP</span>
          </div>
          <div className="vote-count">
            <span className="vote-label">En contra:</span>
            <span className="vote-value against">{votesAgainst.toString()} VP</span>
          </div>
        </div>

        {totalVotes > 0 && (
          <div className="votes-bar">
            <div className="votes-bar-for" style={{ width: `${votesForPercent}%` }}>
              {votesForPercent > 10 && `${votesForPercent.toFixed(0)}%`}
            </div>
            <div className="votes-bar-against" style={{ width: `${votesAgainstPercent}%` }}>
              {votesAgainstPercent > 10 && `${votesAgainstPercent.toFixed(0)}%`}
            </div>
          </div>
        )}
      </div>

      <div className="proposal-actions">
        {isActive && !hasExpired && userAddress && (
          <>
            {canVote ? (
              hasVoted ? (
                <p className="already-voted">✅ Ya votaste en esta propuesta</p>
              ) : (
                <div className="vote-buttons">
                  <button
                    className="vote-btn vote-for"
                    onClick={() => handleVote(true)}
                    disabled={isPending || isConfirming}
                  >
                    👍 A Favor
                  </button>
                  <button
                    className="vote-btn vote-against"
                    onClick={() => handleVote(false)}
                    disabled={isPending || isConfirming}
                  >
                    👎 En Contra
                  </button>
                </div>
              )
            ) : (
              <p className="warning-message-small">⚠️ Necesitas stake para votar</p>
            )}
          </>
        )}

        {isActive && hasExpired && (
          <button
            className="finalize-btn"
            onClick={handleFinalize}
            disabled={isPending || isConfirming}
          >
            🏁 Finalizar Propuesta
          </button>
        )}
      </div>
    </div>
  );
}

export default ProposalsPanel;
