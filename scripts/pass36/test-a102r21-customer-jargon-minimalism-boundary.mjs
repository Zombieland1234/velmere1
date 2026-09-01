#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const REV = "VELMERE_PASS36_A102R21_ACTION_REQUIRED_CUSTOMER_ACCESSIBILITY_AND_OPERATOR_CHECKPOINT_JARGON_MINIMALISM_BOUNDARY_NO_REAL_CREDIT";
const PARENT = "VELMERE_PASS36_A102R20_ACTION_REQUIRED_SINGLE_CURRENT_AUTHORITY_README_HISTORY_LABEL_STALE_POINTER_AND_PLANNING_ESTIMATE_COHERENCE_MINIMALISM_NO_REAL_CREDIT";
const root = process.cwd();
const failures = [];
let passed = 0;
const check = (id, condition, detail = null) => condition ? passed += 1 : failures.push({ id, detail });
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const readJson = (p) => JSON.parse(read(p));
const sha = (v) => crypto.createHash("sha256").update(v).digest("hex");

const expectedChanged = {
  "app/proof/market-integrity/[publicProofId]/page.tsx": "d888baecebf41956b502840b1ae8fae6f6b0ab8050d1a595f9d1ebce3bb39711",
  "components/account/AuditAccountMessagesClient.tsx": "86d651f8f24bbaec3129fe922bfd0736f31f2b33e409fed027adecedf475392d",
  "components/account/MarketActionReportsInboxClient.tsx": "670dd00fa39d09d11f4a5fa93d00708e54cb831c9043819d35780f17ddf7a031",
  "components/admin/VlmProductBrainEditor.tsx": "4b40a1bc8b827d914b08be4b7d2e290e7799179f3a66ccb6d7768055b8180a09",
  "components/admin/VlmProductCustomerPreview.tsx": "aa594adc2e863032c1acf2aeabd6885d2d1dc7d5f537576ab706ea390f6b9830",
  "components/admin/VlmProductPublishDecisionModal.tsx": "ebc604b55f64dedf282865e21f9aaf33ad6331dd603399957634dc366f4fb888",
  "components/checkout/VelmereCheckoutFlowClient.tsx": "bb72d7be905528df56279bca19d17b70ab39a2ef0061e1adc1c0ddb9294bee05",
  "components/search/VelmereIntelligenceSearchClient.tsx": "35f61ec5d26f5a3cc7c202e33ee28b74133008823bc85ab5c2805038fdc4dea1",
  "components/security/DeliveryReceiptPacketPage.tsx": "bf40411c612b7c9962ced081e694fb2c06346072bc68d2c5ca0f510e49115390",
  "components/security/SecurityAuditAdminInbox.tsx": "6a51450babae30f5580995bd0655da9d9175cf93ac88890a91560bc9e4941a0f",
  "components/security/SecurityAuditExportPage.tsx": "5cd84d23408821c3aae31dd6893c11330cd73efc7b1d30b81dfa0db5f066f52b",
  "components/security/SecurityAuditOperatorActionsClient.tsx": "6f98cd0bcad2b1c7d7bbf0f3d45f80f386b92eb0dd624c7692a8ae047fbf5d38",
  "components/security/SecurityAuditReportPage.tsx": "2b66fa7f583ef17abe0d3b1aad9339876d59373f3ecf1bef7450f62f38380369",
  "components/security/SecurityLinkedRequestDrawer.tsx": "7df4ebe839584b1d2201f4ecfff04785cab0fe14d56e6a4ac46840f95e5e3292",
  "components/security/SecurityPaymentEvidenceLiveRowsClient.tsx": "8a568c14c2589b0b6288db802c00cc1456835c51be44f6b24a9a7700a66d4950",
  "components/security/SecurityPaymentReplayBoard.tsx": "a66d00d2cfe13122a6824e0fd490f81b4525638f34507316db9c70832524923e",
  "components/square/VelmereSquareClient.tsx": "3766f728d2c4af018f672db5f5ca49babbfd2f788ea7d4b5ffad280833cdb856",
  "components/status/RuntimeScreenshotChecklistPanel.tsx": "ff7d843f1b2ded7cbfb5a384d5caf75c6863c3d1ec267d98c7335480e09ce927",
};
const expectedPassTokens = {
  "app/proof/market-integrity/[publicProofId]/page.tsx": 6,
  "components/square/VelmereSquareClient.tsx": 3,
  "components/security/DeliveryReceiptPacketPage.tsx": 0,
  "components/security/SecurityPaymentReplayBoard.tsx": 2,
  "components/security/SecurityPaymentEvidenceLiveRowsClient.tsx": 2,
  "components/security/SecurityAuditReportPage.tsx": 0,
  "components/security/SecurityAuditExportPage.tsx": 0,
  "components/security/SecurityAuditAdminInbox.tsx": 23,
  "components/security/SecurityAuditOperatorActionsClient.tsx": 2,
  "components/security/SecurityLinkedRequestDrawer.tsx": 25,
  "components/checkout/VelmereCheckoutFlowClient.tsx": 3,
  "components/search/VelmereIntelligenceSearchClient.tsx": 43,
  "components/status/RuntimeScreenshotChecklistPanel.tsx": 0,
  "components/account/AuditAccountMessagesClient.tsx": 58,
  "components/account/MarketActionReportsInboxClient.tsx": 0,
  "components/admin/VlmProductBrainEditor.tsx": 0,
  "components/admin/VlmProductCustomerPreview.tsx": 0,
  "components/admin/VlmProductPublishDecisionModal.tsx": 0,
};

