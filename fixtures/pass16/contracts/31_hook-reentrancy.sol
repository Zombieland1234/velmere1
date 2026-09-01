// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IHook{function tokensReceived() external;} contract HookToken {mapping(address=>uint) public balance;function send(address to,uint amount) external {balance[msg.sender]-=amount;IHook(to).tokensReceived();balance[to]+=amount;} }
