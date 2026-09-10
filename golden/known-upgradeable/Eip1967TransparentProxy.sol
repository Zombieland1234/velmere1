// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Eip1967TransparentProxy (Golden Corpus: Upgradeable Reference)
 * @notice Standard EIP-1967 proxy storing implementation and admin in pseudo-random slots.
 */
contract Eip1967TransparentProxy {
    // bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1)
    bytes32 internal constant _IMPLEMENTATION_SLOT =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;

    // bytes32(uint256(keccak256('eip1967.proxy.admin')) - 1)
    bytes32 internal constant _ADMIN_SLOT =
        0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;

    constructor(address logic, address admin) {
        assembly {
            sstore(_IMPLEMENTATION_SLOT, logic)
            sstore(_ADMIN_SLOT, admin)
        }
    }

    fallback() external payable {
        assembly {
            let impl := sload(_IMPLEMENTATION_SLOT)
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {}
}
