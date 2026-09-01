#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { evaluateCrossSurfaceValueTruth } from "../../lib/product/cross-surface-value-truth.mjs";

const root = process.cwd();
const read = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const A94 = "VELMERE_PASS36_A94R2_ROUTE_AST_ORPHAN_LOCK_PDF_AND_CROSS_SURFACE_VALUE_TRUTH_CHECKPOINT";

function descendantIndex() {
  const dir = path.join(root, "config/pass36");
  const index = new Map();
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith("-current-root-descendant-manifest.json")) continue;
    const value = read(path.join("config/pass36", name));
    if (typeof value.revisionId === "string") index.set(value.revisionId, value);
  }
  return index;
}

function orderedChainFromAncestor(authority, ancestorRevision) {
  const index = descendantIndex();
  const reversed = [];
  const seen = new Set();
  let revision = authority.authorityRevisionId;
  while (revision && revision !== ancestorRevision) {
    if (seen.has(revision)) throw new Error(`descendant_chain_cycle:${revision}`);
    seen.add(revision);
    const entry = index.get(revision);
    if (!entry) throw new Error(`descendant_manifest_missing:${revision}`);
    reversed.push(entry);
    revision = entry.parentRevisionId;
  }
  if (revision !== ancestorRevision) throw new Error(`ancestor_not_reached:${ancestorRevision}`);
  const chain = reversed.reverse();
  let expectedParent = ancestorRevision;
  for (const entry of chain) {
    if (entry.parentRevisionId !== expectedParent) throw new Error(`descendant_parent_order_mismatch:${entry.revisionId}`);
    const parent = index.get(expectedParent);
    if (parent && entry.parentDescendantManifestDigestSha256 !== parent.manifestDigestSha256) {
      throw new Error(`descendant_digest_link_mismatch:${entry.revisionId}`);
    }
    expectedParent = entry.revisionId;
  }
  return chain;
}

const authority = read("config/pass36/current-release-authority.json");
const chain = orderedChainFromAncestor(authority, A94);
const currentDescendant = chain.at(-1) ?? null;
const result = evaluateCrossSurfaceValueTruth({
  policy: read("config/pass36/a94r2-cross-surface-value-truth-policy.json"),
  authority,
  state: read("config/pass36/a94r2-action-required-current-state.json"),
  pdfSummary: read("config/pass36/a94r2-retained-pdf-evidence-summary.json"),
  routeRegistry: read("config/pass15/route-export-ast-registry.json"),
  auditPolicy: read("config/pass36/a82-audit-real-contract-matrix-policy.json"),
  auditIntake: read("evaluation/pass36/a82-real-contract-intake-index.json"),
  pdfRetention: read("config/pass36/a88r1-physical-pdf-evidence-retention-index.json"),
  shieldPolicy: read("config/pass36/a84-shield-full-catalog-tier-matrix-policy.json"),
  realMarketsPolicy: read("config/pass36/a86-real-markets-cross-asset-policy.json"),
  impactWhalePolicy: read("config/pass36/a87-market-impact-whale-watch-policy.json"),
  brainAngelRiskPolicy: read("config/pass36/a88-brain-angel-risk-eval-policy.json"),
  semanticPolicy: read("config/pass36/a88r1-semantic-route-privacy-pdf-policy.json"),
  currentDescendant,
  descendantChain: chain,
});
const outputIndex = process.argv.indexOf("--output");
if (outputIndex >= 0 && process.argv[outputIndex + 1]) {
  const output = path.resolve(root, process.argv[outputIndex + 1]);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}
console.log(JSON.stringify(result, null, 2));
if (result.failures.length) process.exit(1);
