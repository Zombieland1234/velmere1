// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {
    RiskVault,
    ControlVault,
    RiskSupplyToken,
    ControlSupplyToken,
    RiskOwnership,
    ControlOwnership,
    RiskBridge,
    ControlBridge,
    RiskPausableLedger,
    ControlPausableLedger,
    RiskBlacklistToken,
    ControlBlacklistToken,
    RiskFeeConfig,
    ControlFeeConfig,
    RiskQuorum,
    ControlQuorum
} from "../src/R44P41InvariantTargets.sol";

interface Vm {
    function deal(address account, uint256 newBalance) external;
}

abstract contract StdInvariantLite {
    struct FuzzSelector { address addr; bytes4[] selectors; }
    struct FuzzArtifactSelector { string artifact; bytes4[] selectors; }
    struct FuzzInterface { address addr; string[] artifacts; }

    address[] private _targetedContracts;
    function targetContract(address account) internal { _targetedContracts.push(account); }

    function targetContracts() public view returns (address[] memory) { return _targetedContracts; }
    function excludeContracts() public pure returns (address[] memory rows) { rows = new address[](0); }
    function targetSenders() public pure returns (address[] memory rows) { rows = new address[](0); }
    function excludeSenders() public pure returns (address[] memory rows) { rows = new address[](0); }
    function targetArtifacts() public pure returns (string[] memory rows) { rows = new string[](0); }
    function excludeArtifacts() public pure returns (string[] memory rows) { rows = new string[](0); }
    function targetSelectors() public pure returns (FuzzSelector[] memory rows) { rows = new FuzzSelector[](0); }
    function excludeSelectors() public pure returns (FuzzSelector[] memory rows) { rows = new FuzzSelector[](0); }
    function targetArtifactSelectors() public pure returns (FuzzArtifactSelector[] memory rows) { rows = new FuzzArtifactSelector[](0); }
    function targetInterfaces() public pure returns (FuzzInterface[] memory rows) { rows = new FuzzInterface[](0); }
}

address constant R44P41_VM = address(uint160(uint256(keccak256("hevm cheat code"))));
address constant R44P41_RECIPIENT = address(0xBEEF);
bytes32 constant R44P41_MESSAGE_ID = keccak256("VELMERE_R44P41_REPLAY_MESSAGE");
uint256 constant R44P41_INITIAL_BALANCE = 1_000_000;

contract VaultRiskHandler {
    RiskVault internal immutable target;
    constructor(RiskVault value) { target = value; }
    receive() external payable {}
    function deposit(uint96 raw) external {
        uint256 amount = uint256(raw) % 1 ether + 2;
        target.deposit{value: amount}();
    }
    function withdraw(uint96 raw) external {
        uint256 credit = target.credits(address(this));
        if (credit > 1) target.withdraw(uint256(raw) % (credit - 1) + 1);
    }
}

contract VaultControlHandler {
    ControlVault internal immutable target;
    constructor(ControlVault value) { target = value; }
    receive() external payable {}
    function deposit(uint96 raw) external {
        uint256 amount = uint256(raw) % 1 ether + 1;
        target.deposit{value: amount}();
    }
    function withdraw(uint96 raw) external {
        uint256 credit = target.credits(address(this));
        if (credit > 0) target.withdraw(uint256(raw) % credit + 1);
    }
}

contract SupplyRiskHandler {
    RiskSupplyToken internal immutable target;
    constructor(RiskSupplyToken value) { target = value; }
    function mint(uint128 raw) external {
        target.mint(uint256(raw) % (2_000_000 ether) + 1);
    }
}

contract SupplyControlHandler {
    ControlSupplyToken internal immutable target;
    constructor(ControlSupplyToken value) { target = value; }
    function mint(uint128 raw) external {
        target.mint(uint256(raw) % (2_000_000 ether) + 1);
    }
}

contract OwnershipRiskHandler {
    RiskOwnership internal immutable target;
    constructor(RiskOwnership value) { target = value; }
    function seize(uint160 raw) external {
        address nextOwner = address(raw == 0 ? uint160(1) : raw);
        target.setOwner(nextOwner);
    }
}

