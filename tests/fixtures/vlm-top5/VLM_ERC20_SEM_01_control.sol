// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
interface IERC20 { function transferFrom(address,address,uint256) external returns(bool); function balanceOf(address) external view returns(uint256); }
contract VLM_ERC20_SEM_01_Control {
    IERC20 public immutable asset;
    mapping(address => uint256) public credit;
    constructor(IERC20 a) { asset = a; }
    function deposit(uint256 assets, address receiver) external {
        uint256 beforeBal = asset.balanceOf(address(this));
        asset.transferFrom(msg.sender, address(this), assets);
        uint256 afterBal = asset.balanceOf(address(this));
        uint256 received = afterBal - beforeBal;
        credit[receiver] += received;
    }
}
