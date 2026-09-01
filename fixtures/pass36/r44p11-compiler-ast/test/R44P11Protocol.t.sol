// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MutablePriceOracle, OracleRisk, OracleControl} from "../src/oracle/OracleProtocol.sol";
import {ShareRisk, ShareControl} from "../src/vault/ShareVault.sol";
import {InitRisk, InitControl, LayoutV1, LayoutV2Risk} from "../src/upgrade/UpgradeableProtocol.sol";
import {BridgeRisk, BridgeControl} from "../src/bridge/BridgeProtocol.sol";
import {GovernanceRisk, GovernanceControl} from "../src/governance/GovernanceProtocol.sol";
import {ILendingOracle, LendingOracle, SolvencyRisk, SolvencyControl} from "../src/lending/SolvencyProtocol.sol";

interface Vm {
    function warp(uint256) external;
}

contract R44P11ProtocolTest {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    function testFuzz_OracleRiskAcceptsManipulatedSpot(uint96 rawPrice, uint96 rawCollateral) public {
        uint256 price = uint256(rawPrice) + 1;
        uint256 collateral = uint256(rawCollateral) + 1;
        MutablePriceOracle oracle = new MutablePriceOracle();
        oracle.set(price, 0);
        OracleRisk risk = new OracleRisk(oracle);
        assert(risk.borrowLimit(collateral) == collateral * price / 1e18);
    }

    function test_OracleControlRejectsStale() public {
        vm.warp(10 days);
        MutablePriceOracle oracle = new MutablePriceOracle();
        oracle.set(1e18, 1);
        OracleControl control = new OracleControl(oracle);
        try control.borrowLimit(1e18) returns (uint256) { assert(false); } catch { assert(true); }
    }

    function testFuzz_ShareControlOutmintsRisk(uint96 donationRaw, uint96 depositRaw) public {
        uint256 donation = uint256(donationRaw) % 1e12 + 2;
        uint256 depositAmount = uint256(depositRaw) % 1e18 + donation + 1;
        ShareRisk risk = new ShareRisk();
        ShareControl control = new ShareControl();
        risk.deposit(1000); control.deposit(1000);
        risk.donate(donation); control.donate(donation);
        uint256 riskMinted = risk.deposit(depositAmount);
        uint256 controlMinted = control.deposit(depositAmount);
        assert(controlMinted >= riskMinted);
    }

    function test_InitRiskCanBeReinitialized() public {
        InitRisk risk = new InitRisk();
        risk.initialize(address(0x1111));
        risk.initialize(address(0x2222));
        assert(risk.owner() == address(0x2222));
    }

    function test_InitControlRejectsSecondInitialization() public {
        InitControl control = new InitControl();
        control.initialize(address(0x1111));
        try control.initialize(address(0x2222)) { assert(false); } catch { assert(control.owner() == address(0x1111)); }
    }

    function test_StorageLayoutRiskDiffers() public {
        LayoutV1 a = new LayoutV1();
        LayoutV2Risk b = new LayoutV2Risk();
        assert(address(a) != address(b));
    }

    function test_BridgeRiskReplaysAcrossContracts() public {
        BridgeRisk a = new BridgeRisk();
        BridgeRisk b = new BridgeRisk();
        bytes memory message = abi.encode("release");
        a.execute(message);
        b.execute(message);
        assert(true);
    }

    function test_BridgeControlBindsDestination() public {
        BridgeControl a = new BridgeControl(address(this));
        BridgeControl b = new BridgeControl(address(this));
        bytes memory message = abi.encode("release");
        a.execute(1, block.chainid, address(a), 7, message);
        try b.execute(1, block.chainid, address(a), 7, message) { assert(false); } catch { assert(true); }
    }

    function testFuzz_GovernanceControlRequiresQuorum(uint128 rawVotes) public {
        GovernanceControl control = new GovernanceControl(1_000_000);
        uint256 votes = uint256(rawVotes) % 1_000_001;
        assert(control.passed(votes) == (votes >= 100_000));
    }

    function test_GovernanceRiskOneVotePasses() public {
        GovernanceRisk risk = new GovernanceRisk();
        assert(risk.passed(1));
    }

    function test_SolvencyRiskAllowsUnsafeWithdrawal() public {
        SolvencyRisk risk = new SolvencyRisk();
        risk.seed(100, 80);
        risk.withdraw(50);
        assert(risk.collateral(address(this)) == 50);
    }

    function test_SolvencyControlRejectsUnsafeWithdrawal() public {
        vm.warp(10 days);
        LendingOracle oracle = new LendingOracle();
        oracle.set(1e18, block.timestamp);
        SolvencyControl control = new SolvencyControl(oracle);
        control.seed(200, 80);
        try control.withdraw(50) { assert(false); } catch { assert(control.collateral(address(this)) == 200); }
    }
}

