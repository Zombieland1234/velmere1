// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CheckedCall {function forward(address target, bytes calldata data) external { (bool ok, bytes memory ret)=target.call(data); require(ok,string(ret)); } }
