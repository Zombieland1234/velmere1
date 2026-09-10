// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
interface AggregatorV3Interface { function latestRoundData() external view returns (uint80,int256,uint256,uint256,uint80); }
contract VLM_ORACLE_LINK_01_Control {
    AggregatorV3Interface public immutable feed;
    AggregatorV3Interface public immutable sequencerUptimeFeed;
    uint256 public constant MAX_STALENESS = 1 hours;
    uint256 public constant GRACE_PERIOD = 1 hours;
    constructor(AggregatorV3Interface f, AggregatorV3Interface s) { feed = f; sequencerUptimeFeed = s; }
    function price() external view returns (uint256) {
        (, int256 sequencerAnswer,, uint256 sequencerStartedAt,) = sequencerUptimeFeed.latestRoundData();
        require(sequencerAnswer == 0, "sequencer down");
        require(block.timestamp - sequencerStartedAt > GRACE_PERIOD, "grace");
        (, int256 answer,, uint256 updatedAt,) = feed.latestRoundData();
        require(answer > 0, "bad answer");
        require(updatedAt > 0, "no timestamp");
        require(block.timestamp - updatedAt <= MAX_STALENESS, "stale");
        return uint256(answer);
    }
}
