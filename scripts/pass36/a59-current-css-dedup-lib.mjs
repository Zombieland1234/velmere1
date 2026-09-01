import fs from "node:fs";
import path from "node:path";
import { inspectCssIdentity, sha256 } from "./a59-current-identity-lib.mjs";

export const CURRENT_CSS_DEDUP_SCHEMA = "velmere.pass36.a59.current-css-exact-dedup.v2";
export const CURRENT_CSS_DEDUP_STATUS = "PASS_A59_CURRENT_CSS_EXACT_DUPLICATE_SCAN";
const GROUP_AT_RULES = new Set(["media", "supports", "layer", "container", "document", "scope", "starting-style"]);

function fail(code, detail = null) {
  const error = new Error(detail === null ? code : `${code}: ${detail}`);
  error.code = code;
  error.detail = detail;
  throw error;
}

function skipTrivia(text, start, end) {
  let index = start;
  while (index < end) {
    if (/\s/u.test(text[index])) { index += 1; continue; }
    if (text[index] === "/" && text[index + 1] === "*") {
      const close = text.indexOf("*/", index + 2);
      if (close === -1) fail("CSS_DEDUP_UNTERMINATED_COMMENT", String(index));
      index = close + 2;
      continue;
    }
    break;
  }
  return index;
}

function scanTerminator(text, start, end) {
  let quote = "";
  let escaped = false;
  let comment = false;
  let parentheses = 0;
  let brackets = 0;
  for (let index = start; index < end; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (comment) {
      if (char === "*" && next === "/") { comment = false; index += 1; }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "*") { comment = true; index += 1; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === "(") parentheses += 1;
    else if (char === ")") {
      if (parentheses === 0) fail("CSS_DEDUP_STRAY_CLOSING_PAREN", String(index));
      parentheses -= 1;
    }
    else if (char === "[") brackets += 1;
    else if (char === "]") {
      if (brackets === 0) fail("CSS_DEDUP_STRAY_CLOSING_BRACKET", String(index));
      brackets -= 1;
    }
    else if (parentheses === 0 && brackets === 0 && char === "}") fail("CSS_DEDUP_STRAY_CLOSING_BRACE", String(index));
    else if (parentheses === 0 && brackets === 0 && (char === "{" || char === ";")) return index;
  }
  return -1;
}

function matchingBrace(text, open, end) {
  let depth = 1;
  let quote = "";
  let escaped = false;
  let comment = false;
  let parentheses = 0;
  let brackets = 0;
  for (let index = open + 1; index < end; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (comment) {
      if (char === "*" && next === "/") { comment = false; index += 1; }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "*") { comment = true; index += 1; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === "(") parentheses += 1;
    else if (char === ")") {
      if (parentheses === 0) fail("CSS_DEDUP_STRAY_CLOSING_PAREN", String(index));
      parentheses -= 1;
    }
    else if (char === "[") brackets += 1;
    else if (char === "]") {
      if (brackets === 0) fail("CSS_DEDUP_STRAY_CLOSING_BRACKET", String(index));
      brackets -= 1;
    }
    else if (parentheses === 0 && brackets === 0 && char === "{") depth += 1;
    else if (parentheses === 0 && brackets === 0 && char === "}" && --depth === 0) return index;
  }
  fail("CSS_DEDUP_UNBALANCED_BRACE", String(open));
}

function canonicalize(fragment) {
  let result = "";
  let quote = "";
  let escaped = false;
  let comment = false;
  let pendingSpace = false;
  for (let index = 0; index < fragment.length; index += 1) {
    const char = fragment[index];
    const next = fragment[index + 1];
    if (comment) {
      if (char === "*" && next === "/") { comment = false; index += 1; pendingSpace = true; }
      continue;
    }
    if (quote) {
      if (pendingSpace && result && !result.endsWith(" ")) result += " ";
      pendingSpace = false;
      result += char;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "*") { comment = true; index += 1; pendingSpace = true; continue; }
    if (char === '"' || char === "'") {
      if (pendingSpace && result && !result.endsWith(" ")) result += " ";
      pendingSpace = false;
      quote = char;
      result += char;
      continue;
    }
    if (/\s/u.test(char)) { pendingSpace = true; continue; }
    if (pendingSpace && result && !result.endsWith(" ")) result += " ";
    pendingSpace = false;
    result += char;
  }
  return result.trim();
}

