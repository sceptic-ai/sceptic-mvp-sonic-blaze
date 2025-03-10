// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract ScepticSimple {
    string public projectName;
    address public owner;
    
    constructor(string memory _name) {
        projectName = _name;
        owner = msg.sender;
    }
    
    function updateName(string memory _newName) external {
        require(msg.sender == owner, "Only owner can update");
        projectName = _newName;
    }
} 