contract OwnershipControlHandler {
    ControlOwnership internal immutable target;
    constructor(ControlOwnership value) { target = value; }
    function seize(uint160 raw) external {
        address nextOwner = address(raw == 0 ? uint160(1) : raw);
        target.setOwner(nextOwner);
    }
}

contract BridgeRiskHandler {
    RiskBridge internal immutable target;
    constructor(RiskBridge value) { target = value; }
    function execute(uint256) external { target.execute(R44P41_MESSAGE_ID); }
}

contract BridgeControlHandler {
    ControlBridge internal immutable target;
    constructor(ControlBridge value) { target = value; }
    function execute(uint256) external { target.execute(R44P41_MESSAGE_ID); }
}

contract PauseRiskHandler {
    RiskPausableLedger internal immutable target;
    constructor(RiskPausableLedger value) { target = value; }
    function move(uint96 raw) external {
        uint256 current = target.balanceOf(address(this));
        if (current > 0) target.transfer(R44P41_RECIPIENT, uint256(raw) % current + 1);
    }
}

contract PauseControlHandler {
    ControlPausableLedger internal immutable target;
    constructor(ControlPausableLedger value) { target = value; }
    function move(uint96 raw) external {
        uint256 current = target.balanceOf(address(this));
        if (current > 0) target.transfer(R44P41_RECIPIENT, uint256(raw) % current + 1);
    }
}

contract BlacklistRiskHandler {
    RiskBlacklistToken internal immutable target;
    constructor(RiskBlacklistToken value) { target = value; }
    function move(uint96 raw) external {
        uint256 current = target.balanceOf(address(this));
        if (current > 0) target.transfer(R44P41_RECIPIENT, uint256(raw) % current + 1);
    }
}

contract BlacklistControlHandler {
    ControlBlacklistToken internal immutable target;
    constructor(ControlBlacklistToken value) { target = value; }
    function move(uint96 raw) external {
        uint256 current = target.balanceOf(address(this));
        if (current > 0) target.transfer(R44P41_RECIPIENT, uint256(raw) % current + 1);
    }
}

contract FeeRiskHandler {
    RiskFeeConfig internal immutable target;
    constructor(RiskFeeConfig value) { target = value; }
    function setFee(uint16 raw) external { target.setFeeBps(uint256(raw)); }
}

contract FeeControlHandler {
    ControlFeeConfig internal immutable target;
    constructor(ControlFeeConfig value) { target = value; }
    function setFee(uint16 raw) external { target.setFeeBps(uint256(raw)); }
}

contract QuorumRiskHandler {
    RiskQuorum internal immutable target;
    constructor(RiskQuorum value) { target = value; }
    function setQuorum(uint16 raw) external { target.setQuorumBps(uint256(raw)); }
}

contract QuorumControlHandler {
    ControlQuorum internal immutable target;
    constructor(ControlQuorum value) { target = value; }
    function setQuorum(uint16 raw) external { target.setQuorumBps(uint256(raw)); }
}

contract VaultRiskInvariant is StdInvariantLite {
    Vm internal constant vm = Vm(R44P41_VM);
    RiskVault internal target;
    function setUp() public {
        target = new RiskVault();
        VaultRiskHandler handler = new VaultRiskHandler(target);
        vm.deal(address(handler), 10_000 ether);
        targetContract(address(handler));
    }
    function invariant_vault_solvency() public view {
        require(address(target).balance >= target.liabilities(), "R44P41_VAULT_INSOLVENT");
    }
}

contract VaultControlInvariant is StdInvariantLite {
    Vm internal constant vm = Vm(R44P41_VM);
    ControlVault internal target;
    function setUp() public {
        target = new ControlVault();
        VaultControlHandler handler = new VaultControlHandler(target);
        vm.deal(address(handler), 10_000 ether);
        targetContract(address(handler));
    }
    function invariant_vault_solvency() public view {
        require(address(target).balance >= target.liabilities(), "R44P41_VAULT_INSOLVENT");
    }
}

