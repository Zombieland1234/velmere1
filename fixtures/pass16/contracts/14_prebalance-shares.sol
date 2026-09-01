// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PreBalanceShares {uint public totalShares;mapping(address=>uint) public shares;function deposit() external payable {uint beforeBal=address(this).balance-msg.value;uint minted=totalShares==0?msg.value:msg.value*totalShares/beforeBal;require(minted>0);shares[msg.sender]+=minted;totalShares+=minted;} }
