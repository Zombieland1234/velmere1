// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PermitRisk {
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => uint256) public nonces;
    function permit(address owner, address spender, uint256 value, uint8 v, bytes32 r, bytes32 s) external {
        uint256 nonce = nonces[owner]++;
        bytes32 digest = keccak256(abi.encode(block.chainid, address(this), owner, spender, value, nonce));
        require(ecrecover(digest, v, r, s) == owner, "signature");
        allowance[owner][spender] = value;
    }
}
