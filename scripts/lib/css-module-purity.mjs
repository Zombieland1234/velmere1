import fs from "node:fs";
import path from "node:path";

const SKIP_DIRECTORIES = new Set(["node_modules", ".git", ".next", ".velmere"]);

function walk(directory, output) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (SKIP_DIRECTORIES.has(entry.name) || entry.name.startsWith(".next-pass")) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, output);
    else if (entry.isFile() && entry.name.endsWith(".module.css")) output.push(absolute);
  }
}

function stripGlobalFunctions(selector) {
  let output = selector;
  let previous;
  do {
    previous = output;
    output = output.replace(/:global\((?:[^()]|\([^()]*\))*\)/gu, "");
  } while (output !== previous);
  return output;
}

function selectorHasLocalAnchor(selector) {
  const local = stripGlobalFunctions(selector)
    .replace(/:global\s+/gu, "")
    .replace(/\[[^\]]*\]/gu, " ");
  return /(?:^|[\s>+~])(?:\.[A-Za-z_-][\w-]*|#[A-Za-z_-][\w-]*)/u.test(local.trim());
}

function lineNumber(text, offset) {
  return text.slice(0, offset).split("\n").length;
}

export function scanCssModulePurity(root = process.cwd()) {
  const files = [];
  walk(root, files);
  const failures = [];
  let selectorGroups = 0;

  for (const absolute of files.sort()) {
    const source = fs.readFileSync(absolute, "utf8");
    const cleaned = source.replace(/\/\*[\s\S]*?\*\//gu, (match) => " ".repeat(match.length));
    const boundary = /(^|\})([^{}]+)\{/gmu;
    let match;
    while ((match = boundary.exec(cleaned))) {
      const selectorText = match[2].trim();
      if (!selectorText || selectorText.startsWith("@") || !selectorText.includes(":global")) continue;
      selectorGroups += 1;
      const selectors = selectorText.split(",").map((value) => value.trim()).filter(Boolean);
      for (const selector of selectors) {
        if (selectorHasLocalAnchor(selector)) continue;
        failures.push({
          file: path.relative(root, absolute).split(path.sep).join("/"),
          line: lineNumber(cleaned, match.index + match[1].length),
          selector,
          reason: "CSS Modules pure mode requires at least one local class or id in every selector.",
        });
      }
    }
  }

  return {
    schemaVersion: "velmere.pass35.a43.css-module-purity.v1",
    files: files.length,
    selectorGroups,
    failures,
    ok: failures.length === 0,
  };
}
