// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library NamespacedState {
    bytes32 internal constant SLOT = keccak256("velmere.r44p11.namespaced.state");
    struct Data { address owner; bool initialized; uint256 value; }
    function data() internal pure returns (Data storage state) {
        bytes32 slot = SLOT;
        assembly { state.slot := slot }
    }
}
