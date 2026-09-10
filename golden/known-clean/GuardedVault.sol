// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GuardedVault (Golden Corpus: Known-Clean Reference)
 * @notice Fully secure vault with nonReentrant mutex guard and virtual shares offset
 * to eliminate both reentrancy and first-depositor inflation attacks.
 */
contract GuardedVault {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status = _NOT_ENTERED;

    mapping(address => uint256) public balances;
    uint256 public totalAssets;
    uint256 public totalShares;

    // Virtual offset to prevent inflation attacks (OpenZeppelin standard)
    uint256 private constant _DECIMALS_OFFSET = 3;

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    function deposit() external payable nonReentrant {
        require(msg.value > 0, "Zero deposit");
        uint256 shares = previewDeposit(msg.value);
        balances[msg.sender] += shares;
        totalShares += shares;
        totalAssets += msg.value;
    }

    function withdraw(uint256 shares) external nonReentrant {
        require(balances[msg.sender] >= shares, "Insufficient shares");
        uint256 assets = (shares * (totalAssets + 1)) / (totalShares + 10 ** _DECIMALS_OFFSET);
        
        // Strict Checks-Effects-Interactions
        balances[msg.sender] -= shares;
        totalShares -= shares;
        totalAssets -= assets;

        (bool success, ) = msg.sender.call{value: assets}("");
        require(success, "ETH transfer failed");
    }

    function previewDeposit(uint256 assets) public view returns (uint256) {
        return (assets * (totalShares + 10 ** _DECIMALS_OFFSET)) / (totalAssets + 1);
    }
}
