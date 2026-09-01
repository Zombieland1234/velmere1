import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

export function sha256Bytes(value) { return createHash("sha256").update(value).digest("hex"); }
export function commonImplementationDigest(root = process.cwd()) {
  const ignoredDirectories = new Set([".git", ".next", ".velmere", "_velmere", "node_modules", "artifacts", "coverage", "out", "output", "build"]);
  const ignoredFiles = new Set(["CLEAN_SAFE_VERIFICATION.json"]);
  const ignoredPrefixes = ["evaluation/pass17/", "evaluation/pass18/", "evaluation/pass19/", "evaluation/pass20/"];
  const ignoredExact = new Set([
    "config/pass17/typescript-syntax-scan.json", "config/pass17/package-payload-manifest.json", "config/pass17/PASS17_DIFF_FROM_PASS16.json",
    "config/pass18/typescript-syntax-scan.json", "config/pass18/package-payload-manifest.json", "config/pass18/PASS18_DIFF_FROM_PASS17.json",
    "config/pass19/typescript-syntax-scan.json", "config/pass19/package-payload-manifest.json", "config/pass19/PASS19_DIFF_FROM_PASS18.json",
    "config/pass20/typescript-syntax-scan.json", "config/pass20/package-payload-manifest.json", "config/pass20/PASS20_DIFF_FROM_PASS19.json",
    "config/pass21/typescript-syntax-scan.json", "config/pass21/package-payload-manifest.json", "config/pass21/PASS21_DIFF_FROM_PASS20.json",
    "config/pass22/typescript-syntax-scan.json", "config/pass22/package-payload-manifest.json", "config/pass22/PASS22_DIFF_FROM_PASS21.json",
    "config/pass23/typescript-syntax-scan.json", "config/pass23/package-payload-manifest.json", "config/pass23/PASS23_DIFF_FROM_PASS22.json",
    "config/pass24/package-payload-manifest.json", "config/pass24/PASS24_DIFF_FROM_PASS23.json",
    "config/pass25/package-payload-manifest.json", "config/pass25/PASS25_DIFF_FROM_PASS24.json",
    "config/pass26/ci-contract.json", "config/pass26/package-payload-manifest.json", "config/pass26/PASS26_DIFF_FROM_PASS25.json",
  ]);
  const rows = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const relativeParent = path.relative(root, directory).replaceAll(path.sep, "/");
      if (entry.isDirectory() && (relativeParent === "" || relativeParent === ".")
        && (ignoredDirectories.has(entry.name) || entry.name.startsWith(".next-pass25-"))) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile() && !ignoredFiles.has(entry.name) && !entry.name.endsWith(".tsbuildinfo")) {
        const relative = path.relative(root, absolute).replaceAll(path.sep, "/");
        if (ignoredPrefixes.some((prefix) => relative.startsWith(prefix)) || ignoredExact.has(relative)) continue;
        const bytes = fs.readFileSync(absolute);
        rows.push(`${relative}\0${bytes.length}\0${sha256Bytes(bytes)}`);
      }
    }
  }
  walk(root);
  rows.sort();
  return { sha256: sha256Bytes(rows.join("\n")), files: rows.length };
}
