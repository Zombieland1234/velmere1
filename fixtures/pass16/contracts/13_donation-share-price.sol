// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract DonationShares {uint public totalShares; mapping(address=>uint) public shares; function deposit() external payable {uint minted=totalShares==0?msg.value:msg.value*totalShares/address(this).balance;shares[msg.sender]+=minted;totalShares+=minted;} }
