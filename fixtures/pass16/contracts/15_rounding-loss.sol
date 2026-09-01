// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract RoundingLoss {uint public rate=1e30; mapping(address=>uint) public credit; function deposit(uint amount) external {credit[msg.sender]+=amount*1e18/rate;} }
