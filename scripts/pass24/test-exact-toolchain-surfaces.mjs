#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { ROOT, readJson } from "./runtime-lib.mjs";

const expectedNode = "24.18.0";
const expectedNpm = "11.16.0";
const pkg = readJson(path.join(ROOT, "package.json"));
const checks = [];
const check = (condition, message) => { assert.equal(Boolean(condition), true, message); checks.push(message); };
check(pkg.engines?.node === expectedNode, "package engines.node exact");
check(pkg.engines?.npm === expectedNpm, "package engines.npm exact");
check(pkg.packageManager === `npm@${expectedNpm}`, "packageManager exact");
check(pkg.volta?.node === expectedNode && pkg.volta?.npm === expectedNpm, "Volta exact");
check(pkg.devEngines?.runtime?.version === expectedNode, "devEngines runtime exact");
check(pkg.devEngines?.packageManager?.version === expectedNpm, "devEngines npm exact");
check(fs.readFileSync(path.join(ROOT, ".nvmrc"), "utf8").trim() === expectedNode, ".nvmrc exact");
check(fs.readFileSync(path.join(ROOT, ".node-version"), "utf8").trim() === expectedNode, ".node-version exact");
const activeRoots = [path.join(ROOT, "scripts"), path.join(ROOT, ".github")];
const stale = [];
const visit = (directory) => {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(absolute);
    else if (entry.isFile()) {
      const text = fs.readFileSync(absolute, "utf8");
      if (/24\.16(?:\.0|\.x)?|11\.14(?:\.0|\.x)?/u.test(text)) stale.push(path.relative(ROOT, absolute).replaceAll(path.sep, "/"));
    }
  }
};
for (const root of activeRoots) visit(root);
check(stale.length === 0, `no active stale runtime literals (${stale.join(",")})`);
console.log(`PASS29 exact toolchain surfaces: ${checks.length}/${checks.length} PASS`);
