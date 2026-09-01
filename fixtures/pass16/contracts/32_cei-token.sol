// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IHook2{function tokensReceived() external;} contract CEIToken {mapping(address=>uint) public balance;function send(address to,uint amount) external {balance[msg.sender]-=amount;balance[to]+=amount;IHook2(to).tokensReceived();} }
