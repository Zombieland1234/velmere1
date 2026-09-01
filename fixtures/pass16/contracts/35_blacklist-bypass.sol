// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BlacklistBypass {mapping(address=>bool) public blocked;mapping(address=>uint) public balance;function transfer(address to,uint a) external {require(!blocked[msg.sender]);balance[msg.sender]-=a;balance[to]+=a;}function adminMove(address from,address to,uint a) external {balance[from]-=a;balance[to]+=a;} }
