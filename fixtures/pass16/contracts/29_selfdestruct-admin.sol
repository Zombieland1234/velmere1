// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Destructible {address public owner;constructor(){owner=msg.sender;}function destroy(address payable to) external {require(msg.sender==owner);selfdestruct(to);} }
