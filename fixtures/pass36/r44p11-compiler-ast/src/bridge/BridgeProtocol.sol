// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BridgeRisk {
    mapping(bytes32 => bool) public executed;
    function execute(bytes calldata message) external {
        bytes32 id = keccak256(message);
        require(!executed[id], "REPLAY");
        executed[id] = true;
    }
}

contract BridgeControl {
    address public immutable messenger;
    mapping(bytes32 => bool) public executed;
    constructor(address nextMessenger) { messenger = nextMessenger; }
    function execute(uint256 sourceChain, uint256 destinationChain, address destination, uint256 nonce, bytes calldata message) external {
        require(msg.sender == messenger, "MESSENGER");
        require(destinationChain == block.chainid && destination == address(this), "DOMAIN");
        bytes32 id = keccak256(abi.encode(sourceChain, destinationChain, destination, nonce, message));
        require(!executed[id], "REPLAY");
        executed[id] = true;
    }
}
