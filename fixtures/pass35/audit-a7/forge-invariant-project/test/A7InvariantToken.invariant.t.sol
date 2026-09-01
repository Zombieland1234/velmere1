// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;
import {A7InvariantToken} from "../src/A7InvariantToken.sol";
// Prepared target only. A7 does not claim official Forge execution.
contract A7InvariantTokenPreparedTarget {
    A7InvariantToken internal token;
    address[] internal trackedActors;
    function setUp() external { token = new A7InvariantToken(1_000_000 ether); trackedActors.push(address(this)); }
    function invariant_totalSupplyEqualsTrackedBalances() external view returns (bool) { uint256 sum; for (uint256 i; i < trackedActors.length; i++) sum += token.balanceOf(trackedActors[i]); return sum == token.totalSupply(); }
    function invariant_balancesNeverExceedSupply() external view returns (bool) { for (uint256 i; i < trackedActors.length; i++) if (token.balanceOf(trackedActors[i]) > token.totalSupply()) return false; return true; }
    function invariant_ownerIsStable() external view returns (bool) { return token.owner() == address(this); }
    function invariant_contractBalanceAccountingNonNegative() external pure returns (bool) { return true; }
}
