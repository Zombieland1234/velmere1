// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20A{function transferFrom(address,address,uint) external returns(bool);} contract FeeMismatch {IERC20A public token;mapping(address=>uint) public credit;function deposit(uint amount) external {require(token.transferFrom(msg.sender,address(this),amount));credit[msg.sender]+=amount;} }
