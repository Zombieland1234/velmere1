import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}
function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

const required = [
  "lib/security/payment-runtime-evidence.ts",
  "lib/security/stripe-webhook-replay-qa.ts",
  "app/api/security/payment-runtime-evidence/route.ts",
  "app/api/security/stripe-webhook-replay-qa/route.ts",
  "docs/security/PAYMENT_RUNTIME_EVIDENCE_CAPTURE.md",
  "docs/security/STRIPE_WEBHOOK_REPLAY_QA_LEDGER.md",
  "VELMERE_PASS192_PAYMENT_RUNTIME_EVIDENCE_REPLAY_QA_REPORT.md",
  "VELMERE_PASS192_FULL_MASTER_PROGRESS_MATRIX.md",
];

for (const file of required) {
  if (!exists(file)) errors.push(`${file} is missing`);
}

const evidence = read("lib/security/payment-runtime-evidence.ts");
const replay = read("lib/security/stripe-webhook-replay-qa.ts");
const evidenceRoute = read("app/api/security/payment-runtime-evidence/route.ts");
const replayRoute = read("app/api/security/stripe-webhook-replay-qa/route.ts");
const paymentReview = read("lib/security/payment-webhook-security.ts");
const releaseGate = read("lib/security/security-release-gate.ts");
const runtimeQa = read("lib/security/security-runtime-qa.ts");
const readinessRoute = read("app/api/security/readiness/route.ts");
const exportRoute = read("app/api/security/export/route.ts");
const operationsRoute = read("app/api/security/operations-checklist/route.ts");
const abuseRoute = read("app/api/security/abuse-shield/route.ts");
const consolePanel = read("components/admin/SecurityConsolePanel.tsx");
const docEvidence = read("docs/security/PAYMENT_RUNTIME_EVIDENCE_CAPTURE.md");
const docReplay = read("docs/security/STRIPE_WEBHOOK_REPLAY_QA_LEDGER.md");
const preflight = read("scripts/vercel-preflight.mjs");
const matrix = read("VELMERE_PASS192_FULL_MASTER_PROGRESS_MATRIX.md");

for (const token of [
  "PaymentRuntimeEvidenceRecord",
  "recordPaymentRuntimeEvidence",
  "buildPaymentRuntimeEvidenceSnapshot",
  "cleanText",
  "redacted-card-like",
  "no raw Stripe payloads",
]) {
  if (!evidence.includes(token)) errors.push(`payment-runtime-evidence.ts missing token: ${token}`);
}

for (const token of [
  "stripeWebhookReplayScenarios",
  "recordStripeWebhookReplayEvidence",
  "buildStripeWebhookReplayQaSnapshot",
  "duplicate-replay",
  "unsupported-signed-event",
  "printful-failure-path",
]) {
  if (!replay.includes(token)) errors.push(`stripe-webhook-replay-qa.ts missing token: ${token}`);
}

for (const [name, source] of [
  ["payment-runtime-evidence", evidenceRoute],
  ["stripe-webhook-replay-qa", replayRoute],
]) {
  for (const token of ["applyApiAbuseShield", "verifySecurityAdminToken", "security:events", "payloadTooLarge", "POST", "GET"]) {
    if (!source.includes(token)) errors.push(`${name} route missing token: ${token}`);
  }
}

for (const token of ["buildPaymentRuntimeEvidenceSnapshot", "buildStripeWebhookReplayQaSnapshot", "runtimeEvidence", "replayQa"]) {
  if (!paymentReview.includes(token)) errors.push(`payment webhook security missing PASS192 token: ${token}`);
}

for (const token of ["buildPaymentRuntimeEvidenceSnapshot", "buildStripeWebhookReplayQaSnapshot", "paymentRuntimeEvidence", "stripeWebhookReplayQa", "paymentEvidenceProgress"]) {
  if (!releaseGate.includes(token)) errors.push(`release gate missing PASS192 token: ${token}`);
}

for (const token of ["payment-runtime-evidence-api", "stripe-webhook-replay-qa-ledger", "paymentRuntimeEvidence", "stripeWebhookReplayQa"]) {
  if (!runtimeQa.includes(token)) errors.push(`runtime QA missing PASS192 token: ${token}`);
}

for (const token of ["paymentRuntimeEvidence", "stripeWebhookReplayQa", "buildPaymentRuntimeEvidenceSnapshot", "buildStripeWebhookReplayQaSnapshot"]) {
  if (!readinessRoute.includes(token)) errors.push(`readiness route missing PASS192 token: ${token}`);
  if (!exportRoute.includes(token)) errors.push(`export route missing PASS192 token: ${token}`);
  if (!operationsRoute.includes(token)) errors.push(`operations route missing PASS192 token: ${token}`);
  if (!abuseRoute.includes(token)) errors.push(`abuse route missing PASS192 token: ${token}`);
}

for (const token of [
  "buildPaymentRuntimeEvidenceSnapshot",
  "buildStripeWebhookReplayQaSnapshot",
  "/api/security/payment-runtime-evidence",
  "/api/security/stripe-webhook-replay-qa",
  "paymentEvidence.total",
  "replayQa.averageProgress",
]) {
  if (!consolePanel.includes(token)) errors.push(`admin security console missing PASS192 token: ${token}`);
}

for (const token of ["Payment Runtime Evidence Capture", "No raw", "safe POST payload"]) {
  if (!docEvidence.includes(token)) errors.push(`payment runtime evidence doc missing token: ${token}`);
}

for (const token of ["Stripe Webhook Replay QA Ledger", "Duplicate webhook replay", "Unsupported signed event"]) {
  if (!docReplay.includes(token)) errors.push(`stripe replay QA doc missing token: ${token}`);
}

for (const area of [
  "Payment runtime evidence capture",
  "Stripe webhook replay QA ledger",
  "Payment/webhook security",
  "Real browser QA lane",
  "Całość launch-ready",
]) {
  if (!matrix.includes(area)) errors.push(`PASS192 full master matrix missing area: ${area}`);
}

const safeSurface = `${evidence}\n${replay}\n${evidenceRoute}\n${replayRoute}\n${paymentReview}\n${releaseGate}\n${runtimeQa}\n${docEvidence}\n${docReplay}`.toLowerCase();
for (const forbidden of ["card number", "cvc", "raw stripe payload stored", "secret:", "unhackable", "guaranteed secure", "best security in the world"]) {
  if (safeSurface.includes(forbidden)) errors.push(`Unsafe payment evidence/replay wording found: ${forbidden}`);
}

for (const token of ["verify-pass192-payment-runtime-evidence-replay-qa-safety.mjs", "PASS192"]) {
  if (!preflight.includes(token)) errors.push(`vercel-preflight.mjs missing PASS192 marker: ${token}`);
}

if (errors.length) {
  console.error("PASS192 payment runtime evidence / replay QA safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS192 payment runtime evidence / replay QA safety OK");
