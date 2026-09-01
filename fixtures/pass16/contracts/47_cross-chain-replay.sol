// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CrossChainReplay {mapping(bytes32=>bool) public executed;function execute(bytes calldata message,bytes calldata sig) external {bytes32 id=keccak256(message);require(!executed[id]);executed[id]=true;sig;} }
