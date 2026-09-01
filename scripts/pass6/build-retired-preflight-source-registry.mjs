#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const merklePath = "config/release-input-merkle.json";
const pass5ReleasePath = "_velmere/VLM_PASS5_RELEASE_MANIFEST.json";
const outputPath = "config/retired-preflight-missing-sources-pass6.json";

const mappings = [
  ["components/CartDrawer.tsx", ["components/CartProvider.tsx", "components/cart/CartGuardStatusPanel.tsx"], ["scripts/pass4992/atomic-commerce-paid-outbox.test.ts", "scripts/pass4994/commerce-fulfilment-outbox-worker.test.ts"]],
  ["components/launch/PaymentOrderReadinessPanel.tsx", ["lib/launch/payment-order-readiness.ts", "app/api/checkout/vlm-service/readiness/route.ts"], ["scripts/pass4992/atomic-commerce-paid-outbox.test.ts"]],
  ["components/launch/ProviderTruthLedgerPanel.tsx", ["lib/launch/provider-truth-ledger.ts", "lib/market-integrity/provider-truth-router.ts"], ["scripts/pass6/test-real-markets-data-receipt-integrity.ts"]],
  ["components/market-integrity/MarketIntegrityClient.tsx", ["components/market-integrity/ShieldRealMarketsParityClient.tsx", "app/[locale]/market-integrity/page.tsx"], ["scripts/pass6/test-ui-live-truth.ts", "scripts/pass6/test-legacy-live-publication-truth.ts"]],
  ["components/market-integrity/ShieldMapClient.tsx", ["components/market-integrity/ShieldMapCommandClient.tsx", "app/[locale]/market-integrity/shield-map/page.tsx"], ["scripts/pass6/test-ui-live-truth.ts"]],
  ["components/market-integrity/TokenRiskModal.tsx", ["components/market-integrity/AssetDetailModal.tsx", "components/market-integrity/asset-detail/contract.ts"], ["scripts/pass6/test-ui-live-truth.ts", "scripts/pass6/test-market-risk-delivery-gate.ts"]],
  ["components/market-integrity/VlmBrainWebGLPrototype.tsx", ["components/market-integrity/VlmBrainWorkspace.tsx", "lib/ai/vlm-brain.ts"], ["scripts/pass6/test-ui-live-truth.ts"]],
  ["components/search/TokenMetadataProviderPanel.tsx", ["lib/search/token-metadata-cache.ts", "app/api/search/[operation]/route.ts", "lib/server/route-registries/search.ts", "lib/server/search-route-modules/token-metadata.ts"], ["scripts/test-pass4659-api-surface-and-body-boundary.ts"]],
  ["components/search/VelmereLensCommandRouter.tsx", ["app/[locale]/search/page.tsx", "lib/market-integrity/top1-vlm-brain-source-router.ts"], ["scripts/pass6/test-legacy-live-publication-truth.ts"]],
  ["components/search/VelmereSearchDiscoveryRail.tsx", ["app/[locale]/search/page.tsx", "app/api/market-integrity/[operation]/route.ts", "lib/server/route-registries/market-integrity.ts", "lib/server/market-integrity-route-modules/search.ts"], ["scripts/pass6/test-legacy-live-publication-truth.ts"]],
  ["components/security/SecurityOperationsChecklistPanel.tsx", ["lib/security/security-operations-checklist.ts", "app/[locale]/security/page.tsx"], ["scripts/pass6/test-admin-iam-fail-closed.ts"]],
  ["components/vlm/VlmModeSwitch.tsx", ["components/market-integrity/VlmBrainWorkspace.tsx", "lib/ai/vlm-brain-market-surface.ts"], ["scripts/pass6/test-ui-live-truth.ts"]],
  ["components/wallet/WalletConnectButton.tsx", ["components/wallet/WalletConnectDrawer.tsx", "components/wallet/WalletConnectOptions.tsx", "lib/wallet/useWalletConnect.ts"], ["scripts/pass6/test-control-plane-boundaries.ts"]],
  ["lib/launch/commerce-launch-control.ts", ["lib/launch/square-vlm-launch-control.ts", "components/launch/SquareVlmLaunchControl.tsx"], ["scripts/pass4992/atomic-commerce-paid-outbox.test.ts"]],
  ["lib/launch/master-build-areas.ts", ["lib/launch/launch-readiness-summary.ts", "scripts/pass6/run-critical-offline-gate.mjs"], ["scripts/pass6/run-critical-offline-gate.mjs"]],
  ["lib/launch/master-build-progress-delta.ts", ["lib/launch/launch-readiness-summary.ts", "scripts/pass6/run-critical-offline-gate.mjs"], ["scripts/pass6/run-critical-offline-gate.mjs"]],
  ["lib/launch/shipping-returns-truth.ts", ["app/[locale]/legal/shipping/page.tsx", "app/[locale]/legal/returns/page.tsx"], ["scripts/pass6/test-control-plane-boundaries.ts"]],
  ["lib/launch/site-page-audit.ts", ["app/[locale]/page.tsx", "scripts/pass4825/verify-appearance-freeze.mjs"], ["scripts/pass4825/verify-appearance-freeze.mjs"]],
];

