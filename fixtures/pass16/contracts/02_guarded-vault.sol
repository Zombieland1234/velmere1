// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract GuardedVault { mapping(address=>uint) public balance; bool private locked; modifier nonReentrant(){require(!locked);locked=true;_;locked=false;} function deposit() external payable {balance[msg.sender]+=msg.value;} function withdraw() external nonReentrant {uint a=balance[msg.sender];balance[msg.sender]=0;(bool ok,)=msg.sender.call{value:a}("");require(ok);} }
