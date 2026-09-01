// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SignatureDomain {address public signer;mapping(bytes32=>bool) public used;constructor(address s){signer=s;}function run(bytes32 action,uint nonce,uint8 v,bytes32 r,bytes32 s) external {bytes32 h=keccak256(abi.encode(block.chainid,address(this),action,nonce));require(!used[h]);require(ecrecover(h,v,r,s)==signer);used[h]=true;} }
