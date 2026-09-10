// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title InsecureTxOriginWallet (Golden Corpus: Known-Vulnerable Reference)
 * @notice Vulnerable to phishing authorization attacks (SWC-115, CWE-284).
 * Employs tx.origin for caller verification.
 */
contract InsecureTxOriginWallet {
    address public owner;

    constructor() payable {
        owner = msg.sender;
    }

    // VULNERABILITY: tx.origin authorization allows phishing contracts to steal funds
    function transferTo(address payable recipient, uint256 amount) external {
        require(tx.origin == owner, "Caller not authorized");
        recipient.transfer(amount);
    }
}
