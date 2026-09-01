import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const SCRIPT_EXTENSIONS = new Set([".mjs", ".cjs", ".js", ".ts", ".tsx", ".py", ".json", ".txt"]);
const TEXT_EXTENSIONS = new Set([
  ".cjs", ".js", ".json", ".md", ".mjs", ".py", ".toml", ".ts", ".tsx", ".txt", ".yaml", ".yml",
]);
const EXCLUDED_TOP_LEVEL = new Set([
  ".git", ".next", ".next-build-webpack", ".next-build-turbopack", ".velmere", "node_modules", "artifacts", "_velmere",
]);
const OUTPUT_PATH = "config/pass35/source-lifecycle-classification.json";

const toPosix = (value) => value.split(path.sep).join("/");
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function walk(root, relative = "") {
  const absolute = path.join(root, relative);
  const entries = await fs.readdir(absolute, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const child = relative ? path.join(relative, entry.name) : entry.name;
    const top = child.split(path.sep)[0];
    if (EXCLUDED_TOP_LEVEL.has(top) || top.startsWith(".next-pass25-")) continue;
    if (entry.isDirectory()) files.push(...await walk(root, child));
    else if (entry.isFile()) files.push(toPosix(child));
  }
  return files;
}

function resolveScriptReference(sourcePath, literal, scriptSet) {
  if (!literal || literal.includes("${")) return null;
  const normalizedLiteral = literal.replaceAll("\\", "/").replace(/[?#].*$/, "");
  let candidate;
  if (normalizedLiteral.startsWith("scripts/")) candidate = normalizedLiteral;
  else if (normalizedLiteral.startsWith("./") || normalizedLiteral.startsWith("../")) {
    candidate = path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), normalizedLiteral));
  } else return null;
  const choices = [candidate, ...[".mjs", ".cjs", ".js", ".ts", ".tsx", ".py", ".json", ".txt"].map((ext) => `${candidate}${ext}`)];
  return choices.find((choice) => scriptSet.has(choice)) ?? null;
}

function extractStringLiterals(text) {
  const values = [];
  // References relevant to this inventory are path-sized. Keeping extraction
  // line-bounded avoids pathological backtracking on large source snapshots.
  for (const pattern of [/"([^"\r\n]{1,4096})"/g, /'([^'\r\n]{1,4096})'/g, /`([^`\r\n]{1,4096})`/g]) {
    for (const match of text.matchAll(pattern)) values.push(match[1]);
  }
  return values;
}

function evidenceKey(item) {
  return `${item.type}\0${item.source}\0${item.detail ?? ""}`;
}

function addEvidence(map, target, evidence) {
  const items = map.get(target) ?? [];
  const key = evidenceKey(evidence);
  if (!items.some((item) => evidenceKey(item) === key)) items.push(evidence);
  map.set(target, items);
}

function sourceKind(source) {
  if (source === "package.json") return "PACKAGE_SCRIPT";
  if (source.startsWith(".github/") || source.startsWith(".gitlab/")) return "CI";
  if (source.startsWith("config/")) return "CONFIG";
  if (source.startsWith("scripts/")) return "SCRIPT_GRAPH";
  if (/^tsconfig(?:\.|$)/.test(path.posix.basename(source))) return "TSCONFIG_EXTENDS";
  return "SOURCE_REFERENCE";
}

function isOperationalDirectSource(source) {
  if (source === "package.json") return true;
  if (source.startsWith(".github/") || source.startsWith(".gitlab/")) return true;
  if (source.startsWith("docs/") || source.endsWith(".md") || source.endsWith(".txt")) return false;
  if (source.startsWith("config/")) {
    // Inventory/provenance documents enumerate files, but do not execute them.
    // Treating those enumerations as operational roots would make every stale
    // file appear active and defeat the lifecycle classification.
    return !/(?:archive|history|retired)/i.test(source)
      && !/(?:manifest|inventory|source-identity|master-map|evidence-index|file-list|receipt|merkle|diff)/i.test(path.posix.basename(source));
  }
  return !source.startsWith("scripts/");
}

