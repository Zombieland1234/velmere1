// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "./TokenCore.sol";

contract OpenMintRisk is TokenCore {
    function mint(address recipient, uint256 amount) external {
        _mint(recipient, amount);
    }
}
