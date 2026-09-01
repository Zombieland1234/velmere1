// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract UncheckedCallControl {
    function execute(address target, bytes calldata payload) external {
        (bool ok, bytes memory response) = target.call(payload);
        require(ok, string(response));
    }
}
