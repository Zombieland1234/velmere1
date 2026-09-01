// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

abstract contract TokenCore {
    mapping(address => uint256) public balanceOf;
    uint256 public totalSupply;
    function _mint(address recipient, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[recipient] += amount;
    }
}
