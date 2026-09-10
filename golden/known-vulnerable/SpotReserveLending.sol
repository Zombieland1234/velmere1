// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IUniswapV2Pair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
}

/**
 * @title SpotReserveLending (Golden Corpus: Known-Vulnerable Reference)
 * @notice Vulnerable to atomic flash-loan spot price manipulation (SWC-114, CWE-829).
 * Directly consumes raw getReserves() for collateral pricing without TWAP.
 */
contract SpotReserveLending {
    IUniswapV2Pair public immutable pair;

    constructor(address _pair) {
        pair = IUniswapV2Pair(_pair);
    }

    // VULNERABILITY: Instantaneous reserves are easily manipulable via flash loans
    function getSpotCollateralPrice() public view returns (uint256) {
        (uint112 r0, uint112 r1, ) = pair.getReserves();
        require(r0 > 0, "No liquidity");
        return (uint256(r1) * 1e18) / r0;
    }
}
