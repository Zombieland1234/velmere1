// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICall{function ping() external;} contract ReentrantVault { mapping(address=>uint) public balance; function deposit() external payable { balance[msg.sender]+=msg.value; } function withdraw() external { uint a=balance[msg.sender]; (bool ok,)=msg.sender.call{value:a}(""); require(ok); balance[msg.sender]=0; }}
