#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const outRoot = join(root, "dist-handoff");
const packName = "velmere_gemini_slim_pass863";
const packDir = join(outRoot, packName);
const zipPath = join(outRoot, `${packName}.zip`);

const includeRoots = [
  "app",
  "components",
  "lib",
  "store",
  "messages",
  "scripts/check-runtime-env.mjs",
  "scripts/verify-pass824-833-runtime-cleanup.mjs",
  "scripts/verify-pass834-843-evidence-graph.mjs",
  "scripts/verify-pass844-853-unified-asset-modal.mjs",
  "scripts/create-gemini-slim-handoff.mjs",
  "scripts/verify-pass854-863-gemini-unified-shell.mjs",
  "package.json",
  "package-lock.json",
  "next.config.mjs",
  "tsconfig.json",
  "tailwind.config.ts",
  "postcss.config.mjs",
  "middleware.ts",
  ".node-version",
  ".nvmrc",
  ".npmrc",
  ".env.example",
  "GEMINI_HANDOFF_README.md",
];

const allowedExt = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".css",
  ".md",
  ".txt",
  ".svg",
]);

const excludedDirs = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist-handoff",
  "EDITING_MAP",
  "public",
  "coverage",
  "test-results",
]);

function shouldSkipName(name) {
  return (
    name.endsWith(".zip") ||
    name.endsWith(".pdf") ||
    /^PASS\d+/.test(name) ||
    name.includes("IMPLEMENTATION_REPORT") ||
    name.includes("CHANGED_FILES") ||
    name.includes("BUILD_NOTES") ||
    name.includes("RELEASE_PROOF") ||
    name.includes("STATIC_SCAN")
  );
}

function extOf(path) {
  const idx = path.lastIndexOf(".");
  return idx === -1 ? "" : path.slice(idx);
}

function copyFile(src, rel, files) {
  const base = rel.split(/[\\/]/)[0];
  if (excludedDirs.has(base)) return;
  if (shouldSkipName(rel.split(/[\\/]/).pop() ?? rel)) return;
  if (!allowedExt.has(extOf(rel)) && !rel.startsWith(".")) return;
  const dest = join(packDir, rel);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest);
  files.push(rel);
}

function walk(src, rel, files) {
  const name = rel.split(/[\\/]/).pop() ?? rel;
  if (excludedDirs.has(name) || shouldSkipName(name)) return;
  const st = statSync(src);
  if (st.isDirectory()) {
    for (const child of readdirSync(src)) walk(join(src, child), join(rel, child), files);
    return;
  }
  if (st.isFile()) copyFile(src, rel, files);
}

rmSync(packDir, { recursive: true, force: true });
rmSync(zipPath, { force: true });
mkdirSync(packDir, { recursive: true });

const files = [];
for (const entry of includeRoots) {
  const src = join(root, entry);
  if (!existsSync(src)) continue;
  const st = statSync(src);
  if (st.isDirectory()) walk(src, entry, files);
  else copyFile(src, entry, files);
}

let totalBytes = 0;
for (const rel of files) totalBytes += statSync(join(packDir, rel)).size;

const manifest = {
  pack: packName,
  createdAt: new Date().toISOString(),
  fileCount: files.length,
  totalBytes,
  excluded: ["node_modules", ".next", ".git", "EDITING_MAP", "PASS reports", "ZIP/PDF outputs", "public assets"],
  priorityFiles: [
    "components/Navbar.tsx",
    "components/CartDrawer.tsx",
    "components/ui/OverlayPrimitives.tsx",
    "components/market-integrity/TokenRiskModal.tsx",
    "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
    "components/market-integrity/UnifiedAssetAnalysisControls.tsx",
    "components/market-integrity/VlmNeuralAuditExperience.tsx",
    "components/market-integrity/ShieldMapClient.tsx",
    "components/search/VelmereIntelligenceSearchClient.tsx",
    "app/globals.css",
  ],
  files,
};
writeFileSync(join(packDir, "GEMINI_HANDOFF_MANIFEST.json"), JSON.stringify(manifest, null, 2));
writeFileSync(join(packDir, "GEMINI_HANDOFF_FILES.txt"), files.sort().join("\n") + "\n");

execFileSync("zip", ["-qr", zipPath, packName], { cwd: outRoot, stdio: "inherit" });
console.log(JSON.stringify({ zipPath, fileCount: files.length, totalBytes }, null, 2));
