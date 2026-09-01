// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPair{function spot() external view returns(uint);} contract SpotOracleConsumer {IPair public pair; constructor(IPair p){pair=p;} function value(uint amount) external view returns(uint){return amount*pair.spot()/1e18;} }
