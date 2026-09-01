// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

abstract contract Initializable {
    bool private initialized;
    modifier initializer() {
        require(!initialized, "initialized");
        initialized = true;
        _;
    }
}
