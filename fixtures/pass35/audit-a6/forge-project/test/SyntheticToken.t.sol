// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

// Fixture source used to bind the Forge adapter contract. It is not compiled in A6.
contract SyntheticTokenTest {
    function testTransferConservesSupply() external pure returns (bool) { return true; }
    function testUnauthorizedMintReverts() external pure returns (bool) { return true; }
    function testBurnReducesSupply() external pure returns (bool) { return true; }
    function testOwnerMintIncreasesSupply() external pure returns (bool) { return true; }
}
