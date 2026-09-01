// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "../access/Owned.sol";

contract DelegateControl is Owned {
    address public immutable implementation;
    constructor(address target) { implementation = target; }
    function execute(bytes calldata payload) external onlyOwner returns (bytes memory) {
        (bool ok, bytes memory response) = implementation.delegatecall(payload);
        require(ok, "delegate");
        return response;
    }
}
