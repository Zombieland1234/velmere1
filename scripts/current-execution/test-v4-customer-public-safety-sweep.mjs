import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const SOURCE_EXT = new Set([".ts", ".tsx", ".mts", ".mjs", ".js"]);
const SKIP = new Set(["node_modules", ".next", ".git", "fixtures", "artifacts", "receipts"]);
const PREFIX = ["app/api/", "lib/server/"];

function walk(directory, out = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (SKIP.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file, out);
    else if (SOURCE_EXT.has(path.extname(entry.name))) out.push(file);
  }
  return out;
}

function balancedResponseCall(text, start, marker) {
  let depth = 1;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = start + marker.length; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (lineComment) {
      if (character === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") { blockComment = false; index += 1; }
      continue;
    }
    if (quote !== null) {
      if (escaped) { escaped = false; continue; }
      if (character === "\\") { escaped = true; continue; }
      if (character === quote) quote = null;
      continue;
    }
    if (character === "/" && next === "/") { lineComment = true; index += 1; continue; }
    if (character === "/" && next === "*") { blockComment = true; index += 1; continue; }
    if (character === "\"" || character === "'" || character === "`") { quote = character; continue; }
    if (character === "(") depth += 1;
    else if (character === ")") {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return text.slice(start, Math.min(text.length, start + 5_000));
}

function responseWindows(text) {
  const markers = ["NextResponse.json(", "Response.json(", "new Response("];
  const out = [];
  for (const marker of markers) {
    let index = 0;
    while ((index = text.indexOf(marker, index)) !== -1) {
      out.push({ index, text: balancedResponseCall(text, index, marker) });
      index += marker.length;
    }
  }
  return out;
}

const rules = [
  [/(?:error|message|detail|reason)\s*:\s*(?:error|err|cause)\.message\b/gu, "raw_exception_text"],
  [/\bstack\s*:\s*(?:error|err|cause)\.stack\b/gu, "raw_exception_stack"],
  [/\brawResponse\s*:\s*(?:response|error|err|cause|payload|body)\b/gu, "raw_provider_response"],
  [/\b(?:privateKey|seedPhrase|apiKey|serviceRoleKey|refreshToken)\s*:\s*(?!null\b|false\b|true\b)/gu, "credential_value"],
  [/\bauthorization\s*:\s*(?:request|req)\.headers|getHeader\(|headers\.get\(/gu, "authorization_header_value"],
  [/\bproviderUrl\s*:\s*(?:provider|response|result|error|err|cause)\./gu, "raw_provider_url"],
  [/(?:mode|availability)\s*:\s*["'](?:withheld|WITHHELD)["'][\s\S]{0,1800}?riskScore\s*:\s*(?!null\b)/gu, "withheld_risk_value"],
  [/(?:mode|availability)\s*:\s*["'](?:withheld|WITHHELD)["'][\s\S]{0,1800}?confidence\s*:\s*(?!null\b)/gu, "withheld_confidence_value"],
];

const failureMap = new Map();
let checkedFiles = 0;
let checkedResponses = 0;
for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file).split(path.sep).join("/");
  if (!PREFIX.some((prefix) => rel.startsWith(prefix))) continue;
  const text = fs.readFileSync(file, "utf8");
  const windows = responseWindows(text);
  if (!windows.length) continue;
  checkedFiles += 1;
  for (const window of windows) {
    checkedResponses += 1;
    for (const [pattern, rule] of rules) {
      pattern.lastIndex = 0;
      if (pattern.test(window.text)) {
        const key = `${rel}:${rule}`;
        if (!failureMap.has(key)) failureMap.set(key, { file: rel, rule, firstResponseOffset: window.index });
      }
    }
  }
}

const failures = [...failureMap.values()].sort((left, right) =>
  left.file.localeCompare(right.file) || left.rule.localeCompare(right.rule));
const sourceFiles = walk(ROOT).map((file) => path.relative(ROOT, file).split(path.sep).join("/")).sort();
const result = {
  schemaVersion: "velmere.v4.customer-public-safety-sweep.v3",
  checkedFiles,
  checkedResponses,
  rules: rules.map(([, rule]) => rule),
  failures,
  ok: failures.length === 0,
  sourceListDigest: crypto.createHash("sha256").update(JSON.stringify(sourceFiles)).digest("hex"),
  truthBoundary: "Static customer/public response sweep. Safe hashed authorization receipts and bearer-usage metadata are not credentials; runtime route authorization and redaction tests remain required.",
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ok) process.exit(1);
