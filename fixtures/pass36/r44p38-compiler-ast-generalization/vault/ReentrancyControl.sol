// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ReentrancyControl {
    mapping(address => uint256) public balanceOf;
    bool private entered;
    modifier nonReentrant() {
        require(!entered, "entered");
        entered = true;
        _;
        entered = false;
    }
    function deposit() external payable { balanceOf[msg.sender] += msg.value; }
    function withdraw(uint256 amount) external nonReentrant {
        require(balanceOf[msg.sender] >= amount, "balance");
        balanceOf[msg.sender] -= amount;
        (bool ok,) = payable(msg.sender).call{value: amount}("");
        require(ok, "call");
    }
}
