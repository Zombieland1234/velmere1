// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TxOriginRisk {
    address private owner;
    constructor() { owner = msg.sender; }
    function sweep(address payable recipient) external {
        require(tx.origin == owner, "origin");
        recipient.transfer(address(this).balance);
    }
    receive() external payable {}
}
