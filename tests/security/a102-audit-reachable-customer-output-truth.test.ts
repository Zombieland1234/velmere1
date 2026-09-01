import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const intake = readFileSync("lib/server/security-route-modules/audit-intake.ts", "utf8");
const client = readFileSync("components/security/SecurityAuditsCleanPage.tsx", "utf8");
const sku = readFileSync("lib/commerce/vlm-current-sku-truth.ts", "utf8");
const commercial = readFileSync("lib/security/audit-commercial-sku-truth.ts", "utf8");

// Active intake truth: Basic creates/queues a persisted case but does not return a completed analysis payload.
assert.match(intake, /status === "queued_basic_prescreen"[\s\S]*?"basic_prescreen_queue"/);
assert.match(intake, /"x-velmere-audit-analysis-started": "false"/);
assert.doesNotMatch(intake, /\banalysis\s*:\s*(?!false)/);

// Active customer surface must describe the currently reachable output, not the historical/dead result scaffold.
assert.match(client, /Basic pre-screen saved to the queue\./);
assert.match(client, /Queued — result not delivered/);
assert.match(client, /Result and PDF: not yet delivered/);
assert.match(client, /PDF report", basic: "Not yet delivered"/);
assert.doesNotMatch(client, /type BasicAuditEvidenceAnalysis/);
assert.doesNotMatch(client, /const BASIC_RESULT_COPY/);
assert.doesNotMatch(client, /setBasicAnalysis\(/);
assert.doesNotMatch(client, /features: \["Automated contract scan", "Severity and evidence status", "Public PDF report"\]/);

// Canonical SKU/commercial truth must not grant completed Basic analysis/report value until a reachable result path exists.
assert.match(sku, /Free prescreen queue intake/);
assert.match(sku, /does not yet deliver a completed analysis result or report/);
assert.match(commercial, /"free prescreen queue intake", "case reference and status", "no completed analysis output claimed"/);

// Paid tiers stay fail-closed on the public Audit surface.
assert.match(client, /data-pass35-paid-tier-state="unavailable-not-for-sale"/);
assert.match(client, /const unavailable = tier\.id !== "basic"/);
assert.match(sku, /publicCheckoutAllowed: false/);
assert.match(sku, /saleEnabled: false/);

console.log("A102 Audit reachable customer-output truth regression: PASS");
