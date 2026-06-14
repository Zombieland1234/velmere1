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
  "lib/market-integrity/contract-lens-contract.ts",
  "lib/market-integrity/osint-queue-contract.ts",
  "components/market-integrity/ContractLensPanel.tsx",
  "components/market-integrity/OsintQueuePanel.tsx",
  "app/api/market-integrity/contract-lens/route.ts",
  "app/api/market-integrity/osint-queue/route.ts",
  "VELMERE_PASS180_CONTRACT_LENS_OSINT_QUEUE_REPORT.md",
  "VELMERE_PASS180_FULL_PROGRESS_MATRIX.md",
];

for (const file of required) {
  if (!exists(file)) errors.push(`${file} is missing`);
}

const contract = read("lib/market-integrity/contract-lens-contract.ts");
const osint = read("lib/market-integrity/osint-queue-contract.ts");
const contractPanel = read("components/market-integrity/ContractLensPanel.tsx");
const osintPanel = read("components/market-integrity/OsintQueuePanel.tsx");
const contractRoute = read("app/api/market-integrity/contract-lens/route.ts");
const osintRoute = read("app/api/market-integrity/osint-queue/route.ts");
const page = read("app/[locale]/market-integrity/page.tsx");
const css = read("app/globals.css");
const preflight = read("scripts/vercel-preflight.mjs");
const matrix = read("VELMERE_PASS180_FULL_PROGRESS_MATRIX.md");

for (const token of [
  "ContractLensSignalId",
  "owner_control",
  "proxy_upgrade",
  "mint_permission",
  "blacklist_permission",
  "createContractLensPreview",
  "externalFetchPerformed: false",
  "storageWritePerformed: false",
]) {
  if (!contract.includes(token)) errors.push(`contract-lens-contract.ts missing token: ${token}`);
}

for (const token of [
  "OsintQueueItem",
  "kol-disclosure-review",
  "narrative-spike-review",
  "project-claim-check",
  "blockedClaims",
  "createOsintQueuePreview",
  "externalFetchPerformed: false",
  "storageWritePerformed: false",
]) {
  if (!osint.includes(token)) errors.push(`osint-queue-contract.ts missing token: ${token}`);
}

for (const token of ["ContractLensPanel", "createContractLensPreview", "clp-shell", "server-only analyzer"]) {
  if (!contractPanel.includes(token) && !css.includes(token)) errors.push(`ContractLensPanel/CSS missing token: ${token}`);
}

for (const token of ["OsintQueuePanel", "osintQueueItems", "safe paraphrase", "oqp-shell"]) {
  if (!osintPanel.includes(token) && !css.includes(token)) errors.push(`OsintQueuePanel/CSS missing token: ${token}`);
}

for (const token of [
  "contract_lens_preview_only",
  "externalFetchPerformed: false",
  "storageWritePerformed: false",
  "server-only analyzer output",
  "no-store",
]) {
  if (!contractRoute.includes(token)) errors.push(`contract-lens route missing token: ${token}`);
}

for (const token of [
  "osint_queue_preview_only",
  "externalFetchPerformed: false",
  "storageWritePerformed: false",
  "safe paraphrase",
  "no-store",
]) {
  if (!osintRoute.includes(token)) errors.push(`osint-queue route missing token: ${token}`);
}

for (const token of ["ContractLensPanel", "OsintQueuePanel"]) {
  if (!page.includes(token)) errors.push(`market-integrity page must render ${token}`);
}

for (const token of [
  "PASS180 · Contract Lens + OSINT Queue foundations",
  ".clp-shell",
  ".oqp-shell",
]) {
  if (!css.includes(token)) errors.push(`globals.css missing PASS180 marker: ${token}`);
}

for (const area of ["Contract lens readiness", "OSINT queue / analyst workflow", "Całość launch-ready"]) {
  if (!matrix.includes(area)) errors.push(`PASS180 matrix missing area: ${area}`);
}

const publicSurface = `${contract}\n${osint}\n${contractPanel}\n${osintPanel}\n${contractRoute}\n${osintRoute}`.toLowerCase();
for (const forbidden of ["safe investment", "scam confirmed", "fraud proven", "buy signal", "sell signal", "enter seed phrase"]) {
  if (publicSurface.includes(forbidden)) errors.push(`Forbidden Contract/OSINT wording found: ${forbidden}`);
}

for (const token of ["verify-pass180-contract-lens-osint-queue-safety.mjs", "PASS180"]) {
  if (!preflight.includes(token)) errors.push(`vercel-preflight.mjs missing PASS180 marker: ${token}`);
}

if (errors.length) {
  console.error("PASS180 Contract Lens / OSINT Queue safety failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("PASS180 Contract Lens / OSINT Queue safety OK");
