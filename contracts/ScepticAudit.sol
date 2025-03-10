// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ScepticToken
 * @dev $SCEPTIC token implementation
 */
contract ScepticToken is ERC20, Ownable {
    constructor() ERC20("Sceptic AI Token", "SCEPTIC") {
        // Mint 100M tokens to the contract creator
        _mint(msg.sender, 100000000 * 10**decimals());
    }
    
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}

/**
 * @title ScepticAudit
 * @dev Main contract for storing audit results on Sonic Network
 */
contract ScepticAudit is Ownable, ReentrancyGuard {
    ScepticToken public scepticToken;
    uint256 public minStakeForVoting;
    uint256 public validationThreshold;
    
    // Audit result structure
    struct AuditResult {
        string dataHash;       // Hash of the entire audit data JSON
        uint256 riskScore;     // Risk score from 0-100
        uint256 timestamp;     // When the audit was recorded
        address auditor;       // Who performed the audit
        bool validated;        // Whether the audit has been validated
    }
    
    // Voting structure
    struct Vote {
        bool exists;           // Whether vote exists
        bool approve;          // Whether the voter approved
        uint256 stake;         // Amount of tokens staked on this vote
    }
    
    // Mapping from audit ID to audit result
    mapping(string => AuditResult) public auditResults;
    
    // Mapping from audit ID to voter address to vote
    mapping(string => mapping(address => Vote)) public votes;
    
    // Mapping from audit ID to list of voters
    mapping(string => address[]) public votersList;
    
    // Mapping from audit ID to vote counts
    mapping(string => uint256) public approveVotes;
    mapping(string => uint256) public rejectVotes;
    
    // List of registered auditors
    mapping(address => bool) public registeredAuditors;
    
    // Events
    event AuditStored(string auditId, string dataHash, uint256 riskScore, address auditor);
    event VoteCast(string auditId, address voter, bool approve, uint256 stake);
    event AuditorRegistered(address auditor);
    event AuditorRemoved(address auditor);
    
    /**
     * @dev Constructor sets the token address
     */
    constructor(
        address _token,
        uint256 _minStakeForVoting,
        uint256 _validationThreshold
    ) {
        scepticToken = ScepticToken(_token);
        minStakeForVoting = _minStakeForVoting;
        validationThreshold = _validationThreshold;
    }
    
    /**
     * @dev Modifier to check if caller is a registered auditor
     */
    modifier onlyAuditor() {
        require(registeredAuditors[msg.sender], "Not a registered auditor");
        _;
    }
    
    /**
     * @dev Register a new auditor
     */
    function registerAuditor(address auditor) external onlyOwner {
        registeredAuditors[auditor] = true;
        emit AuditorRegistered(auditor);
    }
    
    /**
     * @dev Remove an auditor
     */
    function removeAuditor(address auditor) external onlyOwner {
        registeredAuditors[auditor] = false;
        emit AuditorRemoved(auditor);
    }
    
    /**
     * @dev Set the minimum stake required for voting
     */
    function setMinStakeForVoting(uint256 minStake) external onlyOwner {
        minStakeForVoting = minStake;
    }
    
    /**
     * @dev Store a new audit result
     */
    function storeAuditResult(
        string calldata auditId,
        string calldata dataHash,
        uint256 riskScore
    ) external onlyAuditor returns (bool) {
        // Ensure this audit ID doesn't already exist
        require(bytes(auditResults[auditId].dataHash).length == 0, "Audit ID already exists");
        
        // Store the audit result
        auditResults[auditId] = AuditResult({
            dataHash: dataHash,
            riskScore: riskScore,
            timestamp: block.timestamp,
            auditor: msg.sender,
            validated: false
        });
        
        emit AuditStored(auditId, dataHash, riskScore, msg.sender);
        return true;
    }
    
    /**
     * @dev Get a specific audit result
     */
    function getAuditResult(string calldata auditId) external view returns (
        string memory dataHash,
        uint256 riskScore,
        uint256 timestamp,
        address auditor
    ) {
        AuditResult memory result = auditResults[auditId];
        return (result.dataHash, result.riskScore, result.timestamp, result.auditor);
    }
    
    /**
     * @dev Cast a vote on an audit result
     */
    function voteOnAudit(
        string calldata auditId,
        bool approve,
        uint256 stake
    ) external nonReentrant returns (bool) {
        // Ensure the audit exists
        require(bytes(auditResults[auditId].dataHash).length > 0, "Audit does not exist");
        
        // Ensure voter has enough tokens and hasn't voted before
        require(!votes[auditId][msg.sender].exists, "Already voted on this audit");
        require(stake >= minStakeForVoting, "Stake too low");
        require(scepticToken.balanceOf(msg.sender) >= stake, "Insufficient token balance");
        
        // Transfer tokens to this contract
        require(scepticToken.transferFrom(msg.sender, address(this), stake), "Token transfer failed");
        
        // Record the vote
        votes[auditId][msg.sender] = Vote({
            exists: true,
            approve: approve,
            stake: stake
        });
        
        // Add voter to list
        votersList[auditId].push(msg.sender);
        
        // Update vote counts
        if (approve) {
            approveVotes[auditId] += stake;
        } else {
            rejectVotes[auditId] += stake;
        }
        
        emit VoteCast(auditId, msg.sender, approve, stake);
        
        // Check if enough votes to validate
        checkAndValidateAudit(auditId);
        
        return true;
    }
    
    /**
     * @dev Check if enough votes to validate audit
     */
    function checkAndValidateAudit(string calldata auditId) internal {
        uint256 totalVotes = approveVotes[auditId] + rejectVotes[auditId];
        
        // Require at least 1000 tokens worth of votes
        if (totalVotes >= 1000 * 10**18) {
            // If more than 66% approve, mark as validated
            if (approveVotes[auditId] * 100 / totalVotes >= validationThreshold) {
                auditResults[auditId].validated = true;
            }
        }
    }
    
    /**
     * @dev Get vote counts for an audit
     */
    function getVotes(string calldata auditId) external view returns (
        uint256 approve,
        uint256 reject
    ) {
        return (approveVotes[auditId], rejectVotes[auditId]);
    }
    
    /**
     * @dev Get list of voters and their votes
     */
    function getVoters(string calldata auditId) external view returns (
        address[] memory voters,
        bool[] memory approvals,
        uint256[] memory stakes
    ) {
        uint256 voterCount = votersList[auditId].length;
        voters = new address[](voterCount);
        approvals = new bool[](voterCount);
        stakes = new uint256[](voterCount);
        
        for (uint256 i = 0; i < voterCount; i++) {
            address voter = votersList[auditId][i];
            voters[i] = voter;
            approvals[i] = votes[auditId][voter].approve;
            stakes[i] = votes[auditId][voter].stake;
        }
        
        return (voters, approvals, stakes);
    }
    
    /**
     * @dev Allow token recovery in case of emergency
     */
    function recoverTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
} 