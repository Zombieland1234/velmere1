// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PublicReveal {bytes32 public answer;function submit(bytes32 guess) external view returns(bool){return guess==answer;} }
