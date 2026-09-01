// Synthetic offline fixture. Not a deployed customer contract.
pragma solidity 0.8.24;
contract RiskyUpgradeableVault {
    address public owner;
    address public implementation;
    mapping(address => uint256) public balances;
    modifier onlyOwner() { require(msg.sender == owner, 'owner'); _; }
    function upgradeTo(address next) external onlyOwner { implementation = next; }
    function grantRole(bytes32, address) external onlyOwner { }
    function mint(address user, uint256 amount) external onlyOwner { balances[user] += amount; }
    function pause() external onlyOwner { }
    function setFee(uint256 fee) external onlyOwner { require(fee < 1000); }
    function authorizeViaOrigin() external view returns (bool) { return tx.origin == owner; }
    function execute(address target, bytes calldata data) external onlyOwner returns (bytes memory) {
        (bool ok, bytes memory result) = target.delegatecall(data);
        require(ok);
        return result;
    }
    function externalPay(address payable target, uint256 value) external onlyOwner {
        (bool ok,) = target.call{value: value}('');
        require(ok);
    }
    function batchWithdraw(address[] calldata users) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) { balances[users[i]] = 0; }
    }
    function emergencyDestroy(address payable receiver) external onlyOwner { selfdestruct(receiver); }
}
