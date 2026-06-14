import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const checks = [
  ["PASS1534 lib exists", () => exists("lib/security/pass1534-audit-review-flow.ts")],
  ["PASS1534 id exported", () => read("lib/security/pass1534-audit-review-flow.ts").includes("PASS1534_AUDIT_REVIEW_FLOW_ID")],
  ["84 task standard recorded", () => read("lib/security/pass1534-audit-review-flow.ts").includes("PASS1534_AUDIT_REVIEW_FLOW_TASKS = 84")],
  ["review levels implemented", () => ["free_scan", "basic_review", "pro_review", "advanced_review"].every((needle) => read("lib/security/pass1534-audit-review-flow.ts").includes(needle))],
  ["normalizer exists", () => read("lib/security/pass1534-audit-review-flow.ts").includes("normalizeAuditReviewSubmission")],
  ["preview builder exists", () => read("lib/security/pass1534-audit-review-flow.ts").includes("buildAuditVerificationPreview")],
  ["Lens PDF audit report hook", () => read("lib/security/pass1534-audit-review-flow.ts").includes("audit_verification_report")],
  ["Shield Map graph hook", () => read("lib/security/pass1534-audit-review-flow.ts").includes("audit_claim_evidence_graph")],
  ["responsible disclosure boundary", () => read("lib/security/pass1534-audit-review-flow.ts").includes("Responsible Disclosure Guard") || read("lib/security/pass1534-audit-review-flow.ts").includes("responsible disclosure")],
  ["no exploit instruction boundary", () => read("lib/security/pass1534-audit-review-flow.ts").includes("no-exploit-instructions")],
  ["client console exists", () => exists("components/security/SecurityAuditReviewConsole.tsx")],
  ["client console posts API", () => read("components/security/SecurityAuditReviewConsole.tsx").includes("/api/security/audit-watch")],
  ["client console exposes pass marker", () => read("components/security/SecurityAuditReviewConsole.tsx").includes("data-pass1534-audit-review-console")],
  ["audit page embeds console", () => read("components/security/SecurityAuditWatchPage.tsx").includes("<SecurityAuditReviewConsole flow={auditReviewFlow} />")],
  ["audit page builds flow", () => read("components/security/SecurityAuditWatchPage.tsx").includes("buildAuditReviewFlow(locale)")],
  ["API returns sample preview", () => read("app/api/security/audit-watch/route.ts").includes("samplePreview")],
  ["API returns preview on POST", () => read("app/api/security/audit-watch/route.ts").includes("preview") && read("app/api/security/audit-watch/route.ts").includes("buildAuditVerificationPreview")],
  ["API has PASS1534 header", () => read("app/api/security/audit-watch/route.ts").includes("x-velmere-audit-review-flow")],
  ["old PASS1494 verifier still present", () => exists("scripts/verify-pass1494-1533-audit-watch-security-desk.mjs")],
  ["progress doc exists", () => exists("docs/progress/PASS1534_1573_AUDIT_REVIEW_FLOW.md")],
  ["progress doc keeps legal boundary", () => read("docs/progress/PASS1534_1573_AUDIT_REVIEW_FLOW.md").includes("No unauthorized active testing")],
  ["package has verifier", () => read("package.json").includes("verify:pass1534-1573-audit-review-flow")],
  ["safe badge language remains", () => read("lib/security/pass1494-audit-watch.ts").includes("Certified Safe") && read("lib/security/pass1534-audit-review-flow.ts").includes("Pre-Audit Review")],
  ["no certified-safe product claim", () => !read("components/security/SecurityAuditReviewConsole.tsx").includes("Certified Safe")],
  ["no exploit details in UI", () => !read("components/security/SecurityAuditReviewConsole.tsx").toLowerCase().includes("exploit instructions")],
];

const failures = [];
for (const [label, fn] of checks) {
  let ok = false;
  try { ok = Boolean(fn()); } catch { ok = false; }
  if (!ok) failures.push(label);
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
}

if (failures.length) {
  console.error(`\nPASS1534–1573 audit review flow failed ${failures.length}/${checks.length}`);
  process.exit(1);
}
console.log(`\nPASS1534–1573 audit review flow passed ${checks.length}/${checks.length}`);
