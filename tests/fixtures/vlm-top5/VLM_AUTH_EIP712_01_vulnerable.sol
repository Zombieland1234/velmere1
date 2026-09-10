// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
contract VLM_AUTH_EIP712_01_Vulnerable {
    mapping(address => uint256) public allowance;
    function execute(address signer, address spender, uint256 amount, bytes32 hash, uint8 v, bytes32 r, bytes32 s) external {
        address recovered = ecrecover(hash, v, r, s);
        require(recovered == signer, "bad sig");
        allowance[signer] = amount;
    }
}
