// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract RoleMint {mapping(address=>uint) public balance;mapping(address=>bool) public minter;address public owner;constructor(){owner=msg.sender;}function setMinter(address a,bool v) external {require(msg.sender==owner);minter[a]=v;}function mint(address to,uint amount) external {require(minter[msg.sender]);balance[to]+=amount;} }
