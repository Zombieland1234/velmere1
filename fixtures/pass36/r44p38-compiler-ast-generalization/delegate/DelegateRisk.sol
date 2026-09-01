// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DelegateRisk {
    function execute(address target, bytes calldata payload) external returns (bytes memory) {
        (bool ok, bytes memory response) = target.delegatecall(payload);
        require(ok, "delegate");
        return response;
    }
}
