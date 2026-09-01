// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PrivilegeWriteRisk {
    address public owner;
    constructor() { owner = msg.sender; }
    function setOwner(address nextOwner) external { owner = nextOwner; }
}
