// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract InitializerRisk {
    address public owner;
    function initialize(address nextOwner) external {
        owner = nextOwner;
    }
}
