import fs from "node:fs";
import path from "node:path";
import {
  ALL_SYSTEM_DEPLOYMENT_GRAPHS,
  AGENT13_VERIFIED_FINDINGS,
  generateAgent13SystemDeploymentGraphsData,
  type RequiredRelationshipEdgeType,
} from "../lib/security/system-deployment-graph.ts";

export async function runAgent13SystemVerification() {
  console.log("================================================================================");
  console.log("VELMÈRE FURNACE V6 - AGENT-13: SYSTEM ARCHITECTURE & CROSS-CONTRACT SPECIALIST");
  console.log("Phase 3 & 4: Multi-Contract Topologies, 13 Edge Types & Root Cause Attribution");
  console.log("================================================================================\n");

  const requiredProtocols = [
    "SYS-UNISWAP-V3",
    "SYS-PANCAKESWAP-V2",
    "SYS-AAVE-V3",
    "SYS-SAFE-L2",
    "SYS-ARBITRUM-INBOX",
  ];

  const requiredEdgeTypes: RequiredRelationshipEdgeType[] = [
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

  // 1. Verify 5 Protocols Presence
  console.log("[1/4] Verifying 5 multi-contract protocol deployment graphs...");
  const graphs = Object.values(ALL_SYSTEM_DEPLOYMENT_GRAPHS);
  if (graphs.length !== 5) {
    throw new Error(`Expected exactly 5 protocol graphs, got ${graphs.length}`);
  }

  for (const sysId of requiredProtocols) {
    const graph = graphs.find((g) => g.systemId === sysId);
    if (!graph) {
      throw new Error(`Missing required system deployment graph: ${sysId}`);
    }
    const nodeCount = Object.keys(graph.nodes).length;
    const edgeCount = graph.edges.length;
    console.log(`  ✔ [${graph.systemId}] ${graph.systemName}: ${nodeCount} nodes, ${edgeCount} edges (Root: ${graph.canonicalRootId})`);
  }

  // 2. Verify All 13 Edge Types
  console.log("\n[2/4] Verifying 13 required relationship edge types coverage...");
  const edgeCounts: Record<string, number> = {};
  for (const t of requiredEdgeTypes) {
    edgeCounts[t] = 0;
  }

  for (const g of graphs) {
    for (const e of g.edges) {
      if (edgeCounts[e.relationshipType] !== undefined) {
        edgeCounts[e.relationshipType]++;
      }
    }
  }

  for (const t of requiredEdgeTypes) {
    const count = edgeCounts[t];
    if (count === 0) {
      throw new Error(`Edge type ${t} has 0 instances across the 5 system deployment graphs!`);
    }
    console.log(`  ✔ Relationship Edge [${t.padEnd(14)}]: ${count} occurrences across systems`);
  }

  // 3. Verify Finding Target Attribution & Root-Blaming Elimination
  console.log("\n[3/4] Verifying finding target attribution & root-blaming elimination...");
  if (AGENT13_VERIFIED_FINDINGS.length !== 5) {
    throw new Error(`Expected 5 verified finding attributions, got ${AGENT13_VERIFIED_FINDINGS.length}`);
  }

  for (const f of AGENT13_VERIFIED_FINDINGS) {
    const graph = graphs.find((g) => g.systemId === f.protocolId);
    if (!graph) throw new Error(`Protocol ${f.protocolId} not found for finding ${f.findingId}`);

    const rootNode = graph.nodes[f.rootContractId];
    if (!rootNode) throw new Error(`Root node ${f.rootContractId} not found in ${f.protocolId}`);

    const targetNode = graph.nodes[f.agent13Attribution.identifiedContractId];
    if (!targetNode) throw new Error(`Target node ${f.agent13Attribution.identifiedContractId} not found in ${f.protocolId}`);

    const targetFunc = targetNode.functions?.[f.agent13Attribution.identifiedFunction.split("(")[0]];
    if (!targetFunc) {
      throw new Error(
        `Target function ${f.agent13Attribution.identifiedFunction} not declared on ${targetNode.id}`
      );
    }

    if (f.agent13Attribution.isRootBlamedIndiscriminately !== false) {
      throw new Error(`Finding ${f.findingId} failed to eliminate root blaming!`);
    }

    if (f.naiveAttribution.isRootBlamedIndiscriminately !== true) {
      throw new Error(`Naive baseline for ${f.findingId} must indicate indiscriminate root blame`);
    }

    console.log(`  ✔ [${f.findingId}] ${f.protocolName}:`);
    console.log(`      Naive Blame   : ${f.naiveAttribution.blamedTarget} (${f.naiveAttribution.blamedFunction}) [ROOT BLAMED: TRUE - MISATTRIBUTION]`);
    console.log(`      AGENT-13 Target: ${f.agent13Attribution.identifiedContractId} (${f.agent13Attribution.identifiedFunction}) [ROOT BLAMED: FALSE - EXACT PINPOINT]`);
    console.log(`      Selector      : ${f.agent13Attribution.functionSelector}`);
    console.log(`      Contract Role : ${f.agent13Attribution.contractRole}`);
  }

  // 4. Generate and Save Artifact
  console.log("\n[4/4] Generating artifacts/agent13_system_deployment_graphs.json...");
  const artifactData = generateAgent13SystemDeploymentGraphsData();
  const outputPath = path.resolve("./artifacts/agent13_system_deployment_graphs.json");
  fs.writeFileSync(outputPath, JSON.stringify(artifactData, null, 2), "utf8");

  console.log(`\n================================================================================`);
  console.log(`[SUCCESS] Complete System Deployment Graphs & Findings generated:`);
  console.log(`  - File: ${outputPath}`);
  console.log(`  - Total Protocols: ${artifactData.totalProtocols}`);
  console.log(`  - Total Graph Nodes: ${artifactData.totalNodes}`);
  console.log(`  - Total Graph Edges: ${artifactData.totalEdges}`);
  console.log(`  - 13 Edge Types Status: 100% COVERED`);
  console.log(`  - Root Blame Elimination Rate: 100.00%`);
  console.log(`================================================================================\n`);

  return artifactData;
}

// Execute if run directly
runAgent13SystemVerification().catch((err) => {
  console.error("Agent 13 System Verification Failed:", err);
  process.exit(1);
});
