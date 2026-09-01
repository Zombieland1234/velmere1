// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVRF{function request() external returns(uint);} contract VrfConsumer {IVRF public vrf;constructor(IVRF v){vrf=v;}function draw() external returns(uint){return vrf.request();}}
