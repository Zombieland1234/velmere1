// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract OpenMint {mapping(address=>uint) public balance;function mint(address to,uint amount) external {balance[to]+=amount;} }
