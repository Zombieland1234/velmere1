// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract LowQuorum {uint public supply=1_000_000;function passed(uint votes) external pure returns(bool){return votes>=1;} }
