// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TxOriginAdmin { address public owner; constructor(){owner=msg.sender;} function sweep(address payable to) external {require(tx.origin==owner);to.transfer(address(this).balance);} receive() external payable{} }
