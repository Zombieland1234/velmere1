// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract UncheckedCall {function forward(address target, bytes calldata data) external {target.call(data);} }
