// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract OneTimeInitializer {address public owner; bool public initialized; function initialize(address a) external {require(!initialized);initialized=true;owner=a;} }
