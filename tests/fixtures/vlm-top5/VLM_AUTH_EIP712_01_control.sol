// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library ECDSA {
    function recover(bytes32 hash, bytes memory) internal pure returns (address) {
        return address(uint160(uint256(hash))); // semantic fixture stub
    }
}

contract VLM_AUTH_EIP712_01_Control {
    mapping(address => uint256) public nonces;
    mapping(address => uint256) public allowance;
    bytes32 private constant TYPEHASH = keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 private constant DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    function _useNonce(address owner) internal returns (uint256 current) {
        current = nonces[owner];
        nonces[owner] = current + 1;
    }

    function _domainSeparatorV4() internal view returns (bytes32) {
        return keccak256(abi.encode(DOMAIN_TYPEHASH, keccak256(bytes("Velmere")), keccak256(bytes("1")), block.chainid, address(this)));
    }

    function _hashTypedDataV4(bytes32 structHash) internal view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", _domainSeparatorV4(), structHash));
    }

    function permit(address owner, address spender, uint256 value, uint256 deadline, bytes memory sig) external {
        require(block.timestamp <= deadline, "expired");
        uint256 nonce = _useNonce(owner);
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(TYPEHASH, owner, spender, value, nonce, deadline)));
        address recovered = ECDSA.recover(digest, sig);
        require(recovered == owner, "bad sig");
        allowance[owner] = value;
    }
}