contract SupplyCapRiskInvariant is StdInvariantLite {
    RiskSupplyToken internal target;
    function setUp() public {
        target = new RiskSupplyToken();
        targetContract(address(new SupplyRiskHandler(target)));
    }
    function invariant_supply_cap() public view {
        require(target.totalSupply() <= target.CAP(), "R44P41_SUPPLY_CAP_BROKEN");
    }
}

contract SupplyCapControlInvariant is StdInvariantLite {
    ControlSupplyToken internal target;
    function setUp() public {
        target = new ControlSupplyToken();
        targetContract(address(new SupplyControlHandler(target)));
    }
    function invariant_supply_cap() public view {
        require(target.totalSupply() <= target.CAP(), "R44P41_SUPPLY_CAP_BROKEN");
    }
}

contract OwnershipRiskInvariant is StdInvariantLite {
    RiskOwnership internal target;
    address internal initialOwner;
    function setUp() public {
        target = new RiskOwnership();
        initialOwner = target.owner();
        targetContract(address(new OwnershipRiskHandler(target)));
    }
    function invariant_owner_integrity() public view {
        require(target.owner() == initialOwner, "R44P41_OWNER_TAKEOVER");
    }
}

contract OwnershipControlInvariant is StdInvariantLite {
    ControlOwnership internal target;
    address internal initialOwner;
    function setUp() public {
        target = new ControlOwnership();
        initialOwner = target.owner();
        targetContract(address(new OwnershipControlHandler(target)));
    }
    function invariant_owner_integrity() public view {
        require(target.owner() == initialOwner, "R44P41_OWNER_TAKEOVER");
    }
}

contract BridgeReplayRiskInvariant is StdInvariantLite {
    RiskBridge internal target;
    function setUp() public {
        target = new RiskBridge();
        targetContract(address(new BridgeRiskHandler(target)));
    }
    function invariant_bridge_single_execution() public view {
        require(target.executions(R44P41_MESSAGE_ID) <= 1, "R44P41_BRIDGE_REPLAY");
    }
}

contract BridgeReplayControlInvariant is StdInvariantLite {
    ControlBridge internal target;
    function setUp() public {
        target = new ControlBridge();
        targetContract(address(new BridgeControlHandler(target)));
    }
    function invariant_bridge_single_execution() public view {
        require(target.executions(R44P41_MESSAGE_ID) <= 1, "R44P41_BRIDGE_REPLAY");
    }
}

contract PauseRiskInvariant is StdInvariantLite {
    RiskPausableLedger internal target;
    address internal handler;
    function setUp() public {
        target = new RiskPausableLedger();
        handler = address(new PauseRiskHandler(target));
        target.grant(handler, R44P41_INITIAL_BALANCE);
        targetContract(handler);
    }
    function invariant_pause_blocks_movement() public view {
        require(target.balanceOf(handler) == R44P41_INITIAL_BALANCE, "R44P41_PAUSE_BYPASS");
    }
}

contract PauseControlInvariant is StdInvariantLite {
    ControlPausableLedger internal target;
    address internal handler;
    function setUp() public {
        target = new ControlPausableLedger();
        handler = address(new PauseControlHandler(target));
        target.grant(handler, R44P41_INITIAL_BALANCE);
        targetContract(handler);
    }
    function invariant_pause_blocks_movement() public view {
        require(target.balanceOf(handler) == R44P41_INITIAL_BALANCE, "R44P41_PAUSE_BYPASS");
    }
}

contract BlacklistRiskInvariant is StdInvariantLite {
    RiskBlacklistToken internal target;
    address internal handler;
    function setUp() public {
        target = new RiskBlacklistToken();
        handler = address(new BlacklistRiskHandler(target));
        target.grant(handler, R44P41_INITIAL_BALANCE);
        target.setBlacklisted(handler, true);
        targetContract(handler);
    }
    function invariant_blacklist_blocks_movement() public view {
        require(target.balanceOf(handler) == R44P41_INITIAL_BALANCE, "R44P41_BLACKLIST_BYPASS");
    }
}