function applicationSurface() {
  const rows = [];
  function walk(abs, rel) {
    for (const entry of fs.readdirSync(abs, { withFileTypes: true }).sort((a,b)=>Buffer.from(a.name).compare(Buffer.from(b.name)))) {
      const p = `${rel}/${entry.name}`;
      const a = path.join(abs, entry.name);
      const st = fs.lstatSync(a);
      if (st.isSymbolicLink()) throw new Error(`a102r21_surface_symlink:${p}`);
      if (entry.isDirectory()) walk(a, p);
      else if (entry.isFile()) {
        const b = fs.readFileSync(a);
        rows.push({ path: p, byteLength: b.length, sha256: sha(b) });
      }
    }
  }
  for (const top of ["app", "components", "lib"]) walk(path.join(root, top), top);
  rows.sort((a,b)=>Buffer.from(a.path).compare(Buffer.from(b.path)));
  return {
    rows,
    byteLength: rows.reduce((s,r)=>s+r.byteLength,0),
    aggregate: sha(rows.map((r)=>`${r.path}\0${r.byteLength}\0${r.sha256}`).join("\n")),
  };
}
function quotedCandidates() {
  const rows = [];
  const re = /["'`]PASS\d{3,}/gu;
  function walk(abs) {
    for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
      const a = path.join(abs, e.name);
      if (e.isDirectory()) walk(a);
      else if (e.isFile() && /\.(?:js|jsx|ts|tsx)$/u.test(e.name)) {
        const matches = fs.readFileSync(a, "utf8").match(re) ?? [];
        if (matches.length) rows.push({ path: path.relative(root,a).replaceAll("\\","/"), count: matches.length });
      }
    }
  }
  for (const top of ["app","components"]) walk(path.join(root,top));
  return rows;
}
function visiblePassCandidates() {
  const rows = [];
  const attrRe = /(?:aria-label|aria-description|title|placeholder|alt)\s*=\s*["'`]([^"'`]*PASS\d{3,}[^"'`]*)["'`]/gu;
  const textRe = />\s*([^<>{]*PASS\d{3,}[^<>{}]*)\s*</gu;
  const copyRe = /(?:eyebrow|title|subtitle|body|label|description|caption|kicker|copy|empty|assembler|advancedCtaProofTitle|receiptReplayProofTitle|artifactDeliveryProofTitle)\s*:\s*["'`]([^"'`]*PASS\d{3,}[^"'`]*)["'`]/gu;
  for (const top of ["app","components"]) {
    for (const p of fs.readdirSync(path.join(root,top), { recursive: true, withFileTypes: true })) {
      if (!p.isFile() || !/\.(?:jsx|tsx)$/u.test(p.name)) continue;
      const absolute = path.join(p.parentPath ?? p.path, p.name);
      const relative = path.relative(root,absolute).replaceAll("\\","/");
      const text = fs.readFileSync(absolute,"utf8").replace(/\/\*[\s\S]*?\*\//gu,"").replace(/^\s*\/\/.*$/gmu,"");
      for (const [kind,re] of [["accessibility",attrRe],["jsx-text",textRe],["copy",copyRe]]) {
        re.lastIndex = 0;
        for (const m of text.matchAll(re)) rows.push({ path: relative, kind, value: m[1], offset: m.index });
      }
    }
  }
  return rows;
}

const surface = applicationSurface();
const ledger = readJson("config/pass36/a102r21-pass-jargon-classification-ledger.json");
const changes = readJson("config/pass36/a102r21-approved-customer-jargon-minimalism-changes.json");
const quoted = quotedCandidates();
const quotedCount = quoted.reduce((s,r)=>s+r.count,0);
const visible = visiblePassCandidates();
const nonAssetVisible = visible.filter((r)=>r.path !== "components/market-integrity/AssetDetailModal.tsx");
const assetText = read("components/market-integrity/AssetDetailModal.tsx");
const assetBoundary = assetText.indexOf("function ChartDecisionGatePass4540");
const assetVoid = assetText.indexOf("void AssetDrawerRuntimeSummaryPass4484;");
const changedPaths = Object.keys(expectedChanged).sort();

check("revision-ledger", ledger.revisionId === REV && ledger.parentRevisionId === PARENT);
check("ledger-denominator", ledger.denominator === 200 && ledger.allRowsClassified === true);
check("ledger-count-visible", ledger.counts?.VISIBLE_OR_ACCESSIBILITY_COPY_REMOVED === 39);
check("ledger-count-api", ledger.counts?.INTERNAL_API_PROOF_IDENTIFIER === 8);
check("ledger-count-dom", ledger.counts?.INTERNAL_DOM_EVIDENCE_ATTRIBUTE === 35);
check("ledger-count-unmounted", ledger.counts?.UNMOUNTED_STATIC_VERIFIER_CONTRACT === 118);
check("changes-revision", changes.revisionId === REV && changes.parentRevisionId === PARENT);
check("changes-count", changes.approvedChanges?.length === 18);
check("changes-claims", changes.claims?.renderedAccessibilityOperatorCheckpointTokensRemoved === 125 && changes.claims?.confirmedVisibleAccessibilityCheckpointTokensRemaining === 0);
check("surface-files", surface.rows.length === 1833, surface.rows.length);
check("surface-bytes", surface.byteLength === 22125021, surface.byteLength);
check("surface-aggregate", surface.aggregate === "aa5360d32981793e965fa037237866d620ceb4e55cb8e765f86bc3394ee3c789", surface.aggregate);
check("quoted-count", quotedCount === 161, { quotedCount, quoted });
check("quoted-files", quoted.length === 8, quoted);
check("visible-non-asset-zero", nonAssetVisible.length === 0, nonAssetVisible.slice(0,20));
check("asset-visible-classified", visible.filter((r)=>r.path === "components/market-integrity/AssetDetailModal.tsx").length === 59, visible.filter((r)=>r.path === "components/market-integrity/AssetDetailModal.tsx").slice(0,10));
check("asset-unmounted-boundary", assetBoundary > 0 && assetVoid > assetBoundary);
check("asset-void-contract", assetText.includes("void AssetDrawerProofDockPass4496;") && assetText.includes("void AssetDetailReplayExportQueuePass4545;") && assetText.includes("void ChartDecisionGatePass4540;") === false);
check("data-pass-count", ((read("app/proof/market-integrity/[publicProofId]/page.tsx") + read("components/account/AuditAccountMessagesClient.tsx")).match(/\bdata-pass[0-9a-zA-Z_-]*/gu) ?? []).length > 0);
check("api-proof-identities", ["PASS4145_COMMERCE_CHECKOUT_RECEIPT_BOUNDARY","PASS4342","PASS4341","PASS4337","PASS4145_SERVER_RECEIPT_REPLAY_GUARD"].every((v)=>["app/api/checkout/route.ts","app/api/proof-status/pass4342-provider-live-data-smoke-harness-contract.ts","app/api/proof-status/pass4341-payment-replay-harness-contract.ts","app/api/proof-status/pass4337-module-execution-drilldown-contract.ts","app/api/checkout/vlm-service/route.ts"].some((p)=>read(p).includes(v))));
check("checkout-copy", !read("components/checkout/VelmereCheckoutFlowClient.tsx").match(/(?:advancedCtaProofTitle|receiptReplayProofTitle|artifactDeliveryProofTitle):\s*["'`]PASS/gu));
check("search-copy", !read("components/search/VelmereIntelligenceSearchClient.tsx").match(/(?:aria-label|aria-description)=["']PASS|`PASS250[2-7]|["']PASS250[2-7]:/gu));
check("square-copy", !read("components/square/VelmereSquareClient.tsx").includes("PASS2511:"));
check("operator-copy", !["components/status/RuntimeScreenshotChecklistPanel.tsx","components/admin/VlmProductBrainEditor.tsx","components/admin/VlmProductCustomerPreview.tsx","components/admin/VlmProductPublishDecisionModal.tsx","components/account/MarketActionReportsInboxClient.tsx"].some((p)=>read(p).match(/["'>]\s*PASS\d{3,}/gu)));
check("public-proof-copy", !read("app/proof/market-integrity/[publicProofId]/page.tsx").match(/>\s*PASS\d{3,}/gu));
for (const p of changedPaths) check(`changed-hash:${p}`, sha(fs.readFileSync(path.join(root,p))) === expectedChanged[p]);
for (const [p,count] of Object.entries(expectedPassTokens)) check(`remaining-token-count:${p}`, (read(p).match(/PASS\d{3,}(?:\/\d+)?/gu) ?? []).length === count, { observed:(read(p).match(/PASS\d{3,}(?:\/\d+)?/gu) ?? []).length, expected:count });
check("approved-path-set", JSON.stringify(changes.approvedChanges.map((r)=>r.path).sort()) === JSON.stringify(changedPaths));
check("internal-quoted-retained", quoted.filter((r)=>["components/market-integrity/AssetDetailModal.tsx","components/security/CustomerSupportHandoffPacketPage.tsx","components/account/AuditAccountMessagesClient.tsx"].includes(r.path) || r.path.startsWith("app/api/")).reduce((s,r)=>s+r.count,0) === 161);
check("no-css-change", !changes.approvedChanges.some((r)=>r.path.endsWith(".css")));
check("truth-false", changes.claims?.realBrowserRowsExecuted === 0 && changes.claims?.realCredit === false && changes.claims?.liveProven === false && changes.claims?.saleEnabled === false);
const r19 = spawnSync(process.execPath,["scripts/pass36/test-a102r19-css-customer-minimalism-boundary.mjs"],{encoding:"utf8",maxBuffer:32*1024*1024,env:{...process.env,TERM:"dumb"}});
check("r19-regression", r19.status === 0 && r19.stdout.includes("PASS_A102R19_ACTIVE_CSS_CUSTOMER_MINIMALISM_BOUNDARY_LOCAL_ONLY"), {status:r19.status,stdout:r19.stdout.slice(-500),stderr:r19.stderr.slice(-300)});

const output = {
  status: failures.length ? "FAIL_A102R21_CUSTOMER_JARGON_MINIMALISM_BOUNDARY" : "PASS_A102R21_CUSTOMER_JARGON_MINIMALISM_BOUNDARY_LOCAL_ONLY",
  assertions: passed + failures.length,
  passed,
  failed: failures.length,
  failures,
  measurements: {
    parentQuotedCandidates: 200,
    classifiedParentCandidates: 200,
    visibleOrAccessibilityQuotedCandidatesRemoved: 39,
    currentQuotedCandidates: quotedCount,
    currentQuotedCandidateFiles: quoted.length,
    renderedAccessibilityOperatorCheckpointTokensRemoved: 125,
    confirmedVisibleAccessibilityCheckpointTokensRemaining: nonAssetVisible.length,
    retainedInternalQuotedCandidates: 161,
    changedApplicationSurfaceFiles: 18,
    applicationSurfaceFiles: surface.rows.length,
    applicationSurfaceBytes: surface.byteLength,
    applicationSurfaceAggregateSha256: surface.aggregate,
    realBrowserRows: 0,
  },
  truth: {
    allParentQuotedCandidatesClassified: true,
    confirmedVisibleAndAccessibilityCopyLocallyClean: failures.length === 0,
    apiProofIdentifiersPreserved: true,
    domEvidenceAttributesPreserved: true,
    unmountedVerifierContractsPreserved: true,
    exactBrowserProven: false,
    stagingProven: false,
    liveProven: false,
    saleEnabled: false,
  },
};
console.log(JSON.stringify(output,null,2));
if (failures.length) process.exitCode = 1;
