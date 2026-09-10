// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract VLM_DEFI_REENT_RO_01_Control {
    uint256 public reserve;
    uint256 public totalShares;
    bool private _entered;

    modifier nonReentrant() {
        require(!_entered, "reentrant");
        _entered = true;
        _;
        _entered = false;
    }

    modifier nonReentrantView() {
        require(!_entered, "read-only reentrant");
        _;
    }

    function swap(uint256 newReserve) external nonReentrant {
        reserve = newReserve;
        reserve = newReserve + 1;
    }

    function getVirtualPrice() external view nonReentrantView returns (uint256) {
        return reserve * 1e18 / totalShares;
    }
}
