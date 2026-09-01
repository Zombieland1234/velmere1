// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract UncheckedCallRisk {
    function execute(address target, bytes calldata payload) external {
        target.call(payload);
    }
}
