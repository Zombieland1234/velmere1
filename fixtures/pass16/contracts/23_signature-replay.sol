// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SignatureReplay {address public signer;constructor(address s){signer=s;}function run(bytes32 h,uint8 v,bytes32 r,bytes32 s) external view {require(ecrecover(h,v,r,s)==signer);} }
