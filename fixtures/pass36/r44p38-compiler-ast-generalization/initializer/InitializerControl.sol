// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "./Initializable.sol";

contract InitializerControl is Initializable {
    address public owner;
    function initialize(address nextOwner) external initializer {
        owner = nextOwner;
    }
}
