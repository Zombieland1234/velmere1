// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SnapshotQuorum {uint public snapshotSupply=1_000_000;function passed(uint votes) external view returns(bool){return votes*100>=snapshotSupply*10;} }