function dynamicTemplateRegex(literal) {
  if (!literal.includes("${")) return null;
  const pathAnchored = literal.includes("tsconfig.")
    || literal.includes("scripts/")
    || literal.startsWith("./")
    || literal.startsWith("../");
  if (!pathAnchored) return null;
  const staticPart = literal.replace(/\$\{[^}]+\}/g, "");
  if (staticPart.length < 5) return null;
  const escaped = literal
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\\\$\\\{[^}]+\\\}/g, ".+");
  try { return new RegExp(`^${escaped}$`); } catch { return null; }
}

export async function buildSourceLifecycleClassification(root) {
  const files = await walk(root);
  const tsconfigs = files.filter((file) => /(^|\/)tsconfig(?:\.[^/]+)?\.json$/.test(file));
  const scripts = files.filter((file) => file.startsWith("scripts/") && SCRIPT_EXTENSIONS.has(path.posix.extname(file)));
  const targets = [...tsconfigs, ...scripts].sort();
  const scriptSet = new Set(scripts);
  const tsconfigByBasename = new Map(tsconfigs.map((file) => [path.posix.basename(file), file]));
  const directEvidence = new Map();
  const allEvidence = new Map();
  const scriptEdges = new Map();
  const tsconfigEdges = new Map();

  const referenceFiles = files.filter((file) => {
    if (file === OUTPUT_PATH) return false;
    return TEXT_EXTENSIONS.has(path.posix.extname(file));
  });

  for (const source of referenceFiles) {
    let text;
    try {
      const stat = await fs.stat(path.join(root, source));
      if (stat.size > 2 * 1024 * 1024) continue;
      text = await fs.readFile(path.join(root, source), "utf8");
    } catch { continue; }
    const literals = extractStringLiterals(text);
    for (const literal of literals) {
      const normalized = literal.replaceAll("\\", "/");
      const scriptTarget = resolveScriptReference(source, normalized, scriptSet);
      if (scriptTarget && scriptTarget !== source) {
        const evidence = { type: sourceKind(source), source, detail: normalized };
        if (source.startsWith("scripts/") || isOperationalDirectSource(source)) addEvidence(allEvidence, scriptTarget, evidence);
        if (source.startsWith("scripts/")) {
          const edges = scriptEdges.get(source) ?? new Set();
          edges.add(scriptTarget);
          scriptEdges.set(source, edges);
        } else if (isOperationalDirectSource(source)) addEvidence(directEvidence, scriptTarget, evidence);
      }

      const exactTsconfig = tsconfigByBasename.get(path.posix.basename(normalized));
      if (exactTsconfig && (normalized === exactTsconfig || normalized.endsWith(`/${path.posix.basename(exactTsconfig)}`) || normalized === path.posix.basename(exactTsconfig))) {
        const evidence = { type: sourceKind(source), source, detail: normalized };
        if (source.startsWith("scripts/") || isOperationalDirectSource(source)) addEvidence(allEvidence, exactTsconfig, evidence);
        if (source.startsWith("scripts/")) {
          const edges = tsconfigEdges.get(source) ?? new Set();
          edges.add(exactTsconfig);
          tsconfigEdges.set(source, edges);
        } else if (isOperationalDirectSource(source)) addEvidence(directEvidence, exactTsconfig, evidence);
      }

      const dynamicRegex = dynamicTemplateRegex(normalized);
      if (dynamicRegex) {
        for (const target of targets) {
          if (dynamicRegex.test(target) || dynamicRegex.test(path.posix.basename(target))) {
            const evidence = { type: "DYNAMIC_PATTERN", source, detail: normalized };
            if (source.startsWith("scripts/") || isOperationalDirectSource(source)) addEvidence(allEvidence, target, evidence);
            if (source.startsWith("scripts/") && scriptSet.has(target)) {
              const edges = scriptEdges.get(source) ?? new Set();
              edges.add(target);
              scriptEdges.set(source, edges);
            } else if (isOperationalDirectSource(source)) addEvidence(directEvidence, target, evidence);
            if (source.startsWith("scripts/") && tsconfigs.includes(target)) {
              const edges = tsconfigEdges.get(source) ?? new Set();
              edges.add(target);
              tsconfigEdges.set(source, edges);
            }
          }
        }
      }
    }
  }

  // package.json commands are operational roots even when command parsing did not
  // encounter a quoted string literal.
  const packageText = await fs.readFile(path.join(root, "package.json"), "utf8");
  for (const target of scripts) {
    if (packageText.includes(target)) {
      const evidence = { type: "PACKAGE_SCRIPT", source: "package.json", detail: target };
      addEvidence(directEvidence, target, evidence);
      addEvidence(allEvidence, target, evidence);
    }
  }

  const activeScripts = new Set([...directEvidence.keys()].filter((target) => scriptSet.has(target)));
  const queue = [...activeScripts];
  while (queue.length) {
    const source = queue.shift();
    for (const target of scriptEdges.get(source) ?? []) {
      if (activeScripts.has(target)) continue;
      activeScripts.add(target);
      addEvidence(allEvidence, target, { type: "REACHABLE_IMPORT", source, detail: target });
      queue.push(target);
    }
  }

  const activeTsconfigs = new Set(["tsconfig.json"]);
  for (const target of tsconfigs) {
    if ((directEvidence.get(target) ?? []).length) activeTsconfigs.add(target);
  }
  for (const script of activeScripts) {
    for (const target of tsconfigEdges.get(script) ?? []) activeTsconfigs.add(target);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const source of [...activeTsconfigs]) {
      let parsed;
      try { parsed = JSON.parse(await fs.readFile(path.join(root, source), "utf8")); } catch { continue; }
      if (typeof parsed.extends !== "string") continue;
      const base = path.posix.basename(parsed.extends.endsWith(".json") ? parsed.extends : `${parsed.extends}.json`);
      const target = tsconfigByBasename.get(base);
      if (target && !activeTsconfigs.has(target)) {
        activeTsconfigs.add(target);
        addEvidence(allEvidence, target, { type: "TSCONFIG_EXTENDS", source, detail: parsed.extends });
        changed = true;
      }
    }
  }

  const entries = [];
  for (const target of targets) {
    const content = await fs.readFile(path.join(root, target));
    const isTsconfig = tsconfigs.includes(target);
    const isGeneratedContract = target.startsWith("scripts/contracts/") && target.endsWith(".txt");
    const isActive = isTsconfig ? activeTsconfigs.has(target) : activeScripts.has(target);
    let classification = "HISTORY";
    let rationale = "No current package, CI, configuration, source, import-graph, or bounded dynamic-pattern reachability was discovered.";
    if (isGeneratedContract) {
      classification = "GENERATED";
      rationale = "Immutable generated contract snapshot retained as validation input.";
    } else if (isActive) {
      classification = "ACTIVE";
      rationale = "Current operational root or transitively reachable dependency.";
    }
    const evidence = (allEvidence.get(target) ?? []).sort((a, b) => evidenceKey(a).localeCompare(evidenceKey(b)));
    entries.push({
      path: target,
      kind: isTsconfig ? "TSCONFIG" : "SCRIPT",
      classification,
      sha256: sha256(content),
      bytes: content.length,
      rationale,
      evidence,
      archive: {
        eligible: false,
        reason: classification === "ACTIVE"
          ? "Active inputs are never archival candidates."
          : evidence.length
            ? "Retained because at least one source or tooling reference remains."
            : "No explicit retirement record proves that manual/operator invocation is discontinued.",
      },
    });
  }

  const counts = Object.fromEntries(["ACTIVE", "HISTORY", "GENERATED"].map((status) => [status, entries.filter((entry) => entry.classification === status).length]));
  return {
    schemaVersion: 1,
    policy: {
      scope: ["all tsconfig*.json outside excluded generated/dependency roots", "all recognized files below scripts/"],
      classes: ["ACTIVE", "HISTORY", "GENERATED"],
      precedence: ["GENERATED_CONTRACT", "ACTIVE_REACHABILITY", "HISTORY_UNREACHABLE"],
      reachabilityInputs: ["package scripts", "CI", "config", "source literals", "script imports", "tsconfig extends", "bounded dynamic templates"],
      archivalRule: "Archive only with zero active references and an explicit retirement record; absence of a discovered reference alone is insufficient.",
      excludedRoots: [...EXCLUDED_TOP_LEVEL].sort(),
    },
    summary: {
      tsconfigCount: tsconfigs.length,
      scriptCount: scripts.length,
      totalCount: entries.length,
      classificationCounts: counts,
      archiveEligibleCount: entries.filter((entry) => entry.archive.eligible).length,
    },
    entries,
  };
}

export const lifecycleClassificationOutputPath = OUTPUT_PATH;
