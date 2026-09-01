// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MinimalVault {mapping(address=>uint) public balance;function deposit() external payable {balance[msg.sender]+=msg.value;}function withdraw(uint a) external {require(balance[msg.sender]>=a);balance[msg.sender]-=a;(bool ok,)=msg.sender.call{value:a}("");require(ok);} }
