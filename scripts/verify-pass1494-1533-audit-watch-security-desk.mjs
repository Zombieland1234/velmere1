import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const checks = [
  ["audit watch lib exists", () => exists("lib/security/pass1494-audit-watch.ts")],
  ["audit watch component exists", () => exists("components/security/SecurityAuditWatchPage.tsx")],
  ["localized audit route exists", () => exists("app/[locale]/security/audits/page.tsx")],
  ["audit watch API exists", () => exists("app/api/security/audit-watch/route.ts")],
  ["progress doc exists", () => exists("docs/progress/PASS1494_1533_AUDIT_WATCH_SECURITY_DESK.md")],
  ["PASS id exported", () => read("lib/security/pass1494-audit-watch.ts").includes("PASS1494_AUDIT_WATCH_ID")],
  ["72 task standard recorded", () => read("lib/security/pass1494-audit-watch.ts").includes("PASS1494_AUDIT_WATCH_TASKS = 72")],
  ["PL copy includes public audit verification", () => read("lib/security/pass1494-audit-watch.ts").includes("Sprawdzamy, czy znaczek audited")],
  ["EN copy includes audited badge", () => read("lib/security/pass1494-audit-watch.ts").includes("audited badge really means")],
  ["DE copy includes Audit", () => read("lib/security/pass1494-audit-watch.ts").includes("öffentliche Audits")],
  ["three review modes", () => ["Public Contract Review", "Audit Claim Check", "Authorized Vulnerability Review"].every((needle) => read("lib/security/pass1494-audit-watch.ts").includes(needle))],
  ["status matrix has changed after audit", () => read("lib/security/pass1494-audit-watch.ts").includes("changed_after_audit")],
  ["status matrix has scope mismatch", () => read("lib/security/pass1494-audit-watch.ts").includes("scope_mismatch")],
  ["responsible disclosure boundary", () => read("lib/security/pass1494-audit-watch.ts").includes("responsible_disclosure")],
  ["no custody boundary", () => read("lib/security/pass1494-audit-watch.ts").includes("no-custody") || read("lib/security/pass1494-audit-watch.ts").includes("No custody")],
  ["no seed boundary", () => read("lib/security/pass1494-audit-watch.ts").includes("no-seed") || read("lib/security/pass1494-audit-watch.ts").includes("No seed")],
  ["no investment advice boundary", () => read("lib/security/pass1494-audit-watch.ts").includes("no-investment-advice") || read("lib/security/pass1494-audit-watch.ts").includes("No investment advice")],
  ["no unauthorized testing boundary", () => read("lib/security/pass1494-audit-watch.ts").includes("no-unauthorized-active-testing") || read("lib/security/pass1494-audit-watch.ts").includes("No unauthorized testing")],
  ["component exposes pass marker", () => read("components/security/SecurityAuditWatchPage.tsx").includes("data-pass1494-audit-watch-page")],
  ["component has methodology anchor", () => read("components/security/SecurityAuditWatchPage.tsx").includes("id=\"methodology\"")],
  ["component has intake anchor", () => read("components/security/SecurityAuditWatchPage.tsx").includes("id=\"intake\"")],
  ["component has Lens PDF hook", () => read("components/security/SecurityAuditWatchPage.tsx").includes("audit.pdfHook")],
  ["component has Shield Map hook", () => read("components/security/SecurityAuditWatchPage.tsx").includes("audit.mapHook")],
  ["security landing links audit watch", () => read("components/security/SecurityTrustPage.tsx").includes("/security/audits")],
  ["navbar labels audit watch", () => read("components/Navbar.tsx").includes("audits: \"Audit Watch\"")],
  ["navbar links audit page", () => read("components/Navbar.tsx").includes("/security/audits")],
  ["API exposes POST assessment", () => read("app/api/security/audit-watch/route.ts").includes("buildAuditWatchAssessment")],
  ["API is passive public boundary", () => read("app/api/security/audit-watch/route.ts").includes("no unauthorized active testing")],
  ["safe badge language documented", () => read("lib/security/pass1494-audit-watch.ts").includes("Never: Certified Safe") || read("lib/security/pass1494-audit-watch.ts").includes("Nigdy: Certified Safe")],
  ["static smoke includes audit route", () => read("scripts/smoke-routes-static.mjs").includes("/security/audits")],
  ["package has verifier script", () => read("package.json").includes("verify:pass1494-1533-audit-watch-security-desk")],
];

const failures = [];
checks.forEach(([name, fn]) => {
  let ok = false;
  try {
    ok = Boolean(fn());
  } catch (error) {
    failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  if (!ok) failures.push(name);
});

if (failures.length) {
  console.error(`PASS1494-1533 Audit Watch verifier failed (${failures.length}/${checks.length})`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`PASS1494-1533 Audit Watch verifier PASS (${checks.length}/${checks.length})`);
