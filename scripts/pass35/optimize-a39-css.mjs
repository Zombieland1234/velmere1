#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const writeMode = process.argv.includes("--write");
const TARGETS = [
  "app/globals.css",
  "components/intelligence/IntelligenceLuxury.module.css",
  "components/intelligence/IntelligencePage.module.css",
];
const GROUP_AT_RULES = new Set(["media", "supports", "layer", "container", "document", "scope"]);

function skipTrivia(text, start, end) {
  let index = start;
  while (index < end) {
    if (/\s/.test(text[index])) {
      index += 1;
      continue;
    }
    if (text[index] === "/" && text[index + 1] === "*") {
      const close = text.indexOf("*/", index + 2);
      if (close === -1) throw new Error(`unterminated_css_comment:${index}`);
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
      if (char === "*" && next === "/") {
        comment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "*") {
      comment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "(") parentheses += 1;
    else if (char === ")") parentheses = Math.max(0, parentheses - 1);
    else if (char === "[") brackets += 1;
    else if (char === "]") brackets = Math.max(0, brackets - 1);
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
      if (char === "*" && next === "/") {
        comment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "*") {
      comment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "(") parentheses += 1;
    else if (char === ")") parentheses = Math.max(0, parentheses - 1);
    else if (char === "[") brackets += 1;
    else if (char === "]") brackets = Math.max(0, brackets - 1);
    else if (parentheses === 0 && brackets === 0 && char === "{") depth += 1;
    else if (parentheses === 0 && brackets === 0 && char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error(`unbalanced_css_brace:${open}`);
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
      if (char === "*" && next === "/") {
        comment = false;
        index += 1;
        pendingSpace = true;
      }
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
    if (char === "/" && next === "*") {
      comment = true;
      index += 1;
      pendingSpace = true;
      continue;
    }
    if (char === '"' || char === "'") {
      if (pendingSpace && result && !result.endsWith(" ")) result += " ";
      pendingSpace = false;
      quote = char;
      result += char;
      continue;
    }
    if (/\s/.test(char)) {
      pendingSpace = true;
      continue;
    }
    if (pendingSpace && result && !result.endsWith(" ")) result += " ";
    pendingSpace = false;
    result += char;
  }
  return result.trim();
}

function atRuleName(head) {
  const match = head.match(/^@([a-zA-Z-]+)/);
  return match?.[1]?.toLowerCase() ?? "";
}

function collectRules(text) {
  const rules = [];
  const parseRange = (start, end, pathStack) => {
    let index = start;
    while (index < end) {
      index = skipTrivia(text, index, end);
      if (index >= end) break;
      const ruleStart = index;
      const terminator = scanTerminator(text, ruleStart, end);
      if (terminator === -1) break;
      if (text[terminator] === ";") {
        index = terminator + 1;
        continue;
      }
      const close = matchingBrace(text, terminator, end);
      const rawHead = text.slice(ruleStart, terminator).trim();
      const name = atRuleName(rawHead);
      if (name && GROUP_AT_RULES.has(name)) {
        parseRange(terminator + 1, close, [...pathStack, canonicalize(rawHead)]);
      } else {
        const rawContent = text.slice(terminator + 1, close);
        rules.push({
          start: ruleStart,
          end: close + 1,
          key: JSON.stringify([pathStack, canonicalize(rawHead), canonicalize(rawContent)]),
          head: canonicalize(rawHead),
        });
      }
      index = close + 1;
    }
  };
  parseRange(0, text.length, []);
  return rules;
}

function optimizeText(text) {
  const rules = collectRules(text);
  const groups = new Map();
  for (const rule of rules) {
    const list = groups.get(rule.key) ?? [];
    list.push(rule);
    groups.set(rule.key, list);
  }
  const duplicates = [...groups.values()].filter((group) => group.length > 1);
  const removals = duplicates.flatMap((group) => group.slice(0, -1)).sort((a, b) => b.start - a.start);
  let optimized = text;
  for (const rule of removals) optimized = optimized.slice(0, rule.start) + optimized.slice(rule.end);
  const remainingDuplicates = [...new Map(collectRules(optimized).map((rule) => [rule.key, 0])).keys()];
  const optimizedRules = collectRules(optimized);
  const counts = new Map();
  for (const rule of optimizedRules) counts.set(rule.key, (counts.get(rule.key) ?? 0) + 1);
  const afterExtras = [...counts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
  return {
    optimized,
    beforeRules: rules.length,
    duplicateGroups: duplicates.length,
    duplicateExtras: removals.length,
    afterExtras,
    removedBytes: Buffer.byteLength(text) - Buffer.byteLength(optimized),
    sampleHeads: duplicates.slice(0, 12).map((group) => group[0].head),
    remainingKeyCount: remainingDuplicates.length,
  };
}

const results = [];
for (const relative of TARGETS) {
  const absolute = path.join(root, relative);
  const before = fs.readFileSync(absolute, "utf8");
  const result = optimizeText(before);
  if (result.afterExtras !== 0) throw new Error(`a39_css_duplicate_cleanup_incomplete:${relative}:${result.afterExtras}`);
  if (writeMode && result.duplicateExtras > 0) fs.writeFileSync(absolute, result.optimized);
  results.push({
    path: relative,
    beforeBytes: Buffer.byteLength(before),
    afterBytes: Buffer.byteLength(result.optimized),
    removedBytes: result.removedBytes,
    rules: result.beforeRules,
    duplicateGroups: result.duplicateGroups,
    duplicateExtras: result.duplicateExtras,
    afterExtras: result.afterExtras,
    sampleHeads: result.sampleHeads,
  });
}

console.log(JSON.stringify({
  status: writeMode ? "PASS_A39_CSS_EXACT_DUPLICATES_REMOVED" : "PASS_A39_CSS_EXACT_DUPLICATE_SCAN",
  writeMode,
  files: results,
  totals: {
    removedBytes: results.reduce((sum, result) => sum + result.removedBytes, 0),
    duplicateGroups: results.reduce((sum, result) => sum + result.duplicateGroups, 0),
    duplicateExtras: results.reduce((sum, result) => sum + result.duplicateExtras, 0),
  },
  visualClaimed: false,
}, null, 2));
