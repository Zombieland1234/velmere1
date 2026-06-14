#!/usr/bin/env node
import { existsSync, mkdirSync, rmSync, statSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const outRoot = join(root, "dist-handoff");
const packName = "velmere_gemini_micro_pass873";
const packDir = join(outRoot, packName);
const zipPath = join(outRoot, `${packName}.zip`);

const priorityFiles = [
  "GEMINI_HANDOFF_README.md",
  "package.json",
  "next.config.mjs",
  "tsconfig.json",
  "middleware.ts",
  "components/Navbar.tsx",
  "components/CartDrawer.tsx",
  "components/ui/OverlayPrimitives.tsx",
  "components/market-integrity/UnifiedAssetAnalysisControls.tsx",
  "components/market-integrity/TokenRiskModal.tsx",
  "components/market-integrity/CrossAssetCollapseRadarPanel.tsx",
  "components/market-integrity/VlmNeuralAuditExperience.tsx",
  "components/market-integrity/ShieldMapClient.tsx",
  "components/search/VelmereIntelligenceSearchClient.tsx",
  "scripts/check-runtime-env.mjs",
  "scripts/verify-pass864-873-shield-shell-gemini-micro.mjs",
];

const cssNeedles = [
  "unified-asset-modal-shell",
  "unified-asset-timeframe-tabs",
  "unified-asset-depth-dock",
  "real-markets-unified-asset-modal",
  "unified-shield-token-popup-shell",
  "shield-modal-backdrop",
  "square-signal-toast",
  "velmere-cart-drawer",
  "wallet",
  "dropdown",
  "shield-map-evidence",
];

function readMaybe(path) {
  const full = join(root, path);
  if (!existsSync(full)) return null;
  return readFileSync(full, "utf8");
}

function cssExcerpts() {
  const css = readMaybe("app/globals.css") ?? "";
  const lines = css.split(/\r?\n/);
  const keep = new Set();
  lines.forEach((line, index) => {
    if (cssNeedles.some((needle) => line.includes(needle))) {
      for (let i = Math.max(0, index - 3); i <= Math.min(lines.length - 1, index + 40); i += 1) {
        keep.add(i);
      }
    }
  });
  return [...keep].sort((a, b) => a - b).map((index) => lines[index]).join("\n");
}

rmSync(packDir, { recursive: true, force: true });
rmSync(zipPath, { force: true });
mkdirSync(packDir, { recursive: true });

const bundle = [];
bundle.push(`# Velmère Gemini MICRO handoff — PASS873\n`);
bundle.push(`This archive intentionally contains only 3 files. Gemini previously rejected the slim archive because it had too many files. Use VELMERE_PROJECT_BUNDLE.md as the main source.\n`);
bundle.push(`## What Gemini should review first\n`);
bundle.push(`1. Runtime/build blockers under Node 24/npm 11.\n2. Header dropdowns, wallet panel, account dropdown, cart drawer, Square toast.\n3. Unified asset modal: Shield + Real Markets must share the same modal shell, timeframe tabs and Basic/Pro/Advanced flow.\n4. VLM Brain motion/loading timing and no fake live data.\n5. Shield Map role: Evidence Graph only, not duplicate dashboard/PDF.\n`);
bundle.push(`## Important runtime truth\nProject requires Node >=24.16.0 <25 and npm >=11.16.0 <12. Local Node 22/npm 10 cannot prove npm ci/typecheck/lint/build.\n`);

const included = [];
for (const rel of priorityFiles) {
  const content = readMaybe(rel);
  if (content === null) continue;
  included.push(rel);
  bundle.push(`\n\n---\nFILE: ${rel}\n---\n`);
  bundle.push("```" + (rel.endsWith(".tsx") ? "tsx" : rel.endsWith(".ts") ? "ts" : rel.endsWith(".json") ? "json" : rel.endsWith(".mjs") ? "js" : "") + "\n");
  bundle.push(content);
  bundle.push("\n```\n");
}

bundle.push(`\n\n---\nFILE: app/globals.css selected excerpts\n---\n`);
bundle.push("```css\n");
bundle.push(cssExcerpts());
bundle.push("\n```\n");
included.push("app/globals.css selected excerpts");

const tree = [
  "# Velmère micro tree",
  "Only the files below are included in the bundle, plus selected CSS excerpts.",
  "",
  ...included.map((file) => `- ${file}`),
  "",
  "Excluded on purpose: node_modules, .next, public assets, all PASS reports, RELEASE_PROOF, EDITING_MAP, ZIP/PDF outputs, fixtures, tests, most legacy lib files.",
].join("\n");

const manifest = {
  pack: packName,
  createdAt: new Date().toISOString(),
  fileCountInsideZip: 3,
  reason: "Gemini rejected the previous slim handoff because it had too many files; this packs critical code into one Markdown bundle.",
  included,
};

writeFileSync(join(packDir, "README_GEMINI_MICRO.md"), bundle.slice(0, 5).join("\n"));
writeFileSync(join(packDir, "VELMERE_PROJECT_BUNDLE.md"), bundle.join("\n"));
writeFileSync(join(packDir, "VELMERE_MICRO_MANIFEST.json"), JSON.stringify(manifest, null, 2));
writeFileSync(join(packDir, "VELMERE_MICRO_TREE.txt"), tree);

execFileSync("zip", ["-qr", zipPath, packName], { cwd: outRoot, stdio: "inherit" });
const size = statSync(zipPath).size;
console.log(JSON.stringify({ zipPath, fileCountInsideZip: 4, sizeBytes: size, includedCount: included.length }, null, 2));
