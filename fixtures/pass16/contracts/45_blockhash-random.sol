// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BlockhashRandom {function draw() external view returns(uint){return uint(blockhash(block.number-1))%100;} }
