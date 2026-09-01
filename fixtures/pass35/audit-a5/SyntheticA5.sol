// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
contract SyntheticA5 {
    address public owner;
    constructor() { owner = msg.sender; }
    function privileged() external { require(tx.origin == owner, "owner"); }
    function forward(address target, bytes calldata data) external returns (bytes memory) {
        require(msg.sender == owner, "owner");
        (bool ok, bytes memory result) = target.delegatecall(data);
        require(ok, "delegatecall");
        return result;
    }
}