const merkleBytes = fs.readFileSync(path.join(root, merklePath));
const merkle = JSON.parse(merkleBytes);
const { manifestSha256: merkleManifestSha256, ...merkleCore } = merkle;
if (merkleManifestSha256 !== sha256(JSON.stringify(merkleCore))) throw new Error("release_input_merkle_integrity_failed");
const pass5ReleaseBytes = fs.readFileSync(path.join(root, pass5ReleasePath));
const pass5Release = JSON.parse(pass5ReleaseBytes);
const releasePaths = new Set((pass5Release.files ?? []).map((entry) => entry.path));
const merkleEntries = new Map((merkle.entries ?? []).map((entry) => [entry.path, entry]));

const entries = mappings.map(([sourcePath, replacementPaths, replacementGates]) => {
  const evidence = merkleEntries.get(sourcePath);
  if (!evidence) throw new Error(`retired_source_merkle_entry_missing:${sourcePath}`);
  if (releasePaths.has(sourcePath)) throw new Error(`retired_source_still_in_pass5_release:${sourcePath}`);
  if (fs.existsSync(path.join(root, sourcePath))) throw new Error(`retired_source_reappeared:${sourcePath}`);
  for (const replacement of [...replacementPaths, ...replacementGates]) {
    if (!fs.existsSync(path.join(root, replacement))) throw new Error(`retired_source_replacement_missing:${sourcePath}:${replacement}`);
  }
  return {
    sourcePath,
    historicalBytes: evidence.bytes,
    historicalSha256: evidence.sha256,
    historicalLeafSha256: evidence.leafSha256,
    pass5ReleaseOmitted: true,
    replacementPaths,
    replacementGates,
  };
}).sort((left, right) => left.sourcePath.localeCompare(right.sourcePath));

const core = {
  schemaVersion: "velmere.pass6.retired-preflight-missing-source-registry.v1",
  generatedAt: "2026-07-18T00:00:00.000Z",
  policy: {
    onlyEnoentFailuresMayBeRetired: true,
    runtimeClaimsAreNotSatisfiedByHistoricalMarkers: true,
    currentReplacementPathsMustExist: true,
    currentReplacementGatesMustExist: true,
    historicalSourceMustRemainAbsent: true,
    pass5ReleaseOmissionMustBeVerified: true,
    historicalMerkleMembershipMustBeVerified: true,
  },
  releaseInputMerkle: {
    path: merklePath,
    fileSha256: sha256(merkleBytes),
    manifestSha256: merkleManifestSha256,
    merkleRootSha256: merkle.merkleRootSha256,
  },
  pass5ReleaseManifest: {
    path: pass5ReleasePath,
    fileSha256: sha256(pass5ReleaseBytes),
    payloadFileCount: pass5Release.payloadFileCount,
  },
  entryCount: entries.length,
  entriesSha256: sha256(entries.map((entry) => `${entry.sourcePath}\0${entry.historicalBytes}\0${entry.historicalSha256}\0${entry.historicalLeafSha256}`).join("\n")),
  entries,
};
const registry = { ...core, registrySha256: sha256(JSON.stringify(core)) };
fs.writeFileSync(path.join(root, outputPath), `${JSON.stringify(registry, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, entryCount: entries.length, registrySha256: registry.registrySha256 }, null, 2));
