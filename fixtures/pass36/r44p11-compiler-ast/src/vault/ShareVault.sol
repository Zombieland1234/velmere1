// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ShareRisk {
    uint256 public totalAssets;
    uint256 public totalShares;
    mapping(address => uint256) public shares;
    function donate(uint256 assets) external { totalAssets += assets; }
    function previewDeposit(uint256 assets) public view returns (uint256) {
        return totalShares == 0 ? assets : assets * totalShares / (totalAssets + assets);
    }
    function deposit(uint256 assets) external returns (uint256 minted) {
        minted = previewDeposit(assets);
        totalAssets += assets;
        totalShares += minted;
        shares[msg.sender] += minted;
    }
}

contract ShareControl {
    uint256 public totalAssets;
    uint256 public totalShares;
    mapping(address => uint256) public shares;
    function donate(uint256 assets) external { totalAssets += assets; }
    function previewDeposit(uint256 assets) public view returns (uint256) {
        return totalShares == 0 ? assets : assets * totalShares / totalAssets;
    }
    function deposit(uint256 assets) external returns (uint256 minted) {
        minted = previewDeposit(assets);
        require(minted > 0, "ZERO_SHARES");
        totalAssets += assets;
        totalShares += minted;
        shares[msg.sender] += minted;
    }
}
