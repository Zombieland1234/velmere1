// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FeeOnTransferToken (Golden Corpus: Non-Standard Edge Reference)
 * @notice Fee-on-transfer / reflection token where recipient receives (amount - fee).
 * Causes accounting insolvency in naive vaults expecting balance += amount.
 */
contract FeeOnTransferToken {
    string public name = "Tax Reflection Token";
    string public symbol = "TAX";
    uint8 public decimals = 18;
    uint256 public totalSupply = 10000000 * 1e18;

    uint256 public constant TAX_PERCENT = 5; // 5% fee burned or taken
    mapping(address => uint256) public balanceOf;

    constructor() {
        balanceOf[msg.sender] = totalSupply;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient");
        uint256 fee = (amount * TAX_PERCENT) / 100;
        uint256 netAmount = amount - fee;

        balanceOf[msg.sender] -= amount;
        balanceOf[to] += netAmount;
        balanceOf[address(0)] += fee; // Burn tax

        return true;
    }
}
