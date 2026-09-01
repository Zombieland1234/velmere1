// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC20B{function transferFrom(address,address,uint) external returns(bool);function balanceOf(address) external view returns(uint);} contract BalanceDelta {IERC20B public token;mapping(address=>uint) public credit;function deposit(uint amount) external {uint b=token.balanceOf(address(this));require(token.transferFrom(msg.sender,address(this),amount));uint got=token.balanceOf(address(this))-b;credit[msg.sender]+=got;} }
