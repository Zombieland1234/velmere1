// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title WeirdUSDTToken (Golden Corpus: Non-Standard Edge Reference)
 * @notice Mimics USDT / BNB-like non-standard ERC-20 tokens that do NOT return bool.
 * Calling transfer() via standard IERC20 causes EVM ABI decoder revert.
 */
contract WeirdUSDTToken {
    string public name = "Tether USD Simulation";
    string public symbol = "USDT";
    uint8 public decimals = 6;
    uint256 public totalSupply = 1000000000 * 1e6;

    mapping(address => uint256) public balanceOf;

    constructor() {
        balanceOf[msg.sender] = totalSupply;
    }

    // NON-STANDARD: Returns void instead of bool!
    function transfer(address to, uint256 amount) public {
        require(balanceOf[msg.sender] >= amount, "Insufficient");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
    }
}
