// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPriceOracle {
    function read() external view returns (uint256 price, uint256 updatedAt);
}

contract MutablePriceOracle is IPriceOracle {
    uint256 public price;
    uint256 public updatedAt;
    function set(uint256 nextPrice, uint256 nextUpdatedAt) external { price = nextPrice; updatedAt = nextUpdatedAt; }
    function read() external view returns (uint256, uint256) { return (price, updatedAt); }
}

contract OracleRisk {
    IPriceOracle public immutable oracle;
    constructor(IPriceOracle nextOracle) { oracle = nextOracle; }
    function borrowLimit(uint256 collateral) external view returns (uint256) {
        (uint256 price,) = oracle.read();
        return collateral * price / 1e18;
    }
}

contract OracleControl {
    IPriceOracle public immutable oracle;
    uint256 public constant MAX_AGE = 1 hours;
    constructor(IPriceOracle nextOracle) { oracle = nextOracle; }
    function borrowLimit(uint256 collateral) external view returns (uint256) {
        (uint256 price, uint256 updatedAt) = oracle.read();
        require(block.timestamp >= updatedAt && block.timestamp - updatedAt <= MAX_AGE, "STALE_ORACLE");
        return collateral * price / 1e18;
    }
}
