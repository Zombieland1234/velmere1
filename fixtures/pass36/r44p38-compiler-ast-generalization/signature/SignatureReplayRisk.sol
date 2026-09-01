// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SignatureReplayRisk {
    mapping(address => uint256) public credit;
    function claim(address recipient, uint256 amount, uint8 v, bytes32 r, bytes32 s) external {
        bytes32 digest = keccak256(abi.encode(recipient, amount));
        address signer = ecrecover(digest, v, r, s);
        require(signer != address(0), "signature");
        credit[recipient] += amount;
    }
}
