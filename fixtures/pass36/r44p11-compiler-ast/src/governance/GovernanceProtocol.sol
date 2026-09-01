// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract GovernanceRisk {
    function passed(uint256 votes) external pure returns (bool) { return votes >= 1; }
}

contract GovernanceControl {
    uint256 public immutable snapshotSupply;
    constructor(uint256 supply) { snapshotSupply = supply; }
    function passed(uint256 votes) external view returns (bool) { return votes * 100 >= snapshotSupply * 10; }
}
