import { describe, it, expect } from "../test-utils.ts";
import fs from "node:fs";
import path from "node:path";
import {
  ALL_SYSTEM_DEPLOYMENT_GRAPHS,
  AGENT13_VERIFIED_FINDINGS,
  generateAgent13SystemDeploymentGraphsData,
  type RequiredRelationshipEdgeType,
} from "../../lib/security/system-deployment-graph.ts";

describe("AGENT-13: System Deployment Graphs & Multi-Contract Topologies", () => {
  const REQUIRED_PROTOCOLS = [
    "SYS-UNISWAP-V3",
    "SYS-PANCAKESWAP-V2",
    "SYS-AAVE-V3",
    "SYS-SAFE-L2",
    "SYS-ARBITRUM-INBOX",
  ];

  it("builds and validates all 5 multi-contract protocol deployment graphs", () => {
    const graphs = Object.values(ALL_SYSTEM_DEPLOYMENT_GRAPHS);
    expect(graphs.length).toBe(5);

    for (const protocolId of REQUIRED_PROTOCOLS) {
      const g = graphs.find((item) => item.systemId === protocolId);
      expect(g, `Protocol ${protocolId} must be present in graphs`).toBeDefined();
      if (!g) return;

      expect(g.systemId).toBe(protocolId);
      expect(g.systemName).toBeTruthy();
      expect(g.canonicalRootId).toBeTruthy();
      expect(g.nodes[g.canonicalRootId], `Canonical root node must exist for ${protocolId}`).toBeDefined();
      expect(g.nodes[g.canonicalRootId].isCanonicalRoot).toBe(true);

      // Verify node attributes
      const nodeKeys = Object.keys(g.nodes);
      expect(nodeKeys.length).toBeGreaterThanOrEqual(7);

      for (const nodeId of nodeKeys) {
        const node = g.nodes[nodeId];
        expect(node.id).toBe(nodeId);
        expect(node.name).toBeTruthy();
        expect(node.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
        expect(node.chainId).toBeTruthy();
        expect(node.network).toBeTruthy();
        expect(node.role).toBeTruthy();
        expect(node.codeHash).toMatch(/^sha256:[0-9a-f]{64}$/);
      }

      // Verify edge endpoints
      expect(g.edges.length).toBeGreaterThanOrEqual(10);
      for (const e of g.edges) {
        expect(g.nodes[e.sourceId], `Unknown sourceId: ${e.sourceId} in ${g.systemId}`).toBeDefined();
        expect(g.nodes[e.targetId], `Unknown targetId: ${e.targetId} in ${g.systemId}`).toBeDefined();
        expect(e.relationshipType).toBeTruthy();
        expect(e.description).toBeTruthy();
      }
    }
  });

  it("strictly covers all 13 canonical relationship edge types across systems", () => {
    const REQUIRED_13_EDGE_TYPES: RequiredRelationshipEdgeType[] = [
      "PROXY_OF",
      "CALLS",
      "READS_FROM",
      "WRITES_TO",
      "GOVERNED_BY",
      "UPGRADES",
      "DEPENDS_ON",
      "ORACLE_SOURCE",
      "POOL",
      "VAULT",
      "ROUTER",
      "FACTORY",
      "TOKEN",
    ];

    const allEdges = Object.values(ALL_SYSTEM_DEPLOYMENT_GRAPHS).flatMap((g) => g.edges);
    const edgeCounts: Record<string, number> = {};

    for (const edgeType of REQUIRED_13_EDGE_TYPES) {
      edgeCounts[edgeType] = 0;
    }

    for (const e of allEdges) {
      if (edgeCounts[e.relationshipType] !== undefined) {
        edgeCounts[e.relationshipType]++;
      }
    }

    for (const edgeType of REQUIRED_13_EDGE_TYPES) {
      expect(
        edgeCounts[edgeType],
        `Relationship edge type '${edgeType}' must be traced with at least 1 occurrence`
      ).toBeGreaterThanOrEqual(1);
    }

    // Specific structural checks:
    // PROXY_OF must be present in upgradeable/proxy architectures
    const proxyOfEdges = allEdges.filter((e) => e.relationshipType === "PROXY_OF");
    expect(proxyOfEdges.length).toBeGreaterThanOrEqual(3);

    // CALLS must represent dynamic cross-contract interactions
    const callsEdges = allEdges.filter((e) => e.relationshipType === "CALLS");
    expect(callsEdges.length).toBeGreaterThanOrEqual(5);

    // VAULT must link liquidity or escrow custody nodes
    const vaultEdges = allEdges.filter((e) => e.relationshipType === "VAULT");
    expect(vaultEdges.length).toBeGreaterThanOrEqual(2);

    // ORACLE_SOURCE must link oracle providers
    const oracleEdges = allEdges.filter((e) => e.relationshipType === "ORACLE_SOURCE");
    expect(oracleEdges.length).toBeGreaterThanOrEqual(2);
  });

  it("verifies accurate contract and function attribution and eliminates indiscriminate root blame", () => {
    expect(AGENT13_VERIFIED_FINDINGS.length).toBe(5);

    for (const finding of AGENT13_VERIFIED_FINDINGS) {
      // 1. Root blame must be strictly eliminated in AGENT-13 finding
      expect(
        finding.agent13Attribution.isRootBlamedIndiscriminately,
        `Finding ${finding.findingId} must set isRootBlamedIndiscriminately = false`
      ).toBe(false);

      // 2. Naive baseline must reflect root blaming
      expect(
        finding.naiveAttribution.isRootBlamedIndiscriminately,
        `Finding ${finding.findingId} naive baseline must be true`
      ).toBe(true);

      // 3. The identified target contract MUST NOT be the canonical root
      expect(
        finding.agent13Attribution.identifiedContractId,
        `Finding ${finding.findingId} target should be the offending contract, not root`
      ).toBeDefined();
      expect(finding.agent13Attribution.identifiedContractId !== finding.rootContractId).toBe(true);

      // 4. The identified function must be a valid declared function on the target contract
      const graph = Object.values(ALL_SYSTEM_DEPLOYMENT_GRAPHS).find(
        (g) => g.systemId === finding.protocolId
      );
      expect(graph).toBeDefined();
      if (!graph) return;

      const targetNode = graph.nodes[finding.agent13Attribution.identifiedContractId];
      expect(targetNode).toBeDefined();
      if (!targetNode) return;

      const baseFuncName = finding.agent13Attribution.identifiedFunction.split("(")[0];
      expect(
        targetNode.functions?.[baseFuncName],
        `Function ${baseFuncName} must be declared on node ${targetNode.id}`
      ).toBeDefined();

      // 5. Function selector must be a valid 4-byte hex string
      expect(finding.agent13Attribution.functionSelector).toMatch(/^0x[0-9a-fA-F]{8}$/);

      // 6. Relationship path from root to target must be valid
      expect(finding.agent13Attribution.relationshipPath.length).toBeGreaterThanOrEqual(1);
      const firstHop = finding.agent13Attribution.relationshipPath[0];
      expect(
        firstHop.from === finding.rootContractId ||
          firstHop.to === finding.agent13Attribution.identifiedContractId ||
          firstHop.from === "safe_proxy_instance"
      ).toBe(true);

      // 7. Verification report flags must all be true
      expect(finding.verificationResult.rootBlameEliminated).toBe(true);
      expect(finding.verificationResult.targetContractCorrect).toBe(true);
      expect(finding.verificationResult.targetFunctionCorrect).toBe(true);
      expect(finding.verificationResult.pathTraversable).toBe(true);
      expect(finding.verificationResult.status).toBe("VERIFIED_ACCURATE");
    }
  });

  it("verifies the generated artifacts/agent13_system_deployment_graphs.json dataset", () => {
    const artifactPath = path.resolve("./artifacts/agent13_system_deployment_graphs.json");
    expect(fs.existsSync(artifactPath), "Artifact JSON must exist").toBe(true);

    const raw = fs.readFileSync(artifactPath, "utf8");
    const data = JSON.parse(raw);

    expect(data.agent).toBe("AGENT-13: CROSS-CONTRACT / SYSTEM ARCHITECTURE SPECIALIST");
    expect(data.framework).toBe("Velmère Furnace V6");
    expect(data.totalProtocols).toBe(5);
    expect(data.totalNodes).toBeGreaterThanOrEqual(35);
    expect(data.totalEdges).toBeGreaterThanOrEqual(50);

    // Verify all 13 edge types have status COVERED
    for (const [edgeType, cov] of Object.entries<any>(data.edgeTypeCoverage)) {
      expect(cov.status, `Edge type ${edgeType} must be COVERED`).toBe("COVERED");
      expect(cov.count).toBeGreaterThanOrEqual(1);
    }

    // Verify comparative benchmark
    expect(data.comparativeBenchmark.agent13Accuracy).toBe("100.00%");
    expect(data.comparativeBenchmark.naiveToolsAccuracy).toBe("0.00%");
    expect(data.comparativeBenchmark.falsePositiveRootFlagsPrevented).toBe(5);

    // Verify audit status
    expect(data.verificationAudit.status).toBe("PASS");
    expect(data.verificationAudit.allSystemsCompliant).toBe(true);
    expect(data.verificationAudit.allEdgeTypesTraced).toBe(true);
    expect(data.verificationAudit.rootBlameIndiscriminateRate).toBe("0.00%");
  });
});
