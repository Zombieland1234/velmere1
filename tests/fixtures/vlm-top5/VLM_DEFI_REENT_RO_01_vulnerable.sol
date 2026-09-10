// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
interface IHook { function onSwap(address user) external; }
contract VLM_DEFI_REENT_RO_01_Vulnerable {
    uint256 public reserve;
    uint256 public totalShares;
    IHook public hook;
    constructor(IHook h) { hook = h; }
    function swap(uint256 newReserve) external {
        reserve = newReserve;
        hook.onSwap(msg.sender); // callback can call getVirtualPrice() while accounting is in-flight
        reserve = newReserve + 1;
    }
    function getVirtualPrice() external view returns (uint256) {
        return reserve * 1e18 / totalShares;
    }
}
