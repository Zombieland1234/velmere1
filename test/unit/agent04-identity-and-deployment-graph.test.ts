import { describe, it, expect } from "../test-utils.ts";
import {
  verifyTransientStorageBytecode,
} from "../../lib/security/transient-storage-verifier.ts";
import {
  ALL_SYSTEM_DEPLOYMENT_GRAPHS,
  UNISWAP_V3_DEPLOYMENT_GRAPH,
  PANCAKESWAP_DEPLOYMENT_GRAPH,
  AAVE_V3_DEPLOYMENT_GRAPH,
  SAFE_L2_DEPLOYMENT_GRAPH,
  ARBITRUM_INBOX_DEPLOYMENT_GRAPH,
} from "../../lib/security/system-deployment-graph.ts";
import fs from "node:fs";
import path from "node:path";

describe("AGENT-04: EVM On-Chain Identity & Transient Storage Verification", () => {
  it("successfully loads and verifies the 20 canonical roots dataset", () => {
    const dataPath = path.resolve("./artifacts/agent04_evm_identity_verification_data.json");
    expect(fs.existsSync(dataPath)).toBe(true);

    const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    expect(data.totalCanonicalRootsVerified).toBe(20);
    expect(data.canonicalRoots.length).toBe(20);

    const expectedSymbols = [
      "USDT", "USDC", "WBNB", "PANCAKE_ROUTER", "UNI_ROUTER3",
      "DAI", "LINK", "PEPE", "SHIB", "AAVE_V3_POOL",
      "STETH", "3CRV", "ARB_INBOX", "SAFE_L2", "CUSDC",
      "SAFEMOON", "FLOKI", "SNX", "BLUR_EXCHANGE", "TORN_ROUTER",
    ];

    for (const sym of expectedSymbols) {
      const match = data.canonicalRoots.find((r: any) => r.symbol === sym);
      expect(match, `Missing canonical root: ${sym}`).toBeDefined();
      expect(match.contractAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(match.chainId).toMatch(/^(1|56|42161)$/);
      expect(match.blockNumber).toBeGreaterThanOrEqual(1);
      expect(match.blockHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
      expect(match.bytecodeHash).toMatch(/^sha256:[0-9a-fA-F]{64}$/);
      expect(match.proxyType).toBeTruthy();
      expect(match.compiler).toBeTruthy();
      expect(match.evmVersion).toBeTruthy();
    }
  });

  it("strictly isolates PUSH immediate operand bytes (0x5c, 0x5d) from CFG opcodes", () => {
    // PUSH4 0x5c5d5c5d, STOP
    const bytecodeWithPushData = "0x635c5d5c5d00";
    const audit = verifyTransientStorageBytecode(bytecodeWithPushData, {
      contractAddress: "0x1234567890123456789012345678901234567890",
      contractName: "PushDataTest",
      compilerVersion: "solc 0.8.24",
      evmTarget: "cancun",
    });

    expect(audit.totalRawByteCount).toBe(4);
    expect(audit.pushImmediateFalsePositivesCount).toBe(4);
    expect(audit.realOpcodeInstructionsCount).toBe(0);
    expect(audit.hasExecutableTransientStorage).toBe(false);
  });

  it("accurately detects real TSTORE and TLOAD opcodes under Cancun and Prague", () => {
    // PUSH1 0x42 PUSH1 0x00 TSTORE (0x5c) PUSH1 0x00 TLOAD (0x5d) STOP (0x00)
    const bytecodeWithRealOps = "0x604260005c60005d00";
    const auditCancun = verifyTransientStorageBytecode(bytecodeWithRealOps, {
      contractAddress: "0x1234567890123456789012345678901234567890",
      contractName: "RealCancunTest",
      compilerVersion: "solc 0.8.24",
      evmTarget: "cancun",
    });

    expect(auditCancun.realOpcodeInstructionsCount).toBe(2);
    expect(auditCancun.hasExecutableTransientStorage).toBe(true);
    expect(auditCancun.hardforkVerdict.gasCost).toBe(100);
    expect(auditCancun.hardforkVerdict.storageScope).toBe("TRANSACTION_TRANSIENT");

    const auditPrague = verifyTransientStorageBytecode(bytecodeWithRealOps, {
      contractAddress: "0x1234567890123456789012345678901234567890",
      contractName: "RealPragueTest",
      compilerVersion: "solc 0.8.26",
      evmTarget: "prague",
    });

    expect(auditPrague.hardforkVerdict.hardfork).toBe("prague");
    expect(auditPrague.hasExecutableTransientStorage).toBe(true);
  });

  it("designates 0x5c/0x5d as INVALID_OPCODE_REVERT in Pre-Cancun EVM targets", () => {
    const bytecodeWithRealOps = "0x604260005c60005d00";
    const auditByzantium = verifyTransientStorageBytecode(bytecodeWithRealOps, {
      contractAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
      contractName: "UsdtByzantiumTest",
      compilerVersion: "solc 0.4.18",
      evmTarget: "byzantium",
    });

    expect(auditByzantium.hardforkVerdict.isEip1153Supported).toBe(false);
    expect(auditByzantium.hardforkVerdict.gasCost).toBe("INVALID_OPCODE_REVERT");
    expect(auditByzantium.hasExecutableTransientStorage).toBe(false);
  });

  it("verifies the structural integrity of all 5 SystemDeploymentGraph models", () => {
    const graphs = [
      UNISWAP_V3_DEPLOYMENT_GRAPH,
      PANCAKESWAP_DEPLOYMENT_GRAPH,
      AAVE_V3_DEPLOYMENT_GRAPH,
      SAFE_L2_DEPLOYMENT_GRAPH,
      ARBITRUM_INBOX_DEPLOYMENT_GRAPH,
    ];

    expect(Object.keys(ALL_SYSTEM_DEPLOYMENT_GRAPHS).length).toBe(5);

    for (const g of graphs) {
      expect(g.systemId).toBeTruthy();
      expect(g.systemName).toBeTruthy();
      expect(g.canonicalRootId).toBeTruthy();
      expect(g.nodes[g.canonicalRootId]).toBeDefined();
      expect(g.nodes[g.canonicalRootId].isCanonicalRoot).toBe(true);
      expect(Object.keys(g.nodes).length).toBeGreaterThanOrEqual(4);
      expect(g.edges.length).toBeGreaterThanOrEqual(4);

      // Verify each edge points to valid nodes
      for (const e of g.edges) {
        expect(g.nodes[e.sourceId], `Unknown sourceId: ${e.sourceId} in ${g.systemId}`).toBeDefined();
        expect(g.nodes[e.targetId], `Unknown targetId: ${e.targetId} in ${g.systemId}`).toBeDefined();
        expect(e.relationshipType).toBeTruthy();
        expect(e.description).toBeTruthy();
      }
    }
  });

  it("validates agent04_evm_identity_state.json for all 20 canonical EVM roots across 12 identity fields", () => {
    const statePath = path.resolve("./artifacts/agent04_evm_identity_state.json");
    expect(fs.existsSync(statePath), "artifacts/agent04_evm_identity_state.json must exist").toBe(true);

    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    expect(state.schemaVersion).toBe("velmere.agent04-evm-identity-state.v1");
    expect(state.agentId).toBe("AGENT-04");
    expect(state.status).toBe("VERIFIED_CANONICAL");
    expect(state.canonicalRoots.length).toBe(20);

    const expectedRoots = [
      "USDT", "USDC", "WBNB", "PANCAKE_ROUTER", "UNI_ROUTER3",
      "DAI", "LINK", "PEPE", "SHIB", "AAVE_V3_POOL",
      "STETH", "3CRV", "ARB_INBOX", "SAFE_L2", "CUSDC",
      "SAFEMOON", "FLOKI", "SNX", "BLUR_EXCHANGE", "TORN_ROUTER",
    ];

    for (const sym of expectedRoots) {
      const root = state.canonicalRoots.find((r: any) => r.symbol === sym);
      expect(root, `Canonical root ${sym} missing`).toBeDefined();

      // 12 Mandatory On-Chain Identity Fields
      // 1. chainId
      expect(typeof root.chainId === "number" || typeof root.chainId === "string").toBe(true);
      // 2. blockNumber
      expect(root.blockNumber).toBeGreaterThanOrEqual(1);
      // 3. blockHash
      expect(root.blockHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
      // 4. contractAddress
      expect(root.contractAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
      // 5. runtimeBytecode
      expect(root.runtimeBytecode).toMatch(/^0x[0-9a-fA-F]+/);
      // 6. runtimeBytecodeHash
      expect(root.runtimeBytecodeHash).toMatch(/^sha256:[0-9a-fA-F]{64}$/);
      // 7. proxyType
      expect(typeof root.proxyType).toBe("string");
      // 8. implementationAddress (address or null)
      if (root.implementationAddress !== null) {
        expect(root.implementationAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
      }
      // 9. implementationBytecodeHash (sha256 or null)
      if (root.implementationBytecodeHash !== null) {
        expect(root.implementationBytecodeHash).toMatch(/^sha256:[0-9a-fA-F]{64}$/);
      }
      // 10. compilerVersion
      expect(root.compilerVersion).toMatch(/^(solc|vyper)\s+/);
      // 11. optimizerSettings
      expect(typeof root.optimizerSettings.enabled).toBe("boolean");
      expect(typeof root.optimizerSettings.runs).toBe("number");
      // 12. evmVersion
      expect(typeof root.evmVersion).toBe("string");
    }
  });

  it("strictly enforces zero EVM identity fields on non-EVM assets (BTC, SOL, DOGE) and TradFi (NVDA, AAPL, GC=F)", () => {
    const statePath = path.resolve("./artifacts/agent04_evm_identity_state.json");
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    const firewall = state.nonEvmAndTradFiFirewall;

    expect(firewall).toBeDefined();
    expect(firewall.policy).toBe("STRICT_ZERO_EVM_IDENTITY_LEAKAGE");
    expect(firewall.assets.length).toBe(6);

    const nonEvmSymbols = ["BTC", "SOL", "DOGE", "NVDA", "AAPL", "GC=F"];
    const evmFieldKeys = [
      "chainId",
      "blockNumber",
      "blockHash",
      "contractAddress",
      "runtimeBytecode",
      "runtimeBytecodeHash",
      "proxyType",
      "implementationAddress",
      "implementationBytecodeHash",
      "compilerVersion",
      "optimizerSettings",
      "evmVersion",
    ];

    for (const sym of nonEvmSymbols) {
      const asset = firewall.assets.find((a: any) => a.symbol === sym);
      expect(asset, `Asset ${sym} missing from firewall`).toBeDefined();
      expect(asset.isEvm).toBe(false);
      expect(asset.zeroEvmFieldsVerified).toBe(true);
      expect(asset.firewallVerdict).toBe("PASSED_STRICT_FIREWALL");
      expect(typeof asset.justification).toBe("string");

      // Verify all 12 EVM identity fields are strictly null
      for (const field of evmFieldKeys) {
        expect(asset[field], `Field ${field} must be null for ${sym}`).toBe(null);
      }
    }
  });
});

