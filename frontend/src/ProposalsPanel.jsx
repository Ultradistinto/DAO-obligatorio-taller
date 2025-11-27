import { useState, useEffect } from 'react';
import { parseEther, formatEther } from 'viem';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Vote, ThumbsUp, ThumbsDown, Clock, CheckCircle, XCircle, Flag, AlertTriangle, Coins, Hourglass } from 'lucide-react';
import { DAO_ADDRESS, DAO_ABI } from './contracts/config';
import './ProposalsPanel.css';

function ProposalsPanel() {
  const { address } = useAccount();
  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedProposal, setExpandedProposal] = useState(null);
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));
  const [isTreasuryProposal, setIsTreasuryProposal] = useState(false);
  const [treasuryTarget, setTreasuryTarget] = useState('');
  const [treasuryAmount, setTreasuryAmount] = useState('');


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

  useEffect(() => {
    if (isSuccess) {
      setTitle('');
      setDescription('');
      setIsTreasuryProposal(false);
      setTreasuryTarget('');
      setTreasuryAmount(''); 
      refetchProposalCount();
    }
  }, [isSuccess]);

  const handleCreateProposal = () => {
    if (!title || !description) return;

    if (isTreasuryProposal) {
      if (!treasuryTarget || !treasuryAmount) return;
      writeContract({
        address: DAO_ADDRESS,
        abi: DAO_ABI,
        functionName: 'createTreasuryProposal',
        args: [title, description, treasuryTarget, parseEther(treasuryAmount)],
      });
    } else {
      writeContract({
        address: DAO_ADDRESS,
        abi: DAO_ABI,
        functionName: 'createProposal',
        args: [title, description],
      });
    }
  };


  const proposalIds = proposalCount ? Array.from({ length: Number(proposalCount) }, (_, i) => i) : [];

  return (
    <div className="proposals-panel">
      <h2><Vote size={28} className="panel-icon" /> Sistema de Propuestas</h2>

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
              <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={isTreasuryProposal}
                      onChange={(e) => setIsTreasuryProposal(e.target.checked)}
                    />
                    <Coins size={14} /> Propuesta de Treasury (transferir ETH del balance de la DAO)
                  </label>
                </div>

                {isTreasuryProposal && (
                  <>
                    <div className="form-group">
                      <label>Address destino:</label>
                      <input
                        type="text"
                        placeholder="0x..."
                        value={treasuryTarget}
                        onChange={(e) => setTreasuryTarget(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Cantidad (ETH):</label>
                      <input
                        type="number"
                        step="0.001"
                        placeholder="0.1"
                        value={treasuryAmount}
                        onChange={(e) => setTreasuryAmount(e.target.value)}
                      />
                    </div>
                  </>
                )}
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
              <AlertTriangle size={14} /> Necesitas tener stakeado al menos {minStakeToPropose ? (Number(minStakeToPropose) / 1e18).toString() : '...'} DAOG para proponer.
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
              expandedProposal={expandedProposal}
              setExpandedProposal={setExpandedProposal} 
            />
          ))
        )}
      </section>

      {/* Mensajes de estado */}
      {isSuccess && <p className="status-message success"><CheckCircle size={16} /> Transacción exitosa!</p>}
      {isPending && <p className="status-message pending"><Hourglass size={16} /> Esperando confirmación en wallet...</p>}
      {isConfirming && <p className="status-message confirming"><Hourglass size={16} /> Procesando transacción...</p>}
    </div>
  );
}

function ProposalCard({ proposalId, userAddress, canVote, filterStatus, currentTime, isPending, isConfirming, expandedProposal, setExpandedProposal }) {
  const { data: hash, writeContract } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: proposalData, refetch: refetchProposal } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'getProposal',
    args: [BigInt(proposalId)],
  });

  const { data: hasVoted } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'userHasVoted',
    args: [BigInt(proposalId), userAddress],
    query: { enabled: !!userAddress }
  });

  const { data: voters, refetch: refetchVoters } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'getProposalVoters',
    args: [BigInt(proposalId)],
  });

  // Auto-refresh after voting
  useEffect(() => {
    if (isSuccess) {
      refetchProposal();
      refetchVoters();
    }
  }, [isSuccess, refetchProposal, refetchVoters]);

  if (!proposalData) return null;

  const [title, description, proposer, createdAt, deadline, votesFor, votesAgainst, status] = proposalData;

  const statusText = status === 0 ? 'ACTIVE' : status === 1 ? 'ACCEPTED' : 'REJECTED';

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
            <span className="time-left"><Clock size={16} /> {formatTime(timeLeft)}</span>
          )}
          {isActive && hasExpired && (
            <span className="time-expired"><Clock size={16} /> Finalizada - Pendiente de cierre</span>
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
                <p className="already-voted"><CheckCircle size={16} /> Ya votaste en esta propuesta</p>
              ) : (
                <div className="vote-buttons">
                  <button
                    className="vote-btn vote-for"
                    onClick={() => handleVote(true)}
                    disabled={isPending || isConfirming}
                  >
                    <ThumbsUp size={18} /> A Favor
                  </button>
                  <button
                    className="vote-btn vote-against"
                    onClick={() => handleVote(false)}
                    disabled={isPending || isConfirming}
                  >
                    <ThumbsDown size={18} /> En Contra
                  </button>
                </div>
              )
            ) : (
              <p className="warning-message-small"><AlertTriangle size={14} /> Necesitas stake para votar</p>
            )}
          </>
        )}

        {isActive && hasExpired && (
          <button
            className="finalize-btn"
            onClick={handleFinalize}
            disabled={isPending || isConfirming}
          >
            <Flag size={18} /> Finalizar Propuesta
          </button>
        )}
      </div>
      {voters && voters.length > 0 && (
          <div className="voters-section">
            <button
              className="voters-toggle"
              onClick={() => setExpandedProposal(expandedProposal === proposalId ? null : proposalId)}
            >
              {expandedProposal === proposalId ? '▼' : '▶'} Ver votantes ({voters.length})
            </button>

            {expandedProposal === proposalId && (
              <div className="voters-list">
                {voters.map((voter, index) => (
                  <VoterItem key={index} proposalId={proposalId} voterAddress={voter} />
                ))}
              </div>
            )}
          </div>
        )}
    </div>
  );
}

function VoterItem({ proposalId, voterAddress }) {
  const { data: voteChoice } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'getVoterChoice',
    args: [BigInt(proposalId), voterAddress],
  });

  const { data: votingPower } = useReadContract({
    address: DAO_ADDRESS,
    abi: DAO_ABI,
    functionName: 'calculateVotingPower',
    args: [voterAddress],
  });

  return (
    <div className="voter-item">
      <span className="voter-address">
        {voterAddress}
      </span>
      <span className={`voter-choice ${voteChoice ? 'for' : 'against'}`}>
        {voteChoice ? '✓ A favor' : '✗ En contra'}
      </span>
      <span className="voter-power">
        {votingPower ? votingPower.toString() : '0'} VP
      </span>
    </div>
  );
}

export default ProposalsPanel;