contract BlacklistControlInvariant is StdInvariantLite {
    ControlBlacklistToken internal target;
    address internal handler;
    function setUp() public {
        target = new ControlBlacklistToken();
        handler = address(new BlacklistControlHandler(target));
        target.grant(handler, R44P41_INITIAL_BALANCE);
        target.setBlacklisted(handler, true);
        targetContract(handler);
    }
    function invariant_blacklist_blocks_movement() public view {
        require(target.balanceOf(handler) == R44P41_INITIAL_BALANCE, "R44P41_BLACKLIST_BYPASS");
    }
}

contract FeeCapRiskInvariant is StdInvariantLite {
    RiskFeeConfig internal target;
    function setUp() public {
        target = new RiskFeeConfig();
        targetContract(address(new FeeRiskHandler(target)));
    }
    function invariant_fee_cap() public view {
        require(target.feeBps() <= target.MAX_FEE_BPS(), "R44P41_FEE_CAP_BROKEN");
    }
}

contract FeeCapControlInvariant is StdInvariantLite {
    ControlFeeConfig internal target;
    function setUp() public {
        target = new ControlFeeConfig();
        targetContract(address(new FeeControlHandler(target)));
    }
    function invariant_fee_cap() public view {
        require(target.feeBps() <= target.MAX_FEE_BPS(), "R44P41_FEE_CAP_BROKEN");
    }
}

contract QuorumRiskInvariant is StdInvariantLite {
    RiskQuorum internal target;
    function setUp() public {
        target = new RiskQuorum();
        targetContract(address(new QuorumRiskHandler(target)));
    }
    function invariant_minimum_quorum() public view {
        require(target.quorumBps() >= target.MIN_QUORUM_BPS(), "R44P41_LOW_QUORUM");
    }
}

contract QuorumControlInvariant is StdInvariantLite {
    ControlQuorum internal target;
    function setUp() public {
        target = new ControlQuorum();
        targetContract(address(new QuorumControlHandler(target)));
    }
    function invariant_minimum_quorum() public view {
        require(target.quorumBps() >= target.MIN_QUORUM_BPS(), "R44P41_LOW_QUORUM");
    }
}

contract R44P41Actor {
    receive() external payable {}
    function callTarget(address target, bytes calldata data) external returns (bool ok, bytes memory output) {
        return target.call(data);
    }
}

contract R44P41RiskReplay {
    Vm internal constant vm = Vm(R44P41_VM);
    receive() external payable {}

    function test_replay_vault_insolvency() public {
        vm.deal(address(this), 1 ether);
        RiskVault target = new RiskVault();
        target.deposit{value: 100}();
        target.withdraw(50);
        require(address(target).balance < target.liabilities(), "risk not reproduced");
    }

    function test_replay_supply_cap() public {
        RiskSupplyToken target = new RiskSupplyToken();
        target.mint(target.CAP() + 1);
        require(target.totalSupply() > target.CAP(), "risk not reproduced");
    }

    function test_replay_owner_takeover() public {
        RiskOwnership target = new RiskOwnership();
        R44P41Actor actor = new R44P41Actor();
        (bool ok,) = actor.callTarget(address(target), abi.encodeCall(target.setOwner, (R44P41_RECIPIENT)));
        require(ok && target.owner() == R44P41_RECIPIENT, "risk not reproduced");
    }

    function test_replay_bridge_replay() public {
        RiskBridge target = new RiskBridge();
        target.execute(R44P41_MESSAGE_ID);
        target.execute(R44P41_MESSAGE_ID);
        require(target.executions(R44P41_MESSAGE_ID) == 2, "risk not reproduced");
    }

    function test_replay_pause_bypass() public {
        RiskPausableLedger target = new RiskPausableLedger();
        R44P41Actor actor = new R44P41Actor();
        target.grant(address(actor), 100);
        (bool ok,) = actor.callTarget(address(target), abi.encodeCall(target.transfer, (R44P41_RECIPIENT, 1)));
        require(ok && target.balanceOf(address(actor)) == 99, "risk not reproduced");
    }

    function test_replay_blacklist_bypass() public {
        RiskBlacklistToken target = new RiskBlacklistToken();
        R44P41Actor actor = new R44P41Actor();
        target.grant(address(actor), 100);
        target.setBlacklisted(address(actor), true);
        (bool ok,) = actor.callTarget(address(target), abi.encodeCall(target.transfer, (R44P41_RECIPIENT, 1)));
        require(ok && target.balanceOf(address(actor)) == 99, "risk not reproduced");
    }

    function test_replay_fee_cap() public {
        RiskFeeConfig target = new RiskFeeConfig();
        R44P41Actor actor = new R44P41Actor();
        (bool ok,) = actor.callTarget(address(target), abi.encodeCall(target.setFeeBps, (target.MAX_FEE_BPS() + 1)));
        require(ok && target.feeBps() > target.MAX_FEE_BPS(), "risk not reproduced");
    }

    function test_replay_low_quorum() public {
        RiskQuorum target = new RiskQuorum();
        R44P41Actor actor = new R44P41Actor();
        (bool ok,) = actor.callTarget(address(target), abi.encodeCall(target.setQuorumBps, (1)));
        require(ok && target.quorumBps() < target.MIN_QUORUM_BPS(), "risk not reproduced");
    }
}

