// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ReentrancyBank (Golden Corpus: Known-Vulnerable Reference)
 * @notice Vulnerable to classic reentrancy (SWC-107, CWE-841).
 * Executes external CALL before updating internal balance mapping.
 */
contract ReentrancyBank {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");

        // VULNERABILITY: External interaction before state effect (Checks-Effects-Interactions violation)
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        // State update happens too late!
        balances[msg.sender] -= amount;
    }
}
