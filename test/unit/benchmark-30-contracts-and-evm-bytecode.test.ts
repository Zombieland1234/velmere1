import { describe, it, expect } from "../test-utils";
import {
  BENCHMARK_30_CONTRACTS,
  BENCHMARK_20_CONTRACTS,
  resolveContractAuditProfile,
} from "../../lib/security/contract-audit-profiles";
import { analyzeEvmBytecode } from "../../lib/security/evm-bytecode-analyzer";

describe("Benchmark 30 Diverse Contracts Suite", () => {
  it("contains exactly 30 unique canonical contracts in BENCHMARK_30_CONTRACTS", () => {
    const keys = Object.keys(BENCHMARK_30_CONTRACTS);
    expect(keys.length).toBe(30);

    for (const key of keys) {
      expect(key).toMatch(/^0x[0-9a-f]{40}$/);
      expect(key).toBe(key.toLowerCase());
    }
  });

  it("maintains backwards compatibility with BENCHMARK_20_CONTRACTS alias", () => {
    expect(BENCHMARK_20_CONTRACTS).toBe(BENCHMARK_30_CONTRACTS);
    expect(Object.keys(BENCHMARK_20_CONTRACTS).length).toBe(30);
  });

  it("resolves valid, high-fidelity audit profiles for all 30 benchmark contracts", () => {
    const keys = Object.keys(BENCHMARK_30_CONTRACTS);

    for (const address of keys) {
      const profile = resolveContractAuditProfile(address, "1", "en");

      expect(profile).toBeDefined();
      expect(profile.contractAddress.toLowerCase()).toBe(address);
      expect(profile.contractName).toBeTruthy();
      expect(profile.network).toBeTruthy();
      expect(profile.compilerVersion).toBeTruthy();
      expect(profile.proxyPattern).toBeTruthy();
      expect(typeof profile.riskScore).toBe("number");
      expect(profile.riskScore).toBeGreaterThanOrEqual(0);
      expect(profile.riskScore).toBeLessThanOrEqual(100);
      expect(profile.confidenceScore).toBeGreaterThanOrEqual(90);
      expect(profile.evidenceCoverage).toBeGreaterThanOrEqual(90);

      expect(profile.summaryPl).toBeTruthy();
      expect(profile.summaryEn).toBeTruthy();
      expect(profile.summaryDe).toBeTruthy();

      expect(Array.isArray(profile.proPermissionMetrics)).toBe(true);
      expect(Array.isArray(profile.proLiquidityMetrics)).toBe(true);
      expect(Array.isArray(profile.advancedBytecodeMetrics)).toBe(true);
    }
  });

  it("includes all 10 newly added DeFi & infrastructure contracts", () => {
    const addresses = {
      uniV2Router: "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
      makerPsm: "0x89b78cb6848c7ec3338917228135c65c507a7019",
      polygonBridge: "0xa0c68c638235ee32657e8f720a23cec1bfc77c77",
      ozTimelock: "0x1a9c8182c09f50c8318d769245bea52c32be35bc",
      compoundV3: "0xc3d688b66703497daa19211eedff47f25384cdc3",
      balancerVault: "0xba12222222228d8ba445958a75a0704d566bf2c8",
      yearnVault: "0x5f18c75abdae578b483e5f43f12a39cf75097380",
      eigenLayer: "0x858646372cc42e1a627fcf940245456990021b3e",
      pendleRouter: "0x00000000005bbb0ef59571e58418f9a4357b68a0",
      ethenaUsde: "0x4c9edd5852cd905f086c759e8383e09bff1e68b3",
    };

    for (const [name, addr] of Object.entries(addresses)) {
      const p = BENCHMARK_30_CONTRACTS[addr];
      expect(p, "Missing benchmark profile for " + name + ": " + addr).toBeDefined();
      expect(p.contractAddress.toLowerCase()).toBe(addr.toLowerCase());
    }
  });
});

describe("Dynamic EVM Bytecode Machine Disassembly & Analysis", () => {
  it("correctly analyzes empty or minimal bytecode with honest fallback", () => {
    const resEmpty = analyzeEvmBytecode("");
    expect(resEmpty).toBeDefined();
    expect(resEmpty.bytecodeLengthBytes).toBe(0);
    expect(resEmpty.isBytecodePresent).toBe(false);

    const resHex0x = analyzeEvmBytecode("0x");
    expect(resHex0x.bytecodeLengthBytes).toBe(0);
    expect(resHex0x.isBytecodePresent).toBe(false);
  });

  it("detects dangerous opcodes like SELFDESTRUCT (0xff) and DELEGATECALL (0xf4)", () => {
    const dangerousBytecode = "0x6000f4ff";
    const res = analyzeEvmBytecode(dangerousBytecode);

    expect(res.detectedOpcodes.hasSelfDestruct).toBe(true);
    expect(res.detectedOpcodes.hasDelegateCall).toBe(true);

    const findings = res.findings;
    const selfDestructFinding = findings.find((f) => f.swcId === "SWC-106");
    expect(selfDestructFinding).toBeDefined();
    expect(selfDestructFinding?.severity).toBe("critical");

    const delegateCallFinding = findings.find((f) => f.swcId === "SWC-112");
    expect(delegateCallFinding).toBeDefined();
    expect(delegateCallFinding?.severity).toBe("high");
  });

  it("detects standard ERC-20 selector dispatcher patterns in runtime bytecode", () => {
    const dispatcherBytecode = "0x63a9059cbb801461005057";
    const res = analyzeEvmBytecode(dispatcherBytecode);

    expect(res.detectedSelectors.some((s) => s.selectorHex === "0xa9059cbb")).toBe(true);
    expect(res.ercConformance.hasTransfer).toBe(true);
  });

  it("prioritizes custom bytecode when provided to resolveContractAuditProfile", () => {
    const dummyAddress = "0x1111111111111111111111111111111111111111";
    const customBytecode = "0x608060405234801561001057600080fd5b50ffff";

    const profile = resolveContractAuditProfile(
      dummyAddress,
      "1",
      "en",
      "Unverified Exploit Target",
      customBytecode
    );

    expect(profile.contractName).toBe("Unverified Exploit Target");
    const sdFinding = profile.baselineFindings.find((f) => f.swcId === "SWC-106");
    expect(sdFinding).toBeDefined();
    expect(profile.riskScore).toBeGreaterThanOrEqual(45);
  });
});
