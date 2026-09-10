// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
interface AggregatorV3Interface { function latestRoundData() external view returns (uint80,int256,uint256,uint256,uint80); }
contract VLM_ORACLE_LINK_01_Vulnerable {
    AggregatorV3Interface public immutable feed;
    constructor(AggregatorV3Interface f) { feed = f; }
    function price() external view returns (uint256) {
        (, int256 answer,,,) = feed.latestRoundData();
        return uint256(answer);
    }
}
