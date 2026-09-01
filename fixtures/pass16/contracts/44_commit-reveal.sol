// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CommitReveal {mapping(address=>bytes32) public commit;function commitHash(bytes32 h) external {commit[msg.sender]=h;}function reveal(bytes32 value,bytes32 salt) external view returns(bool){return keccak256(abi.encode(value,salt))==commit[msg.sender];} }
