// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract InsolventWithdraw {mapping(address=>uint) public collateral;mapping(address=>uint) public debt;function withdraw(uint a) external {collateral[msg.sender]-=a;payable(msg.sender).transfer(a);}receive() external payable{} }
