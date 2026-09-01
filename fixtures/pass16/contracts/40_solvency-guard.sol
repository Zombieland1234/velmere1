// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SolvencyGuard {mapping(address=>uint) public collateral;mapping(address=>uint) public debt;function withdraw(uint a) external {require(collateral[msg.sender]-a>=debt[msg.sender]*2);collateral[msg.sender]-=a;payable(msg.sender).transfer(a);}receive() external payable{} }
