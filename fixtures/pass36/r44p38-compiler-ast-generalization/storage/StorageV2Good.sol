// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
contract StorageV2Good { address public owner; uint256 public totalAssets; mapping(address => uint256) public balanceOf; uint256 public feeBps; }
