// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PermitNoDeadline {mapping(address=>uint) public nonces;function permit(address owner,address spender,uint amount,uint8 v,bytes32 r,bytes32 s) external {bytes32 h=keccak256(abi.encode(owner,spender,amount,nonces[owner]++));require(ecrecover(h,v,r,s)==owner);} }
