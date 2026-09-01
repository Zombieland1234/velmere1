// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PermitDeadline {mapping(address=>uint) public nonces;function permit(address owner,address spender,uint amount,uint deadline,uint8 v,bytes32 r,bytes32 s) external {require(block.timestamp<=deadline);bytes32 h=keccak256(abi.encode(block.chainid,address(this),owner,spender,amount,deadline,nonces[owner]++));require(ecrecover(h,v,r,s)==owner);} }
