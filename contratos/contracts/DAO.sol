// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DAOToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DAO is Ownable, ReentrancyGuard {

    // ============ STATE VARIABLES ============

    DAOToken public token;
    address public panicWallet;
    bool public isPaused;

    // Parámetros configurables de la DAO
    uint256 public tokenPrice;              // Precio en WEI por token
    uint256 public tokensPerVotingPower;    // Cuántos tokens = 1 VP (ej: 1000 tokens = 1 VP)
    uint256 public minStakeToVote;          // Mínimo tokens en staking para votar
    uint256 public minStakeToPropose;       // Mínimo tokens en staking para proponer
    uint256 public stakingLockTime;         // Tiempo de bloqueo del staking (en segundos)
    uint256 public proposalDuration;        // Duración de propuestas activas (en segundos)

    // ============ STRUCTS ============

    enum ProposalStatus { ACTIVE, ACCEPTED, REJECTED }

    enum ProposalType { NORMAL, TREASURY }

    struct Proposal {
        uint256 id;
        string title;
        string description;
        address proposer;
        uint256 createdAt;
        uint256 votesFor;
        uint256 votesAgainst;
        ProposalStatus status;
        ProposalType proposalType;
        // Para propuesta (Conjunto C)
        address payable treasuryTarget;
        uint256 treasuryAmount;
    }

    struct StakeInfo {
        uint256 amountForVoting;
        uint256 amountForProposing;
        uint256 lockedUntilVoting;
        uint256 lockedUntilProposing;
    }

    // ============ MAPPINGS ============

    mapping(address => StakeInfo) public stakes;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    mapping(uint256 => mapping(address => bool)) public voteChoice; // true = a favor, false = en contra

    uint256 public proposalCount;

    // ============ EVENTS ============

    event PanicWalletSet(address indexed panicWallet);
    event PanicActivated(address indexed by);
    event TranquilityRestored(address indexed by);
    event TokensPurchased(address indexed buyer, uint256 amount, uint256 cost);
    event Staked(address indexed user, uint256 amount, bool forVoting);
    event Unstaked(address indexed user, uint256 amount, bool fromVoting);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title);
    event Voted(uint256 indexed proposalId, address indexed voter, bool inFavor, uint256 votingPower);
    event ProposalExecuted(uint256 indexed proposalId, ProposalStatus status);
    event TreasuryTransferExecuted(uint256 indexed proposalId, address indexed to, uint256 amount);
    event ParametersUpdated(string paramName, uint256 newValue);

    // ============ ERRORS ============

    error DAOPaused();
    error NoPanicWalletSet();
    error NotPanicWallet();
    error NotPaused();
    error InvalidAmount();
    error InsufficientPayment();
    error InsufficientStake();
    error StakeLocked();
    error AlreadyVoted();
    error ProposalNotActive();
    error ProposalStillActive();
    error InvalidProposal();

    // ============ MODIFIERS ============

    modifier whenNotPaused() {
        if (isPaused) revert DAOPaused();
        _;
    }

    modifier onlyPanicWallet() {
        if (msg.sender != panicWallet) revert NotPanicWallet();
        _;
    }

    modifier panicWalletMustBeSet() {
        if (panicWallet == address(0)) revert NoPanicWalletSet();
        _;
    }

    // ============ CONSTRUCTOR ============

    constructor(
        address tokenAddress,
        uint256 _tokenPrice,
        uint256 _tokensPerVP,
        uint256 _minStakeToVote,
        uint256 _minStakeToPropose,
        uint256 _stakingLockTime,
        uint256 _proposalDuration
    ) Ownable(msg.sender) {
        token = DAOToken(tokenAddress);
        tokenPrice = _tokenPrice;
        tokensPerVotingPower = _tokensPerVP;
        minStakeToVote = _minStakeToVote;
        minStakeToPropose = _minStakeToPropose;
        stakingLockTime = _stakingLockTime;
        proposalDuration = _proposalDuration;
        isPaused = true; // Empieza pausada hasta que se configure panic wallet
    }

    function setPanicWallet(address _panicWallet) external onlyOwner {
        require(_panicWallet != address(0), "Invalid panic wallet");
        panicWallet = _panicWallet;
        isPaused = false; // Despausa cuando se configura
        emit PanicWalletSet(_panicWallet);
    }

    function panic() external onlyPanicWallet {
        isPaused = true;
        emit PanicActivated(msg.sender);
    }

    function tranquilidad() external onlyPanicWallet {
        if (!isPaused) revert NotPaused();
        isPaused = false;
        emit TranquilityRestored(msg.sender);
    }
    
    function buyTokens() external payable whenNotPaused panicWalletMustBeSet nonReentrant {
        if (msg.value == 0) revert InvalidAmount();

        uint256 tokenAmount = (msg.value * 1e18) / tokenPrice;

        // Verificar que el DAO tenga suficientes tokens
        require(token.balanceOf(address(this)) >= tokenAmount, "Insufficient tokens in DAO");

        // Transferir tokens del DAO al comprador (NO mintear)
        require(token.transfer(msg.sender, tokenAmount), "Transfer failed");

        emit TokensPurchased(msg.sender, tokenAmount, msg.value);
    }

    function stakeForVoting(uint256 amount) external whenNotPaused panicWalletMustBeSet {
        if (amount == 0) revert InvalidAmount();

        // Transferir tokens del usuario al contrato
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        StakeInfo storage userStake = stakes[msg.sender];
        userStake.amountForVoting += amount;
        userStake.lockedUntilVoting = block.timestamp + stakingLockTime;

        emit Staked(msg.sender, amount, true);
    }

    function stakeForProposing(uint256 amount) external whenNotPaused panicWalletMustBeSet {
        if (amount == 0) revert InvalidAmount();

        // Transferir tokens del usuario al contrato
        require(token.transferFrom(msg.sender, address(this), amount), "Transfer failed");

        StakeInfo storage userStake = stakes[msg.sender];
        userStake.amountForProposing += amount;
        userStake.lockedUntilProposing = block.timestamp + stakingLockTime;

        emit Staked(msg.sender, amount, false);
    }

    function unstakeFromVoting(uint256 amount) external nonReentrant {
        StakeInfo storage userStake = stakes[msg.sender];

        if (amount == 0 || amount > userStake.amountForVoting) revert InvalidAmount();
        if (block.timestamp < userStake.lockedUntilVoting) revert StakeLocked();

        userStake.amountForVoting -= amount;

        // Devolver tokens al usuario
        require(token.transfer(msg.sender, amount), "Transfer failed");

        emit Unstaked(msg.sender, amount, true);
    }

    function unstakeFromProposing(uint256 amount) external nonReentrant {
        StakeInfo storage userStake = stakes[msg.sender];

        if (amount == 0 || amount > userStake.amountForProposing) revert InvalidAmount();
        if (block.timestamp < userStake.lockedUntilProposing) revert StakeLocked();

        userStake.amountForProposing -= amount;

        // Devolver tokens al usuario
        require(token.transfer(msg.sender, amount), "Transfer failed");

        emit Unstaked(msg.sender, amount, false);
    }

    function getStakeInfo(address user) external view returns (StakeInfo memory) {
        return stakes[user];
    }

    function calculateVotingPower(address user) public view returns (uint256) {
        uint256 stakedAmount = stakes[user].amountForVoting;
        return stakedAmount / tokensPerVotingPower;
    }

    function updateTokenPrice(uint256 newPrice) external onlyOwner {
        tokenPrice = newPrice;
        emit ParametersUpdated("tokenPrice", newPrice);
    }

    function updateMinStakeToVote(uint256 newMin) external onlyOwner {
        minStakeToVote = newMin;
        emit ParametersUpdated("minStakeToVote", newMin);
    }

    function updateMinStakeToPropose(uint256 newMin) external onlyOwner {
        minStakeToPropose = newMin;
        emit ParametersUpdated("minStakeToPropose", newMin);
    }

    // Mintear tokens (solo owner/multisig)
    function mintTokens(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid address");
        require(amount > 0, "Amount must be greater than 0");

        token.mint(to, amount);

        emit ParametersUpdated("tokensMinted", amount);
    }

    // Para recibir ETH (para el treasury)
    receive() external payable {}
}