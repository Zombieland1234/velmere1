// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TimestampLottery {function win() external view returns(bool){return block.timestamp%17==0;} }
