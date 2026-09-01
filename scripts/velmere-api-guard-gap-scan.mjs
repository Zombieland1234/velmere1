import fs from "node:fs";
import path from "node:path";

const generatedAt = new Date().toISOString();
const repoRoot = process.cwd();
const reportsDir = path.join(repoRoot, "reports");
fs.mkdirSync(reportsDir, { recursive: true });

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name === "route.ts") out.push(full);
  }
  return out;
}
function rel(file) { return path.relative(repoRoot, file).replaceAll(path.sep, "/"); }
function hasAny(body, needles) { return needles.some((needle) => body.includes(needle)); }
function routeScan(file) {
  const body = fs.readFileSync(file, "utf8");
  const methods = ["GET", "POST", "PUT", "PATCH", "DELETE"].filter((method) => body.includes(`export async function ${method}`));
  const isWrite = methods.some((method) => method !== "GET");
  const flags = {
    rateLimit: hasAny(body, ["applySoftRateLimit", "applyWriteApiRateLimit", "rateLimit"]),
    originGuard: hasAny(body, ["assertSameOriginRequest", "validateCheckoutRequestBoundary", "stripe.webhooks.constructEvent"]),
    sizeGuard: hasAny(body, ["rejectLargeContentLength", "rejectOversizedUrl", "validateCheckoutRequestBoundary", "stripe.webhooks.constructEvent"]),
    jsonHardening: hasAny(body, ["securityJson", "validateCheckoutRequestBoundary"]),
    authOrEntitlement: hasAny(body, ["requireAdmin", "assertAdmin", "requireAuth", "resolveVlmAdvancedOnlyAccess", "verifyVlmPaidAccessEntitlement", "admin", "session"]),
    auditLike: hasAny(body, ["audit", "ledger", "recordSecurityEvent", "recordVlmSecurityInspection", "flushOrderEventStorageWrites"]),
    stripeSignature: body.includes("stripe.webhooks.constructEvent"),
  };
  const route = rel(file);
  const sensitive = /\/api\/(admin|checkout|stripe|security|ops)\//.test(`/${route}`) || route.includes("/api/admin/");
  const gaps = [];
  if (isWrite && !flags.sizeGuard) gaps.push("write_no_size_guard");
  if (isWrite && !flags.originGuard && !flags.stripeSignature) gaps.push("write_no_origin_guard");
  if (isWrite && !flags.rateLimit && !flags.stripeSignature) gaps.push("write_no_rate_limit");
  if (sensitive && !flags.auditLike) gaps.push("sensitive_no_obvious_audit_or_ledger");
  let severity = "ok";
  if (gaps.length >= 3 || gaps.includes("sensitive_no_obvious_audit_or_ledger")) severity = "p1";
  else if (gaps.length) severity = "p2";
  return { route, methods, isWrite, sensitive, severity, gaps, flags };
}

const rows = walk(path.join(repoRoot, "app", "api")).map(routeScan).sort((a, b) => {
  const order = { p1: 0, p2: 1, ok: 2 };
  return order[a.severity] - order[b.severity] || a.route.localeCompare(b.route);
});
const gaps = rows.filter((row) => row.gaps.length);
const summary = {
  schemaVersion: "velmere.pass2176.api-guard-gap-scan.v1",
  generatedAt,
  status: gaps.some((row) => row.severity === "p1") ? "REVIEW" : "PASS",
  totalRoutes: rows.length,
  routesWithGaps: gaps.length,
  p1Count: gaps.filter((row) => row.severity === "p1").length,
  p2Count: gaps.filter((row) => row.severity === "p2").length,
  note: "Static scan only. Some routes may use custom guards not recognized by this scanner; review before changing payment/webhook semantics.",
  rows,
};
const jsonPath = path.join(reportsDir, "PASS2176_API_GUARD_GAP_SCAN.json");
const mdPath = path.join(reportsDir, "PASS2176_API_GUARD_GAP_SCAN.md");
fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
const top = gaps.slice(0, 30).map((row) => `| ${row.severity.toUpperCase()} | \`${row.route}\` | ${row.methods.join(", ")} | ${row.gaps.join(", ")} |`).join("\n");
fs.writeFileSync(mdPath, `# PASS2176 — API Guard Gap Scan\n\nGenerated: ${generatedAt}\n\nStatus: **${summary.status}**\n\nRoutes scanned: **${summary.totalRoutes}**\n\nRoutes with gaps: **${summary.routesWithGaps}**\n\nP1: **${summary.p1Count}** · P2: **${summary.p2Count}**\n\nThis is a static scan. Treat it as a prioritization board, not a final runtime security proof.\n\n| Severity | Route | Methods | Gaps |\n|---|---|---:|---|\n${top || "| OK | — | — | — |"}\n\n## Already improved in PASS2176\n\n- Legacy VLM brain GET route now has URL size guard, soft rate limit and prompt/security inspection.\n- Product checkout guard POST now has body size guard, same-origin check and soft rate limit.\n- VLM service checkout POST now has body size guard, same-origin check and soft rate limit.\n\n## Next security pass\n\nClose P1 write endpoints in admin, square, profile, lens-report, VLM service verify and security QA routes.\n`);
console.log(JSON.stringify({ status: summary.status, totalRoutes: summary.totalRoutes, routesWithGaps: summary.routesWithGaps, p1Count: summary.p1Count, p2Count: summary.p2Count, jsonPath, mdPath }, null, 2));
