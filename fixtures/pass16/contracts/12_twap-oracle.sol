// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ITwap{function consult(uint32 window) external view returns(uint);} contract TwapConsumer {ITwap public oracle; constructor(ITwap o){oracle=o;} function value(uint amount) external view returns(uint){return amount*oracle.consult(1800)/1e18;} }
