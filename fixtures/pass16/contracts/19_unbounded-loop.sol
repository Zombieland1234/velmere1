// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract UnboundedLoop {address[] public users;function add(address a) external {users.push(a);}function pay() external payable {for(uint i=0;i<users.length;i++){payable(users[i]).transfer(1);}} }
