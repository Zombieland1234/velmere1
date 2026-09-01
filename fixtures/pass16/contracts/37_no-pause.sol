// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract NoPause {mapping(address=>uint) public debt;function borrow(uint a) external {debt[msg.sender]+=a;} }
