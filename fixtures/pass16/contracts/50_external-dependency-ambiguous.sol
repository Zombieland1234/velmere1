// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IExternalRisk {function score(address) external view returns(uint);} contract ExternalDependency {IExternalRisk public source;constructor(IExternalRisk s){source=s;}function allowed(address a) external view returns(bool){return source.score(a)<50;} }
