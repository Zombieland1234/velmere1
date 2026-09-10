// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VulnerableInflationVault (Golden Corpus: Known-Vulnerable Reference)
 * @notice Vulnerable to first-depositor vault share inflation and donation attack (SWC-101, CWE-682).
 * Lacks virtual shares offset or dead-share burn.
 */
contract VulnerableInflationVault {
    mapping(address => uint256) public balanceOf;
    uint256 public totalSupply;
    uint256 public totalAssets;

    function deposit(uint256 amount) external returns (uint256 shares) {
        if (totalSupply == 0) {
            shares = amount;
        } else {
            // VULNERABILITY: Integer division rounds down to 0 for subsequent small depositors
            shares = (amount * totalSupply) / totalAssets;
        }

        require(shares > 0, "Zero shares minted");
        balanceOf[msg.sender] += shares;
        totalSupply += shares;
        totalAssets += amount;
    }

    function totalAssetsAmount() external view returns (uint256) {
        return totalAssets;
    }
}
