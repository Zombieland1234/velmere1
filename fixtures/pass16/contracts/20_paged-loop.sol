// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PagedLoop {address[] public users;function add(address a) external {users.push(a);}function slice(uint start,uint count) external view returns(address[] memory out){uint end=start+count;if(end>users.length)end=users.length;out=new address[](end-start);for(uint i=start;i<end;i++)out[i-start]=users[i];} }
