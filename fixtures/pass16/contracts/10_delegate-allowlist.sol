// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DelegateAllowlist {mapping(address=>bool) public allowed; address public owner; constructor(){owner=msg.sender;} function set(address a,bool v) external {require(msg.sender==owner);allowed[a]=v;} function run(address target,bytes calldata data) external {require(allowed[target]);(bool ok,)=target.delegatecall(data);require(ok);} }
