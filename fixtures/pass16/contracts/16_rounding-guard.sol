// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract RoundingGuard {uint public rate=1e30;mapping(address=>uint) public credit;function deposit(uint amount) external {uint c=amount*1e18/rate;require(c>0);credit[msg.sender]+=c;} }
