// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library Slot {bytes32 constant POS=keccak256("velmere.storage.v1");struct Data{address owner;uint value;}function data() internal pure returns(Data storage d){bytes32 p=POS;assembly{d.slot:=p}}} contract Namespaced {function owner() external view returns(address){return Slot.data().owner;}}
