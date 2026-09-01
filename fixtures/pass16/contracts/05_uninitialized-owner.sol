// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract UninitializedOwner { address public owner; function initialize(address a) external {owner=a;} function mint() external view {require(msg.sender==owner);} }
