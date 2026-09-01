// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CrossChainDomain {mapping(bytes32=>bool) public executed;address public messenger;constructor(address m){messenger=m;}function execute(uint sourceChain,bytes calldata message) external {require(msg.sender==messenger);bytes32 id=keccak256(abi.encode(sourceChain,block.chainid,address(this),message));require(!executed[id]);executed[id]=true;} }