contract R44P41ControlReplay {
    Vm internal constant vm = Vm(R44P41_VM);
    receive() external payable {}

    function test_control_vault_solvency() public {
        vm.deal(address(this), 1 ether);
        ControlVault target = new ControlVault();
        target.deposit{value: 100}();
        target.withdraw(50);
        require(address(target).balance == target.liabilities(), "control broken");
    }

    function test_control_supply_cap() public {
        ControlSupplyToken target = new ControlSupplyToken();
        (bool ok,) = address(target).call(abi.encodeCall(target.mint, (target.CAP() + 1)));
        require(!ok && target.totalSupply() == 0, "control broken");
    }

    function test_control_owner_integrity() public {
        ControlOwnership target = new ControlOwnership();
        address initialOwner = target.owner();
        R44P41Actor actor = new R44P41Actor();
        (bool ok,) = actor.callTarget(address(target), abi.encodeCall(target.setOwner, (R44P41_RECIPIENT)));
        require(!ok && target.owner() == initialOwner, "control broken");
    }

    function test_control_bridge_replay() public {
        ControlBridge target = new ControlBridge();
        target.execute(R44P41_MESSAGE_ID);
        (bool ok,) = address(target).call(abi.encodeCall(target.execute, (R44P41_MESSAGE_ID)));
        require(!ok && target.executions(R44P41_MESSAGE_ID) == 1, "control broken");
    }

    function test_control_pause() public {
        ControlPausableLedger target = new ControlPausableLedger();
        R44P41Actor actor = new R44P41Actor();
        target.grant(address(actor), 100);
        (bool ok,) = actor.callTarget(address(target), abi.encodeCall(target.transfer, (R44P41_RECIPIENT, 1)));
        require(!ok && target.balanceOf(address(actor)) == 100, "control broken");
    }

    function test_control_blacklist() public {
        ControlBlacklistToken target = new ControlBlacklistToken();
        R44P41Actor actor = new R44P41Actor();
        target.grant(address(actor), 100);
        target.setBlacklisted(address(actor), true);
        (bool ok,) = actor.callTarget(address(target), abi.encodeCall(target.transfer, (R44P41_RECIPIENT, 1)));
        require(!ok && target.balanceOf(address(actor)) == 100, "control broken");
    }

    function test_control_fee_cap() public {
        ControlFeeConfig target = new ControlFeeConfig();
        R44P41Actor actor = new R44P41Actor();
        (bool ok,) = actor.callTarget(address(target), abi.encodeCall(target.setFeeBps, (target.MAX_FEE_BPS() + 1)));
        require(!ok && target.feeBps() <= target.MAX_FEE_BPS(), "control broken");
    }

    function test_control_quorum() public {
        ControlQuorum target = new ControlQuorum();
        R44P41Actor actor = new R44P41Actor();
        (bool ok,) = actor.callTarget(address(target), abi.encodeCall(target.setQuorumBps, (1)));
        require(!ok && target.quorumBps() >= target.MIN_QUORUM_BPS(), "control broken");
    }
}
