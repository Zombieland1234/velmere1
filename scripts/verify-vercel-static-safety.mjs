import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("..", import.meta.url).pathname);
const errors = [];

function walk(dir, exts, files = []) {
  const full = path.join(root, dir);
  if (!fs.existsSync(full)) return files;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git", "dist", "out"].includes(entry.name)) continue;
    const p = path.join(full, entry.name);
    if (entry.isDirectory()) walk(path.relative(root, p), exts, files);
    else if (exts.some((ext) => entry.name.endsWith(ext))) files.push(path.relative(root, p));
  }
  return files;
}

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

const sourceFiles = walk(".", [".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const runtimeFiles = sourceFiles.filter((file) => !file.startsWith("scripts/") && !file.startsWith("docs/"));
const tsxFiles = runtimeFiles.filter((file) => file.endsWith(".tsx"));

for (const file of sourceFiles) {
  const base = path.basename(file);
  if (/^CODEX_/.test(base)) errors.push(`${file}: Codex source artifact must not be deployable.`);
}

for (const file of tsxFiles) {
  const source = read(file);
  if (/<img\b/.test(source)) errors.push(`${file}: raw <img> is blocked; use next/image or existing safe image component.`);
}

for (const file of runtimeFiles) {
  const source = read(file);
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/\[\s*\.\.\.\s*[^\n;]*(\.values\(\)|\.keys\(\)|\.entries\(\))/.test(line)) {
      errors.push(`${file}:${index + 1}: direct Map/Iterator spread can fail on Vercel target; use Array.from(...).`);
    }
  });
  if (file.includes("TokenRiskModal") || file.includes("market-integrity/risk-engine")) {
    if (source.includes("result.limitations")) errors.push(`${file}: stale result.limitations access is blocked.`);
    if (source.includes("safeTileIndex")) errors.push(`${file}: old safeTileIndex workaround should not return.`);
    if (source.includes("((index % 5)") || source.includes("(index % 4)")) errors.push(`${file}: suspicious stale index transform marker.`);
  }
}

for (const file of runtimeFiles.filter((file) => file.startsWith("app/api/") || file.startsWith("app/actions/"))) {
  const source = read(file);
  for (const browserApi of ["window.", "document.", "localStorage", "navigator."]) {
    if (source.includes(browserApi)) errors.push(`${file}: browser API ${browserApi} must not be used in server route/action code.`);
  }
}

const modal = read("components/market-integrity/TokenRiskModal.tsx");
const modalBody = modal.slice(modal.indexOf("export default function TokenRiskModal"));
if (modalBody.includes("{ui.controlKicker}") && !modalBody.includes("const ui = useMemo(() =>")) {
  errors.push("TokenRiskModal uses ui control copy without main-scope ui object.");
}
for (const marker of ["downloadEvidenceManifest", "copyEvidenceManifest", "motionPreset", "requestAnimationFrame", "shield-token-review-tools-hidden"]) {
  if (!modal.includes(marker)) errors.push(`TokenRiskModal missing expected runtime safety marker: ${marker}`);
}

const appPages = walk("app", ["page.tsx"]);
if (appPages.length < 40) errors.push(`Expected broad route coverage; found only ${appPages.length} page.tsx files.`);

const packageJson = JSON.parse(read("package.json"));
if (packageJson.engines?.node !== "20.x") errors.push('package.json should pin engines.node to "20.x" for Vercel consistency.');
if (!packageJson.scripts?.["vercel:preflight"]?.includes("vercel-preflight")) errors.push("package.json missing vercel:preflight script.");

if (errors.length) {
  console.error("Vercel static safety verification failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Vercel static safety checks passed across ${runtimeFiles.length} runtime source files and ${appPages.length} pages.`);