function collectRules(text) {
  const rules = [];
  const parseRange = (start, end, stack) => {
    let index = start;
    while (index < end) {
      index = skipTrivia(text, index, end);
      if (index >= end) break;
      const terminator = scanTerminator(text, index, end);
      if (terminator === -1) {
        const tail = skipTrivia(text, index, end);
        if (tail < end) fail("CSS_DEDUP_UNPARSED_TAIL", String(tail));
        break;
      }
      if (text[terminator] === ";") {
        const statement = canonicalize(text.slice(index, terminator + 1));
        if (!statement.startsWith("@")) fail("CSS_DEDUP_UNSUPPORTED_STATEMENT", statement.slice(0, 120));
        rules.push({ key: JSON.stringify([stack, statement]), head: statement });
        index = terminator + 1;
        continue;
      }
      const close = matchingBrace(text, terminator, end);
      const head = canonicalize(text.slice(index, terminator));
      const atRule = head.match(/^@([a-zA-Z-]+)/u)?.[1]?.toLowerCase() ?? "";
      if (atRule && GROUP_AT_RULES.has(atRule)) parseRange(terminator + 1, close, [...stack, head]);
      else rules.push({ key: JSON.stringify([stack, head, canonicalize(text.slice(terminator + 1, close))]), head });
      index = close + 1;
    }
  };
  parseRange(0, text.length, []);
  return rules;
}

export function analyzeCssExactDuplicates(text) {
  if (typeof text !== "string") fail("CSS_DEDUP_TEXT_REQUIRED");
  const rules = collectRules(text);
  const groups = new Map();
  for (const rule of rules) {
    const group = groups.get(rule.key) ?? [];
    group.push(rule);
    groups.set(rule.key, group);
  }
  const duplicates = [...groups.values()].filter((group) => group.length > 1);
  return {
    rules: rules.length,
    duplicateGroups: duplicates.length,
    currentDuplicateExtras: duplicates.reduce((sum, group) => sum + group.length - 1, 0),
    sampleHeads: duplicates.slice(0, 12).map((group) => group[0].head),
  };
}

export function buildCurrentCssDedupScan({ root, profileCssPressure, receiptFiles, allowedRoots }) {
  const before = inspectCssIdentity({ root, profileCssPressure, receiptFiles, allowedRoots });
  const profilePaths = [...new Set(profileCssPressure.map((row) => row?.file))].sort();
  if (profilePaths.length !== profileCssPressure.length) fail("CSS_DEDUP_PROFILE_DUPLICATE_PATH");
  if (JSON.stringify(profilePaths) !== JSON.stringify(before.identityRows.map((row) => row.path))) fail("CSS_DEDUP_PROFILE_PATH_SET_MISMATCH");
  const files = [];
  for (const identity of before.identityRows) {
    const bytes = fs.readFileSync(path.join(root, ...identity.path.split("/")));
    if (bytes.length !== identity.bytes || sha256(bytes) !== identity.sha256) fail("CSS_DEDUP_FILE_IDENTITY_MISMATCH", identity.path);
    files.push({ path: identity.path, byteLength: bytes.length, sha256: identity.sha256, ...analyzeCssExactDuplicates(bytes.toString("utf8")) });
  }
  const after = inspectCssIdentity({ root, profileCssPressure, receiptFiles, allowedRoots });
  if (before.finalIdentitySha256 !== after.finalIdentitySha256) fail("CSS_DEDUP_SOURCE_CHANGED_DURING_SCAN");
  return {
    profileIdentity: {
      fileCount: before.fileCount,
      totalBytes: before.totalBytes,
      pathSetSha256: before.pathSetSha256,
      finalIdentitySha256: before.finalIdentitySha256,
    },
    files,
    totals: {
      rules: files.reduce((sum, row) => sum + row.rules, 0),
      duplicateGroups: files.reduce((sum, row) => sum + row.duplicateGroups, 0),
      currentDuplicateExtras: files.reduce((sum, row) => sum + row.currentDuplicateExtras, 0),
    },
  };
}

export function verifyCurrentCssDedupReceipt({ root, profileCssPressure, receiptFiles, allowedRoots, receipt }) {
  if (!receipt || receipt.schemaVersion !== CURRENT_CSS_DEDUP_SCHEMA || receipt.status !== CURRENT_CSS_DEDUP_STATUS) fail("CSS_DEDUP_RECEIPT_IDENTITY_INVALID");
  if (receipt.writeMode !== false || receipt.cssMutationApplied !== false || receipt.evidenceClass !== "TESTED_STATIC") fail("CSS_DEDUP_READ_ONLY_BOUNDARY_INVALID");
  const expected = buildCurrentCssDedupScan({ root, profileCssPressure, receiptFiles, allowedRoots });
  if (JSON.stringify(receipt.profileIdentity) !== JSON.stringify(expected.profileIdentity)) fail("CSS_DEDUP_PROFILE_IDENTITY_MISMATCH");
  if (JSON.stringify(receipt.files) !== JSON.stringify(expected.files)) fail("CSS_DEDUP_FILE_ROWS_MISMATCH");
  if (JSON.stringify(receipt.totals) !== JSON.stringify(expected.totals)) fail("CSS_DEDUP_TOTALS_MISMATCH");
  if (expected.totals.currentDuplicateExtras !== 0) fail("CSS_DEDUP_CURRENT_EXTRAS_PRESENT", String(expected.totals.currentDuplicateExtras));
  return expected;
}
