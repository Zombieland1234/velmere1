// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PausableSystem {bool public paused;address public owner;mapping(address=>uint) public debt;constructor(){owner=msg.sender;}function setPaused(bool v) external {require(msg.sender==owner);paused=v;}function borrow(uint a) external {require(!paused);debt[msg.sender]+=a;} }
