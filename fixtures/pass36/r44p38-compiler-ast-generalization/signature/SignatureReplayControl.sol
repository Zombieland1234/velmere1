// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SignatureReplayControl {
    mapping(address => uint256) public credit;
    mapping(address => uint256) public nonces;
    function claim(address recipient, uint256 amount, uint8 v, bytes32 r, bytes32 s) external {
        uint256 nonce = nonces[msg.sender]++;
        bytes32 digest = keccak256(abi.encode(block.chainid, address(this), recipient, amount, nonce));
        address signer = ecrecover(digest, v, r, s);
        require(signer != address(0), "signature");
        credit[recipient] += amount;
    }
}
