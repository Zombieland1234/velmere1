// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {NamespacedState} from "./NamespacedState.sol";

contract LayoutV1 { address public owner; uint256 public value; }
contract LayoutV2Risk { uint256 public value; address public owner; }

contract InitRisk {
    address public owner;
    function initialize(address nextOwner) external { owner = nextOwner; }
}

contract InitControl {
    function initialize(address nextOwner) external {
        NamespacedState.Data storage state = NamespacedState.data();
        require(!state.initialized, "ALREADY_INITIALIZED");
        state.initialized = true;
        state.owner = nextOwner;
    }
    function owner() external view returns (address) { return NamespacedState.data().owner; }
}
