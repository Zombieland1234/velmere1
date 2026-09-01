#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";

const root = process.cwd();
const productionRoots = ["app", "components"];
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function listCssFiles(directory) {
  const files = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`production_css_symlink_rejected:${path.relative(root, absolute)}`);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && entry.name.endsWith(".css")) files.push(absolute);
    }
  };
  visit(directory);
  return files;
}

function scanGluedAttributeDescendants(css) {
  const findings = [];
  let quote = null;
  let escaped = false;
  let comment = false;
  let line = 1;
  let column = 1;
  for (let index = 0; index < css.length; index += 1) {
    const character = css[index];
    const next = css[index + 1];
    if (character === "\n") {
      line += 1;
      column = 1;
      continue;
    }
    if (comment) {
      if (character === "*" && next === "/") {
        comment = false;
        index += 1;
        column += 2;
      } else {
        column += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      column += 1;
      continue;
    }
    if (character === "/" && next === "*") {
      comment = true;
      index += 1;
      column += 2;
      continue;
    }
    if (character === "\"" || character === "'") {
      quote = character;
      column += 1;
      continue;
    }
    if (character === "]") {
      const token = css.slice(index + 1).match(/^(\*|[A-Za-z_-][\w-]*)/u)?.[1];
      if (token) {
        findings.push({
          offset: index,
          line,
          column,
          token,
          context: css.slice(Math.max(0, index - 48), Math.min(css.length, index + token.length + 50)),
        });
      }
    }
    column += 1;
  }
  return findings;
}

let assertions = 0;
const equal = (actual, expected, message) => {
  assert.equal(actual, expected, message);
  assertions += 1;
};
const deepEqual = (actual, expected, message) => {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
};

deepEqual(
  scanGluedAttributeDescendants("[data-a]*{color:red}[data-b]span{color:blue}").map((row) => row.token),
  ["*", "span"],
  "universal and type-selector corruption fixtures are rejected",
);
deepEqual(
  scanGluedAttributeDescendants("[class*=\"hero\"]button{}@media (width>1px){[data-c]section{}}").map((row) => row.token),
  ["button", "section"],
  "attribute-operator and nested-at-rule corruption fixtures are rejected",
);
equal(scanGluedAttributeDescendants("[data-a] *{}[data-b] > span{}[data-c]:hover{}").length, 0, "valid selector boundaries pass");
equal(scanGluedAttributeDescendants("a::after{content:\"]span\"}/* [data-a]button{} */").length, 0, "strings and comments do not create false positives");
equal(scanGluedAttributeDescendants("[data-a=\"escaped\\\\\\\"]span\"] > span{}").length, 0, "escaped attribute strings do not create false positives");

const cssFiles = productionRoots.flatMap((relative) => listCssFiles(path.join(root, relative))).sort();
assert.ok(cssFiles.length > 0, "production CSS denominator must not be empty");
assertions += 1;
const productionFindings = [];
let productionBytes = 0;
let parsedRules = 0;
let parsedSelectorNodes = 0;
for (const absolute of cssFiles) {
  const css = fs.readFileSync(absolute, "utf8");
  productionBytes += Buffer.byteLength(css);
  for (const finding of scanGluedAttributeDescendants(css)) {
    productionFindings.push({ path: path.relative(root, absolute).split(path.sep).join("/"), ...finding });
  }
  const tree = postcss.parse(css, { from: absolute });
  tree.walkRules((rule) => {
    const selectorTree = selectorParser().astSync(rule.selector);
    parsedRules += 1;
    parsedSelectorNodes += selectorTree.nodes.length;
  });
}
assert.deepEqual(productionFindings, [], `production CSS contains glued attribute descendants: ${JSON.stringify(productionFindings.slice(0, 20))}`);
assertions += 1;
assert.ok(parsedRules > 0 && parsedSelectorNodes > 0, "PostCSS and selector parser denominator must not be empty");
assertions += 1;

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "velmere-a94-css-"));
let tailwind;
try {
  const output = path.join(temporary, "globals.css");
  const cli = path.join(root, "node_modules", "tailwindcss", "lib", "cli.js");
  tailwind = spawnSync(process.execPath, [
    cli,
    "-c", path.join(root, "tailwind.config.ts"),
    "-i", path.join(root, "app", "globals.css"),
    "-o", output,
    "--minify",
  ], {
    cwd: root,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH ?? "",
      LANG: process.env.LANG ?? "C.UTF-8",
      NODE_ENV: "production",
      CI: "1",
      NO_COLOR: "1",
    },
    maxBuffer: 8 * 1024 * 1024,
    timeout: 120_000,
  });
  equal(tailwind.status, 0, `real Tailwind compile failed: ${(tailwind.stderr ?? "").slice(-2_000)}`);
  equal(tailwind.signal, null, "real Tailwind compile was not signaled");
  equal(tailwind.error, undefined, "real Tailwind compile did not raise a spawn error");
  assert.ok(fs.statSync(output).size > 0, "real Tailwind output must be non-empty");
  assertions += 1;
  const outputBytes = fs.readFileSync(output);
  console.log(JSON.stringify({
    schemaVersion: "velmere.pass36.a94.css-parser-corruption-boundary.v1",
    status: "PASS_LOCAL_BEHAVIOR",
    assertions,
    productionCss: {
      files: cssFiles.length,
      bytes: productionBytes,
      gluedAttributeDescendants: productionFindings.length,
      postcssRulesParsed: parsedRules,
      selectorNodesParsed: parsedSelectorNodes,
    },
    tailwind: {
      node: process.version,
      exitCode: tailwind.status,
      signal: tailwind.signal,
      outputBytes: outputBytes.length,
      outputSha256: sha256(outputBytes),
      stderrTail: (tailwind.stderr ?? "").split(/\r?\n/u).slice(-12),
    },
    truthBoundary: "Scans all app/components production CSS and executes a real local Tailwind compile. Turbopack, browser, staging and visual semantics remain separate gates.",
  }, null, 2));
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}
