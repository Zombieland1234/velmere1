import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const checks = [
  ["pass420 module", read("lib/market-integrity/pass420-browser-anchor-cleanroom.ts"), ["PASS420.browser_anchor_cleanroom", "PASS420_RUNTIME_CLOSE_EVENT", "pass420ClampSuggestions", "sticky under the nav", "without internal scroll"]],
  ["browser client", read("components/search/VelmereIntelligenceSearchClient.tsx"), ["PASS420_RUNTIME_CLOSE_EVENT", "pass420BrowserAnchorCleanroom", "pass420ClampSuggestions", "data-pass420-browser-top-anchor", "data-pass420-three-visible-no-scroll", "vlm-browser-pass420-pdf-mini-card", "max 3 · bez scrolla"]],
  ["browser client scroll", read("components/search/VelmereIntelligenceSearchClient.tsx"), ["window.addEventListener(\"resize\", updateFrame)", "PASS420 BROWSER ANCHOR CLEANROOM"]],
  ["css", read("app/globals.css"), ["PASS420 · Browser Anchor Cleanroom", "position: sticky", "data-pass420-three-visible-no-scroll", "max-height: none", "vlm-browser-pass420-pdf-mini-card"]],
  ["report", read("VELMERE_PASS420_BROWSER_ANCHOR_CLEANROOM_REPORT.md"), ["PASS420", "three rows without an internal scrollbar", "Page scroll no longer closes", "Bottom Lens capsule remains"]],
];

for (const [label, source, needles] of checks) {
  for (const needle of needles) {
    if (!source.includes(needle)) {
      console.error(`PASS420 verify failed in ${label}: missing ${needle}`);
      process.exit(1);
    }
  }
}

const browser = read("components/search/VelmereIntelligenceSearchClient.tsx");
if (browser.includes("closeOnPageScroll")) {
  console.error("PASS420 verify failed: Browser suggestions must not close on page scroll.");
  process.exit(1);
}
if ((browser.match(/data-pass420-input-pinned-search/g) ?? []).length < 2) {
  console.error("PASS420 verify failed: PASS420 input and panel anchors missing.");
  process.exit(1);
}

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry.name) && entry.name !== "next-env.d.ts") files.push(full);
  }
}
walk(root);

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  if (sf.parseDiagnostics.length) {
    console.error(`PASS420 parser failed in ${path.relative(root, file)}`);
    for (const diagnostic of sf.parseDiagnostics.slice(0, 5)) console.error(ts.flattenDiagnosticMessageText(diagnostic.messageText, " "));
    process.exit(1);
  }
}

console.log(`PASS420 browser anchor cleanroom verified · ${files.length} TS/TSX parsed`);
