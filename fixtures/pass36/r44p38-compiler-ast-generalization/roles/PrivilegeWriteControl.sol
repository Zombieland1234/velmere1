// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "../access/Owned.sol";

contract PrivilegeWriteControl is Owned {
    function setOwner(address nextOwner) external onlyOwner { owner = nextOwner; }
}
