// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PolicyConsistent {mapping(address=>bool) public blocked;mapping(address=>uint) public balance;address public owner;constructor(){owner=msg.sender;}function move(address from,address to,uint a) public {require(!blocked[from]&&!blocked[to]);require(msg.sender==from||msg.sender==owner);balance[from]-=a;balance[to]+=a;} }
