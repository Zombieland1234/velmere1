// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ILendingOracle { function read() external view returns (uint256 price, uint256 updatedAt); }
contract LendingOracle is ILendingOracle {
    uint256 public price;
    uint256 public updatedAt;
    function set(uint256 p, uint256 t) external { price = p; updatedAt = t; }
    function read() external view returns (uint256, uint256) { return (price, updatedAt); }
}

contract SolvencyRisk {
    mapping(address => uint256) public collateral;
    mapping(address => uint256) public debt;
    function seed(uint256 c, uint256 d) external { collateral[msg.sender] = c; debt[msg.sender] = d; }
    function withdraw(uint256 amount) external { collateral[msg.sender] -= amount; }
}

contract SolvencyControl {
    ILendingOracle public immutable oracle;
    mapping(address => uint256) public collateral;
    mapping(address => uint256) public debt;
    constructor(ILendingOracle nextOracle) { oracle = nextOracle; }
    function _isHealthy(uint256 c, uint256 d, uint256 price) internal pure returns (bool) {
        if (price == 0) return false;
        if (c > type(uint256).max / price) return false;
        if (d > type(uint256).max / 2e18) return false;
        return c * price >= d * 2e18;
    }
    function seed(uint256 c, uint256 d) external {
        (uint256 price, uint256 updatedAt) = oracle.read();
        require(block.timestamp >= updatedAt && block.timestamp - updatedAt <= 1 hours, "STALE");
        require(_isHealthy(c, d, price), "INSOLVENT_SEED");
        collateral[msg.sender] = c;
        debt[msg.sender] = d;
    }
    function withdraw(uint256 amount) external {
        (uint256 price, uint256 updatedAt) = oracle.read();
        require(block.timestamp >= updatedAt && block.timestamp - updatedAt <= 1 hours, "STALE");
        uint256 remaining = collateral[msg.sender] - amount;
        require(_isHealthy(remaining, debt[msg.sender], price), "INSOLVENT");
        collateral[msg.sender] = remaining;
    }
    function healthy(address account) external view returns (bool) {
        (uint256 price,) = oracle.read();
        return _isHealthy(collateral[account], debt[account], price);
    }
}
