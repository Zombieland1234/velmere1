// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "./TokenCore.sol";
import "../access/Owned.sol";

contract OpenMintControl is TokenCore, Owned {
    function mint(address recipient, uint256 amount) external onlyOwner {
        _mint(recipient, amount);
    }
}
