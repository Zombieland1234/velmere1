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

const audit = read("lib/launch/site-page-audit.ts");
const progress = read("lib/launch/project-progress.ts");
const requiredRoutes = [
  "app/[locale]/page.tsx",
  "app/[locale]/clothing/page.tsx",
  "app/[locale]/shop/page.tsx",
  "app/[locale]/shop/[id]/page.tsx",
  "app/[locale]/cart/page.tsx",
  "app/[locale]/checkout/page.tsx",
  "app/[locale]/vlm-token/page.tsx",
  "app/[locale]/vlm-token/faq/page.tsx",
  "app/[locale]/square/page.tsx",
  "app/[locale]/community/page.tsx",
  "app/[locale]/market-integrity/page.tsx",
  "app/[locale]/market-integrity/shield-map/page.tsx",
  "app/[locale]/market-integrity/about/page.tsx",
  "app/[locale]/account/page.tsx",
  "app/[locale]/login/page.tsx",
  "app/[locale]/member/page.tsx",
  "app/[locale]/lookbook/page.tsx",
  "app/[locale]/research-lab/page.tsx",
  "app/[locale]/legal/privacy/page.tsx",
  "app/[locale]/legal/terms/page.tsx",
  "app/[locale]/legal/shipping/page.tsx",
  "app/[locale]/returns/page.tsx",
  "app/[locale]/impressum/page.tsx",
  "app/[locale]/admin/import-products/page.tsx",
];

for (const route of requiredRoutes) {
  if (!exists(route)) errors.push(`Missing expected route file: ${route}`);
}

for (const needle of [
  "VelmereSitePageAuditItem",
  "velmereSitePageAudit",
  "velmereCriticalPageBlockers",
  "velmereSitePageAuditSummary",
  "VLM token / access layer",
  "Velmère Square",
  "Shield market table",
  "Admin import products",
  "vercelRisk",
  "launchBlockers",
  "nextPass",
]) {
  if (!audit.includes(needle)) errors.push(`site-page-audit.ts missing marker: ${needle}`);
}

const itemCount = (audit.match(/id: "/g) ?? []).length;
if (itemCount < 18) errors.push(`site-page-audit.ts should audit at least 18 pages/systems, found ${itemCount}.`);

for (const forbidden of [
  "guaranteed profit",
  "safe investment",
  "risk-free",
  "buy signal",
  "sell signal",
  "scam confirmed",
  "fraud proven",
]) {
  if (audit.toLowerCase().includes(forbidden)) errors.push(`site-page-audit.ts contains forbidden wording: ${forbidden}`);
}

if (!progress.includes("velmereProjectProgress")) errors.push("project-progress.ts is missing progress matrix export.");

if (errors.length) {
  console.error("Site page audit safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Site page audit safety checks passed.");
