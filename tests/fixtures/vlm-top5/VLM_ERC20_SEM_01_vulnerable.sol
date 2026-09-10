// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
interface IERC20 { function transferFrom(address,address,uint256) external returns(bool); function balanceOf(address) external view returns(uint256); }
contract VLM_ERC20_SEM_01_Vulnerable {
    IERC20 public immutable asset;
    mapping(address => uint256) public credit;
    constructor(IERC20 a) { asset = a; }
    function deposit(uint256 assets, address receiver) external {
        asset.transferFrom(msg.sender, address(this), assets);
        credit[receiver] += assets; // assumes assets == amount received
    }
}
