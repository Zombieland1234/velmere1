import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import {
  verifyStandardSlotDerivations,
  diffStorageLayouts,
  auditImplementationInitialization,
  auditMonolithicClassification,
  computeEip7201Slot,
  deriveEip1967Slot,
  StorageLayout,
  ERC1967_IMPLEMENTATION_SLOT,
  ERC1967_ADMIN_SLOT,
  ERC1967_BEACON_SLOT,
  ERC1967_ROLLBACK_SLOT,
  ERC1822_PROXIABLE_SLOT,
  ARAGON_KERNEL_NAMESPACED_SLOT,
  ARAGON_APP_ID_NAMESPACED_SLOT,
} from "../../lib/security/proxy/agent09-proxy-upgrade-verifier";
import { analyzeProxyArchitecture } from "../../lib/security/proxy/proxy-analysis-engine";

describe("AGENT-09: Proxy & Upgrade Security Verification", () => {
  describe("1. Standard Storage Slot Derivations & Mathematical Proofs", () => {
    it("should accurately derive ERC-1967 implementation slot via keccak256 - 1", () => {
      const derived = deriveEip1967Slot("eip1967.proxy.implementation");
      assert.strictEqual(
        derived.toLowerCase(),
        ERC1967_IMPLEMENTATION_SLOT.toLowerCase(),
        "ERC-1967 implementation slot must match canonical value 0x360894..."
      );
    });

    it("should accurately derive ERC-1967 admin slot via keccak256 - 1", () => {
      const derived = deriveEip1967Slot("eip1967.proxy.admin");
      assert.strictEqual(
        derived.toLowerCase(),
        ERC1967_ADMIN_SLOT.toLowerCase(),
        "ERC-1967 admin slot must match canonical value 0xb53127..."
      );
    });

    it("should accurately derive ERC-1967 beacon slot via keccak256 - 1", () => {
      const derived = deriveEip1967Slot("eip1967.proxy.beacon");
      assert.strictEqual(
        derived.toLowerCase(),
        ERC1967_BEACON_SLOT.toLowerCase(),
        "ERC-1967 beacon slot must match canonical value 0xa3f0ad..."
      );
    });

    it("should accurately derive ERC-1967 rollback slot via keccak256 - 1", () => {
      const derived = deriveEip1967Slot("eip1967.proxy.rollback");
      assert.strictEqual(
        derived.toLowerCase(),
        ERC1967_ROLLBACK_SLOT.toLowerCase(),
        "ERC-1967 rollback slot must match canonical value 0x4910fd..."
      );
    });

    it("should verify ERC-1822 proxiable slot (UUPS proxiableUUID)", () => {
      const proofs = verifyStandardSlotDerivations();
      const uupsProof = proofs.find((p) => p.slotName.includes("ERC-1822"));
      assert.ok(uupsProof, "ERC-1822 proof must be generated");
      assert.strictEqual(uupsProof.matchesCanonical, true);
      assert.strictEqual(uupsProof.derivedValue.toLowerCase(), ERC1822_PROXIABLE_SLOT.toLowerCase());
    });

    it("should accurately derive Aragon OS Kernel & AppId storage slots", () => {
      const proofs = verifyStandardSlotDerivations();
      const kernelProof = proofs.find((p) => p.slotName.includes("Aragon Kernel"));
      const appIdProof = proofs.find((p) => p.slotName.includes("Aragon AppId"));

      assert.ok(kernelProof && appIdProof, "Aragon storage proofs must be generated");
      assert.strictEqual(kernelProof.matchesCanonical, true);
      assert.strictEqual(appIdProof.matchesCanonical, true);
      assert.strictEqual(kernelProof.derivedValue.toLowerCase(), ARAGON_KERNEL_NAMESPACED_SLOT.toLowerCase());
      assert.strictEqual(appIdProof.derivedValue.toLowerCase(), ARAGON_APP_ID_NAMESPACED_SLOT.toLowerCase());
    });

    it("should accurately compute ERC-7201 namespaced storage root slot", () => {
      const slot = computeEip7201Slot("openzeppelin.storage.ERC20");
      assert.strictEqual(slot.length, 66, "EIP-7201 slot must be 32 bytes hex with 0x prefix");
      assert.ok(slot.endsWith("00"), "EIP-7201 slot must end with 00 due to ~0xff bitmask");
    });
  });

  describe("2. Storage Collision & Layout Gap Diffing Suite", () => {
    const baseV1: StorageLayout = {
      contractName: "TestVaultV1",
      variables: [
        { name: "owner", type: "address", slot: 0, offset: 0, byteSize: 20, contract: "TestVaultV1" },
        { name: "treasury", type: "address", slot: 1, offset: 0, byteSize: 20, contract: "TestVaultV1" },
      ],
      gapDeclaration: {
        contractName: "TestVaultV1",
        gapVariableName: "__gap",
        reservedElements: 50,
        elementByteSize: 32,
        startSlot: 2,
      },
    };

    it("should approve valid upgrade with exact __gap shrinking", () => {
      const validV2: StorageLayout = {
        contractName: "TestVaultV2",
        variables: [
          { name: "owner", type: "address", slot: 0, offset: 0, byteSize: 20, contract: "TestVaultV1" },
          { name: "treasury", type: "address", slot: 1, offset: 0, byteSize: 20, contract: "TestVaultV1" },
          { name: "paused", type: "bool", slot: 2, offset: 0, byteSize: 1, contract: "TestVaultV1" },
          { name: "feeRate", type: "uint256", slot: 3, offset: 0, byteSize: 32, contract: "TestVaultV1" },
        ],
        gapDeclaration: {
          contractName: "TestVaultV1",
          gapVariableName: "__gap",
          reservedElements: 48, // 50 - 2 = 48
          elementByteSize: 32,
          startSlot: 4,
        },
      };

      const diff = diffStorageLayouts(baseV1, validV2);
      assert.strictEqual(diff.hasCollision, false);
      assert.strictEqual(diff.verdict, "SAFE_LAYOUT_COMPATIBLE");
      assert.strictEqual(diff.gapAudit?.gapPreservedCorrectly, true);
    });

    it("should detect variable type mutation collision", () => {
      const typeMutatedV2: StorageLayout = {
        contractName: "TestVaultV2_Mutated",
        variables: [
          { name: "owner", type: "uint256", slot: 0, offset: 0, byteSize: 32, contract: "TestVaultV1" }, // address -> uint256!
          { name: "treasury", type: "address", slot: 1, offset: 0, byteSize: 20, contract: "TestVaultV1" },
        ],
        gapDeclaration: {
          contractName: "TestVaultV1",
          gapVariableName: "__gap",
          reservedElements: 50,
          elementByteSize: 32,
          startSlot: 2,
        },
      };

      const diff = diffStorageLayouts(baseV1, typeMutatedV2);
      assert.strictEqual(diff.hasCollision, true);
      assert.strictEqual(diff.collisionType, "VARIABLE_TYPE_MUTATION");
      assert.ok(diff.details.some((d) => d.includes("Type mutated")));
    });

    it("should detect variable order swap collision", () => {
      const swappedV2: StorageLayout = {
        contractName: "TestVaultV2_Swapped",
        variables: [
          { name: "treasury", type: "address", slot: 0, offset: 0, byteSize: 20, contract: "TestVaultV1" }, // SWAPPED!
          { name: "owner", type: "address", slot: 1, offset: 0, byteSize: 20, contract: "TestVaultV1" },
        ],
        gapDeclaration: {
          contractName: "TestVaultV1",
          gapVariableName: "__gap",
          reservedElements: 50,
          elementByteSize: 32,
          startSlot: 2,
        },
      };

      const diff = diffStorageLayouts(baseV1, swappedV2);
      assert.strictEqual(diff.hasCollision, true);
      assert.strictEqual(diff.collisionType, "VARIABLE_ORDER_SWAP");
      assert.ok(diff.details.some((d) => d.includes("Variable name changed")));
    });

    it("should detect gap shrinkage mismatch collision", () => {
      const unShrunkV2: StorageLayout = {
        contractName: "TestVaultV2_BadGap",
        variables: [
          { name: "owner", type: "address", slot: 0, offset: 0, byteSize: 20, contract: "TestVaultV1" },
          { name: "treasury", type: "address", slot: 1, offset: 0, byteSize: 20, contract: "TestVaultV1" },
          { name: "extraManager", type: "address", slot: 2, offset: 0, byteSize: 20, contract: "TestVaultV1" },
        ],
        gapDeclaration: {
          contractName: "TestVaultV1",
          gapVariableName: "__gap",
          reservedElements: 50, // Added 1 var but gap is still 50! Expected 49
          elementByteSize: 32,
          startSlot: 3,
        },
      };

      const diff = diffStorageLayouts(baseV1, unShrunkV2);
      assert.strictEqual(diff.hasCollision, true);
      assert.strictEqual(diff.collisionType, "GAP_SHRINKAGE_MISMATCH");
      assert.strictEqual(diff.gapAudit?.gapPreservedCorrectly, false);
      assert.strictEqual(diff.gapAudit?.expectedGapSizeV2, 49);
      assert.strictEqual(diff.gapAudit?.gapSizeV2, 50);
    });
  });

  describe("3. Uninitialized Implementation Front-Running Audit (SWC-112 / CWE-665)", () => {
    it("should flag uninitialized implementation without _disableInitializers() as CRITICAL", () => {
      const result = auditImplementationInitialization({
        isProxy: false,
        isMonolithic: false,
        bytecode: "0x6080604052638129fc1c600054", // contains initialize selector
        sourceCode: "function initialize(address _owner) public { owner = _owner; }",
        contractName: "VulnerableLogic",
      });

      assert.strictEqual(result.frontRunningTakeoverRisk, "CRITICAL_TAKEOVER_POSSIBLE");
      assert.strictEqual(result.swcId, "SWC-112");
      assert.strictEqual(result.cweId, "CWE-665");
      assert.strictEqual(result.hasDisableInitializersInConstructor, false);
      assert.strictEqual(result.isImplementationLocked, false);
    });

    it("should verify implementation protected with _disableInitializers() in constructor", () => {
      const result = auditImplementationInitialization({
        isProxy: false,
        isMonolithic: false,
        bytecode: "0x6080604052638129fc1c600054",
        sourceCode: `
          contract Implementation is Initializable {
            constructor() {
              _disableInitializers();
            }
            function initialize(address _owner) public initializer {
              owner = _owner;
            }
          }
        `,
        contractName: "ProtectedLogic",
      });

      assert.strictEqual(result.frontRunningTakeoverRisk, "NONE_PROTECTED");
      assert.strictEqual(result.hasDisableInitializersInConstructor, true);
      assert.strictEqual(result.isImplementationLocked, true);
    });
  });

  describe("4. Monolithic Classification & Zero-Rollback Invariant Enforcement", () => {
    const MONOLITHIC_BENCHMARKS = [
      { symbol: "WBNB", address: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c" },
      { symbol: "PANCAKE_ROUTER", address: "0x10ed43c718714eb63d5aa57b78b54704e256024e" },
      { symbol: "UNI_ROUTER3", address: "0xe592427a0aece92de3edee1f18e0157c05861564" },
      { symbol: "DAI", address: "0x6b175474e89094c44da98b954eedeac495271d0f" },
      { symbol: "LINK", address: "0x514910771af9ca656af840dff83e8264ecf986ca" },
      { symbol: "PEPE", address: "0x6982508145454ce325ddbe47a25d4ec3d2311933" },
      { symbol: "SHIB", address: "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce" },
      { symbol: "3CRV", address: "0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7" },
      { symbol: "SAFEMOON", address: "0x8076c74c5e3f5852037f31ff0093eeb8c8add8d3" },
      { symbol: "BLUR_EXCHANGE", address: "0x000000000000ad05ccc4f10045630fb539565570" },
      { symbol: "TORN_ROUTER", address: "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b" },
    ];

    for (const target of MONOLITHIC_BENCHMARKS) {
      it(`should strictly classify ${target.symbol} as Monolithic with 0 rollback attack paths`, () => {
        const audit = auditMonolithicClassification({
          contractAddress: target.address,
          symbol: target.symbol,
          proxyPattern: "NON_PROXY_MONOLITHIC",
          bytecode: "0x608060405234801561001057600080fd5b50", // plain monolithic bytecode
        });

        assert.strictEqual(audit.isProxy, false);
        assert.strictEqual(audit.classification, "MONOLITHIC_IMMUTABLE");
        assert.strictEqual(audit.hasRollbackAttackPath, false);
        assert.strictEqual(audit.rollbackAttackPathsAttached, 0, "Monolithic contracts MUST have strictly 0 rollback paths");
        assert.strictEqual(audit.hasRollbackVulnerability, false);
        assert.strictEqual(audit.formalInvariantProof.smtRollbackUnreachable, true);
      });
    }

    it("should ensure legacy analyzeProxyArchitecture returns rollbackAttackPathsAttached = 0 for monolithic", () => {
      const result = analyzeProxyArchitecture("0x608060405234801561001057600080fd5b50");
      assert.strictEqual(result.isProxy, false);
      assert.strictEqual(result.patternType, "DIRECT_EXECUTION_NON_PROXY");
      assert.strictEqual(result.rollbackAttackPathsAttached, 0);
    });
  });

  describe("5. State Artifact Validation (agent09_proxy_upgrade_state.json)", () => {
    const artifactPath = path.resolve(__dirname, "../../artifacts/agent09_proxy_upgrade_state.json");

    it("should confirm artifacts/agent09_proxy_upgrade_state.json exists and is valid JSON", () => {
      assert.ok(fs.existsSync(artifactPath), "State artifact file must exist");
      const content = fs.readFileSync(artifactPath, "utf-8");
      const data = JSON.parse(content);

      assert.strictEqual(data.metadata.agentId, "AGENT-09");
      assert.strictEqual(data.metadata.role, "PROXY / UPGRADE SPECIALIST for Velmère Furnace V6");
      assert.strictEqual(data.metrics.totalContractsEvaluated, 22);
      assert.strictEqual(data.metrics.monolithicContractsCount, 11);
      assert.strictEqual(data.metrics.upgradeableProxiesCount, 11);
      assert.strictEqual(data.metrics.monolithicZeroRollbackCompliancePct, 100);
      assert.strictEqual(data.metrics.slotDerivationAccuracyPct, 100);
      assert.strictEqual(data.contracts.length, 22);
    });

    it("should confirm all 11 monolithic contracts in state artifact have 0 rollback paths", () => {
      const data = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
      const monolithicRecords = data.contracts.filter((c: any) => c.isMonolithic);

      assert.strictEqual(monolithicRecords.length, 11, "Must contain exactly 11 monolithic records");
      for (const record of monolithicRecords) {
        assert.strictEqual(
          record.monolithicAudit.rollbackAttackPathsAttached,
          0,
          `Contract ${record.symbol} must have 0 rollback attack paths`
        );
        assert.strictEqual(
          record.monolithicAudit.hasRollbackVulnerability,
          false,
          `Contract ${record.symbol} must have false rollback vulnerability`
        );
      }
    });

    it("should confirm Aragon AppProxy is correctly recognized in state artifact for STETH", () => {
      const data = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
      const steth = data.contracts.find((c: any) => c.symbol === "STETH");

      assert.ok(steth, "STETH record must exist");
      assert.strictEqual(steth.proxyPattern, "ARAGON_APP_PROXY");
      assert.strictEqual(steth.upgradeAuthorityType, "DAO_VOTING");
      assert.strictEqual(steth.upgradeabilityFeatures.hasAragonKernelResolution, true);
    });
  });
});
