// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
interface IERC20 { function transferFrom(address,address,uint256) external returns(bool); function balanceOf(address) external view returns(uint256); }
contract VLM_DEFI_4626_01_Vulnerable {
    IERC20 public immutable asset;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    constructor(IERC20 a) { asset = a; }
    function totalAssets() public view returns (uint256) { return asset.balanceOf(address(this)); }
    function deposit(uint256 assets, address receiver) external returns (uint256 shares) {
        shares = assets * totalSupply / totalAssets();
        asset.transferFrom(msg.sender, address(this), assets);
        totalSupply += shares;
        balanceOf[receiver] += shares;
    }
}
