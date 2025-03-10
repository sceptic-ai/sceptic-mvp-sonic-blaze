// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ScepticToken
 * @dev SCEP governance token for the Sceptic AI ecosystem
 */
contract ScepticToken is ERC20, ERC20Burnable, Ownable {
    // Maximum supply of 100 million tokens
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18;
    
    // Initial mint to team and early investors
    uint256 public constant INITIAL_MINT = 20_000_000 * 10**18;
    
    // Reserved for ecosystem growth
    uint256 public constant ECOSYSTEM_ALLOCATION = 30_000_000 * 10**18;
    
    // Total amount minted to incentivize ecosystem development
    uint256 public ecosystemMinted;
    
    // Team wallet address
    address public teamWallet;
    
    // Ecosystem treasury address
    address public treasury;
    
    // Events
    event EcosystemMint(address indexed to, uint256 amount);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event TeamWalletUpdated(address indexed oldTeamWallet, address indexed newTeamWallet);

    /**
     * @dev Constructor initializes the token with name, symbol, and initial mint
     * @param _teamWallet Address of the team wallet
     * @param _treasury Address of the ecosystem treasury
     */
    constructor(address _teamWallet, address _treasury) ERC20("Sceptic AI Token", "SCEPTIC") {
        require(_teamWallet != address(0), "Team wallet cannot be zero address");
        require(_treasury != address(0), "Treasury cannot be zero address");
        
        teamWallet = _teamWallet;
        treasury = _treasury;
        
        // Initial mint for team and early contributors
        _mint(_teamWallet, INITIAL_MINT);
    }
    
    /**
     * @dev Mint tokens for ecosystem growth (only owner can call)
     * @param _to Address to mint tokens to
     * @param _amount Amount of tokens to mint
     */
    function mintEcosystem(address _to, uint256 _amount) external onlyOwner {
        require(_to != address(0), "Cannot mint to zero address");
        require(ecosystemMinted + _amount <= ECOSYSTEM_ALLOCATION, "Exceeds ecosystem allocation");
        
        ecosystemMinted += _amount;
        _mint(_to, _amount);
        
        emit EcosystemMint(_to, _amount);
    }
    
    /**
     * @dev Update the treasury address (only owner can call)
     * @param _newTreasury New treasury address
     */
    function updateTreasury(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "Treasury cannot be zero address");
        
        address oldTreasury = treasury;
        treasury = _newTreasury;
        
        emit TreasuryUpdated(oldTreasury, _newTreasury);
    }
    
    /**
     * @dev Update the team wallet address (only owner can call)
     * @param _newTeamWallet New team wallet address
     */
    function updateTeamWallet(address _newTeamWallet) external onlyOwner {
        require(_newTeamWallet != address(0), "Team wallet cannot be zero address");
        
        address oldTeamWallet = teamWallet;
        teamWallet = _newTeamWallet;
        
        emit TeamWalletUpdated(oldTeamWallet, _newTeamWallet);
    }
    
    /**
     * @dev Get remaining ecosystem allocation
     * @return Remaining tokens that can be minted for ecosystem
     */
    function remainingEcosystemAllocation() external view returns (uint256) {
        return ECOSYSTEM_ALLOCATION - ecosystemMinted;
    }
    
    /**
     * @dev Override _mint to enforce max supply
     * @param account Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function _mint(address account, uint256 amount) internal override {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds maximum token supply");
        super._mint(account, amount);
    }
} 