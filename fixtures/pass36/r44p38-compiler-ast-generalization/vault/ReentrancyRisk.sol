// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ReentrancyRisk {
    mapping(address => uint256) public balanceOf;
    function deposit() external payable { balanceOf[msg.sender] += msg.value; }
    function withdraw(uint256 amount) external {
        require(balanceOf[msg.sender] >= amount, "balance");
        (bool ok,) = payable(msg.sender).call{value: amount}("");
        require(ok, "call");
        balanceOf[msg.sender] -= amount;
    }
}
