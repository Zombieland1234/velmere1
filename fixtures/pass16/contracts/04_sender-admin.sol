// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SenderAdmin { address public immutable owner; constructor(){owner=msg.sender;} function sweep(address payable to) external {require(msg.sender==owner);to.transfer(address(this).balance);} receive() external payable{} }