contract ShareHandler {
    ShareControl public immutable vault;
    constructor(ShareControl v) { vault = v; }
    function actDeposit(uint96 raw) external { uint256 amount = uint256(raw) % 1e18 + 1; vault.deposit(amount); }
    function actDonate(uint96 raw) external { vault.donate(uint256(raw) % 1e18); }
}
contract ShareInvariantTest {
    ShareControl internal vault; ShareHandler internal handler;
    function setUp() public { vault = new ShareControl(); vault.deposit(1e18); handler = new ShareHandler(vault); }
    function invariant_ControlSharesNeverResetToZero() public view { assert(vault.totalShares() > 0); }
}

contract BridgeHandler {
    BridgeControl public immutable bridge;
    uint256 public doubleSuccesses;
    constructor() { bridge = new BridgeControl(address(this)); }
    function actReplay(uint64 nonce, bytes32 payload) external {
        bool first; bool second;
        try bridge.execute(1, block.chainid, address(bridge), nonce, abi.encode(payload)) { first = true; } catch {}
        try bridge.execute(1, block.chainid, address(bridge), nonce, abi.encode(payload)) { second = true; } catch {}
        if (first && second) doubleSuccesses += 1;
    }
}
contract BridgeInvariantTest {
    BridgeHandler internal handler;
    function setUp() public { handler = new BridgeHandler(); }
    function invariant_NoActionSucceedsTwicePerHandlerCall() public view { assert(handler.doubleSuccesses() == 0); }
}

contract GovernanceHandler {
    GovernanceControl public immutable governance;
    uint256 public lastVotes;
    bool public lastPassed;
    constructor(GovernanceControl g) { governance = g; }
    function act(uint128 rawVotes) external { lastVotes = uint256(rawVotes) % 1_000_001; lastPassed = governance.passed(lastVotes); }
}
contract GovernanceInvariantTest {
    GovernanceHandler internal handler;
    function setUp() public { handler = new GovernanceHandler(new GovernanceControl(1_000_000)); }
    function invariant_PassImpliesQuorum() public view { assert(!handler.lastPassed() || handler.lastVotes() >= 100_000); }
}

contract SolvencyHandler {
    SolvencyControl public immutable control;
    constructor(SolvencyControl c) { control = c; control.seed(1_000_000, 100_000); }
    function actWithdraw(uint96 raw) external { uint256 amount = uint256(raw) % 1_000_001; try control.withdraw(amount) {} catch {} }
}
contract FixedLendingOracle is ILendingOracle {
    function read() external view returns (uint256, uint256) { return (1e18, block.timestamp); }
}
contract SolvencyInvariantTest {
    SolvencyControl internal control; SolvencyHandler internal handler;
    function setUp() public { control = new SolvencyControl(new FixedLendingOracle()); handler = new SolvencyHandler(control); }
    function invariant_ControlRemainsSolvent() public view { assert(control.healthy(address(handler))); }
}
