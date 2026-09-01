// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DeadlineWindow {function execute(uint deadline) external view {require(block.timestamp<=deadline);}}
