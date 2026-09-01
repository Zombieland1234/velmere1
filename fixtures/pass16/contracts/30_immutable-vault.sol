// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ImmutableVault {address public immutable owner;constructor(){owner=msg.sender;}receive() external payable{} }
