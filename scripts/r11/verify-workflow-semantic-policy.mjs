#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

export const SCHEMA = "velmere.r11.workflow-semantic-policy.v1";

function unquote(value) {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
  return v;
}

function stripComment(value) {
  let single = false;
  let double = false;
  for (let i = 0; i < value.length; i += 1) {
    const c = value[i];
    if (c === "'" && !double) single = !single;
    else if (c === '"' && !single && value[i - 1] !== "\\") double = !double;
    else if (c === "#" && !single && !double && (i === 0 || /\s/u.test(value[i - 1]))) return value.slice(0, i).trimEnd();
  }
  return value.trimEnd();
}

function indentOf(line) {
  const m = line.match(/^(\s*)/u);
  if (!m) return 0;
  if (m[1].includes("\t")) return -1;
  return m[1].length;
}

export function inspectWorkflowText(text, workflowPath, root = process.cwd()) {
  const blockers = [];
  const uses = [];
  const reusableWorkflows = [];
  const permissionWrites = [];
  const lines = text.split(/\r?\n/u);

  if (/^\s*<<\s*:/mu.test(text)) blockers.push(`${workflowPath}:yaml_merge_key_forbidden`);
  if (/(?:^|[\s:[,{])&[A-Za-z0-9_-]+/mu.test(text) || /(?:^|[\s:[,{])\*[A-Za-z0-9_-]+/mu.test(text)) {
    blockers.push(`${workflowPath}:yaml_anchor_or_alias_forbidden`);
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const indent = indentOf(line);
    if (indent < 0) {
      blockers.push(`${workflowPath}:${index + 1}:tab_indentation_forbidden`);
      continue;
    }
    const clean = stripComment(line);

    const usesMatch = clean.match(/^\s*(?:-\s*)?uses\s*:\s*(.*)$/u);
    if (usesMatch) {
      const raw = usesMatch[1].trim();
      if (!raw || raw === "|" || raw === ">") {
        blockers.push(`${workflowPath}:${index + 1}:uses_must_be_plain_scalar`);
        continue;
      }
      const value = unquote(raw);
      if (/\$\{\{/u.test(value)) blockers.push(`${workflowPath}:${index + 1}:dynamic_uses_forbidden`);
      if (/\s/u.test(value)) blockers.push(`${workflowPath}:${index + 1}:uses_contains_whitespace`);
      const row = { line: index + 1, value };
      uses.push(row);

      if (value.startsWith("./")) {
        const normalized = path.posix.normalize(value);
        if (!normalized.startsWith("./") || normalized.includes("..")) blockers.push(`${workflowPath}:${index + 1}:local_uses_path_invalid`);
        if (value.startsWith("./.github/workflows/")) {
          reusableWorkflows.push({ ...row, kind: "LOCAL_REUSABLE" });
          const target = path.join(root, value.slice(2));
          if (!fs.existsSync(target) || !fs.statSync(target).isFile()) blockers.push(`${workflowPath}:${index + 1}:local_reusable_missing:${value}`);
        } else {
          const target = path.join(root, value.slice(2));
          if (!fs.existsSync(target)) blockers.push(`${workflowPath}:${index + 1}:local_action_missing:${value}`);
        }
      } else {
        const match = value.match(/^([^@]+)@([a-f0-9]{40})$/u);
        if (!match) blockers.push(`${workflowPath}:${index + 1}:external_uses_not_full_sha_pinned:${value}`);
        if (value.includes("/.github/workflows/")) reusableWorkflows.push({ ...row, kind: "REMOTE_REUSABLE" });
      }
    }

    const writeAll = clean.match(/^\s*permissions\s*:\s*(.+)$/u);
    if (writeAll) {
      const scalar = unquote(writeAll[1]);
      if (scalar === "write-all") blockers.push(`${workflowPath}:${index + 1}:permissions_write_all_forbidden`);
      if (/\$\{\{/u.test(scalar)) blockers.push(`${workflowPath}:${index + 1}:dynamic_permissions_forbidden`);
    }

    const permissionMatch = clean.match(/^\s*(actions|checks|contents|deployments|id-token|issues|packages|pages|pull-requests|repository-projects|security-events|statuses)\s*:\s*(read|write|none)\s*$/u);
    if (permissionMatch && permissionMatch[2] === "write") permissionWrites.push({ line: index + 1, scope: permissionMatch[1] });
  }

  const semanticUsesCount = uses.length;
  const textualUsesKeyCount = lines.filter((line) => /^\s*(?:-\s*)?uses\s*:/u.test(stripComment(line))).length;
  if (semanticUsesCount !== textualUsesKeyCount) blockers.push(`${workflowPath}:uses_coverage_mismatch:${semanticUsesCount}/${textualUsesKeyCount}`);

  return {
    workflowPath,
    semanticUsesCount,
    textualUsesKeyCount,
    uses,
    reusableWorkflows,
    permissionWrites,
    blockers: [...new Set(blockers)].sort(),
  };
}

export function verifyWorkflowSemantics(root = process.cwd()) {
  const workflowDir = path.join(root, ".github", "workflows");
  const files = fs.readdirSync(workflowDir).filter((name) => /\.ya?ml$/iu.test(name)).sort();
  if (!files.length) throw new Error("workflow_semantic_scope_empty");
  const workflows = files.map((name) => inspectWorkflowText(fs.readFileSync(path.join(workflowDir, name), "utf8"), `.github/workflows/${name}`, root));
  const blockers = workflows.flatMap((row) => row.blockers);
  return {
    schemaVersion: SCHEMA,
    sourceSha: process.env.GITHUB_SHA || null,
    parserMode: "FAIL_CLOSED_GITHUB_ACTIONS_SEMANTIC_SUBSET",
    workflowCount: files.length,
    workflowFiles: files,
    usesCount: workflows.reduce((n, row) => n + row.semanticUsesCount, 0),
    reusableWorkflowReferenceCount: workflows.reduce((n, row) => n + row.reusableWorkflows.length, 0),
    permissionWriteCount: workflows.reduce((n, row) => n + row.permissionWrites.length, 0),
    workflows,
    blockers: [...new Set(blockers)].sort(),
    passed: blockers.length === 0,
    truthBoundary: "Semantic verifier covers action/reusable-workflow references, dynamic/full-SHA use semantics, local target existence, effective write-permission inventory, and rejects YAML anchors/merge keys that could evade its model. It is a strict GitHub Actions subset parser, not a general YAML implementation.",
  };
}

function main() {
  const result = verifyWorkflowSemantics();
  const outputIndex = process.argv.indexOf("--output");
  if (outputIndex >= 0 && process.argv[outputIndex + 1]) {
    const output = path.resolve(process.argv[outputIndex + 1]);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  }
  console.log(JSON.stringify({ schemaVersion: result.schemaVersion, workflowCount: result.workflowCount, usesCount: result.usesCount, reusableWorkflowReferenceCount: result.reusableWorkflowReferenceCount, permissionWriteCount: result.permissionWriteCount, blockers: result.blockers, passed: result.passed }, null, 2));
  if (!result.passed) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) main();
