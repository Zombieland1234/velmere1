#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SCHEMA = "velmere.r11.workflow-semantic-policy.v2";

const PERMISSION_SCOPES = new Set([
  "actions", "checks", "contents", "deployments", "id-token", "issues", "packages", "pages",
  "pull-requests", "repository-projects", "security-events", "statuses",
]);

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
  const match = line.match(/^(\s*)/u);
  if (!match) return 0;
  if (match[1].includes("\t")) return -1;
  return match[1].length;
}

function validLocalReference(value) {
  if (!value.startsWith("./")) return false;
  const relative = path.posix.normalize(value.slice(2));
  return relative.length > 0 && relative !== "." && !relative.startsWith("../") && !path.posix.isAbsolute(relative);
}

function decodeKeyToken(raw) {
  const token = raw.trim();
  if (token.startsWith('"')) {
    try {
      const value = JSON.parse(token);
      return typeof value === "string" ? value : null;
    } catch {
      return null;
    }
  }
  if (token.startsWith("'")) {
    if (!token.endsWith("'")) return null;
    return token.slice(1, -1).replace(/''/gu, "'");
  }
  return token;
}

function parseBlockMapping(clean) {
  const match = clean.match(/^\s*(?:-\s*)?((?:"(?:[^"\\]|\\.)*")|(?:'(?:[^']|'')*')|(?:[A-Za-z0-9_-]+))\s*:\s*(.*)$/u);
  if (!match) return null;
  const key = decodeKeyToken(match[1]);
  return key === null ? { invalidKey: true, rawKey: match[1], value: match[2] } : { key, value: match[2] };
}

function withoutExpressions(clean) {
  return clean.replace(/\$\{\{.*?\}\}/gu, "EXPR");
}

function countPotentialUsesKeys(clean) {
  const source = withoutExpressions(clean);
  const matches = source.match(/(?:^|[\s{,])(?:uses|"uses"|'uses')\s*:/gu);
  return matches ? matches.length : 0;
}

function blockScalarHeader(value) {
  return /^[|>](?:[1-9])?[+-]?$/u.test(value.trim()) || /^[|>][+-](?:[1-9])?$/u.test(value.trim());
}

export function inspectWorkflowText(text, workflowPath, root = process.cwd()) {
  const blockers = [];
  const uses = [];
  const reusableWorkflows = [];
  const permissionWrites = [];
  const lines = text.split(/\r?\n/u);
  let potentialUsesKeyCount = 0;
  let blockScalarParentIndent = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const lineNo = index + 1;
    const indent = indentOf(line);
    if (indent < 0) {
      blockers.push(`${workflowPath}:${lineNo}:tab_indentation_forbidden`);
      continue;
    }

    const clean = stripComment(line);
    if (!clean.trim()) continue;

    if (blockScalarParentIndent !== null) {
      if (indent > blockScalarParentIndent) continue;
      blockScalarParentIndent = null;
    }

    if (/^\s*(?:---|\.\.\.)\s*$/u.test(clean)) {
      blockers.push(`${workflowPath}:${lineNo}:yaml_document_marker_forbidden`);
      continue;
    }
    if (/^\s*(?:-\s*)?<<\s*:/u.test(clean)) blockers.push(`${workflowPath}:${lineNo}:yaml_merge_key_forbidden`);
    if (/(?:^|[\s:[,{])&[A-Za-z0-9_-]+/u.test(clean) || /(?:^|[\s:[,{])\*[A-Za-z0-9_-]+/u.test(clean)) {
      blockers.push(`${workflowPath}:${lineNo}:yaml_anchor_or_alias_forbidden`);
    }

    potentialUsesKeyCount += countPotentialUsesKeys(clean);

    if (/^\s*\?/u.test(clean)) blockers.push(`${workflowPath}:${lineNo}:explicit_mapping_key_forbidden`);
    if (/^\s*(?:-\s*)?![^\s]/u.test(clean) || /:\s*![^\s]/u.test(clean)) {
      blockers.push(`${workflowPath}:${lineNo}:yaml_tag_forbidden`);
    }

    const structural = withoutExpressions(clean);
    if (/\{[^}]*?(?:uses|"uses"|'uses')\s*:/u.test(structural)) {
      blockers.push(`${workflowPath}:${lineNo}:flow_mapping_uses_forbidden`);
    }
    if (/(?:permissions|"permissions"|'permissions')\s*:\s*\{/u.test(structural)) {
      blockers.push(`${workflowPath}:${lineNo}:flow_mapping_permissions_forbidden`);
      if (/\b(?:actions|checks|contents|deployments|id-token|issues|packages|pages|pull-requests|repository-projects|security-events|statuses)\s*:\s*write\b/u.test(structural)) {
        blockers.push(`${workflowPath}:${lineNo}:flow_mapping_write_permission_forbidden`);
      }
    }

    const mapping = parseBlockMapping(clean);
    if (mapping?.invalidKey) {
      blockers.push(`${workflowPath}:${lineNo}:unsupported_mapping_key`);
      continue;
    }
    if (!mapping) continue;

    const key = mapping.key;
    const rawMappingValue = mapping.value.trim();
    const startsBlockScalar = blockScalarHeader(rawMappingValue);

    if (key === "uses") {
      if (!rawMappingValue || startsBlockScalar) {
        blockers.push(`${workflowPath}:${lineNo}:uses_must_be_plain_scalar`);
        if (startsBlockScalar) blockScalarParentIndent = indent;
        continue;
      }
      const value = unquote(rawMappingValue);
      if (/\$\{\{/u.test(value)) blockers.push(`${workflowPath}:${lineNo}:dynamic_uses_forbidden`);
      if (/\s/u.test(value)) blockers.push(`${workflowPath}:${lineNo}:uses_contains_whitespace`);
      const row = { line: lineNo, value };
      uses.push(row);

      if (value.startsWith("./")) {
        if (!validLocalReference(value)) blockers.push(`${workflowPath}:${lineNo}:local_uses_path_invalid`);
        const target = path.join(root, value.slice(2));
        if (value.startsWith("./.github/workflows/")) {
          reusableWorkflows.push({ ...row, kind: "LOCAL_REUSABLE" });
          if (!fs.existsSync(target) || !fs.statSync(target).isFile()) blockers.push(`${workflowPath}:${lineNo}:local_reusable_missing:${value}`);
        } else if (!fs.existsSync(target)) {
          blockers.push(`${workflowPath}:${lineNo}:local_action_missing:${value}`);
        }
      } else {
        const match = value.match(/^([^@]+)@([a-f0-9]{40})$/u);
        if (!match) blockers.push(`${workflowPath}:${lineNo}:external_uses_not_full_sha_pinned:${value}`);
        if (value.includes("/.github/workflows/")) reusableWorkflows.push({ ...row, kind: "REMOTE_REUSABLE" });
      }
      continue;
    }

    if (key === "permissions") {
      if (startsBlockScalar) {
        blockers.push(`${workflowPath}:${lineNo}:permissions_block_scalar_forbidden`);
        blockScalarParentIndent = indent;
        continue;
      }
      const scalar = unquote(mapping.value);
      if (scalar === "write-all") blockers.push(`${workflowPath}:${lineNo}:permissions_write_all_forbidden`);
      if (/\$\{\{/u.test(scalar)) blockers.push(`${workflowPath}:${lineNo}:dynamic_permissions_forbidden`);
      continue;
    }

    if (PERMISSION_SCOPES.has(key)) {
      const permission = unquote(mapping.value.trim());
      if (permission === "write") permissionWrites.push({ line: lineNo, scope: key });
    }

    if (startsBlockScalar) blockScalarParentIndent = indent;
  }

  if (uses.length !== potentialUsesKeyCount) blockers.push(`${workflowPath}:uses_coverage_mismatch:${uses.length}/${potentialUsesKeyCount}`);
  return {
    workflowPath,
    semanticUsesCount: uses.length,
    textualUsesKeyCount: potentialUsesKeyCount,
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
    parserMode: "FAIL_CLOSED_GITHUB_ACTIONS_SEMANTIC_SUBSET_V2_1",
    workflowCount: files.length,
    workflowFiles: files,
    usesCount: workflows.reduce((n, row) => n + row.semanticUsesCount, 0),
    reusableWorkflowReferenceCount: workflows.reduce((n, row) => n + row.reusableWorkflows.length, 0),
    permissionWriteCount: workflows.reduce((n, row) => n + row.permissionWrites.length, 0),
    workflows,
    blockers: [...new Set(blockers)].sort(),
    passed: blockers.length === 0,
    truthBoundary: "Strict GitHub Actions semantic subset v2.1: block and quoted uses keys are covered; security-sensitive flow mappings are rejected; block-scalar bodies are not reinterpreted as YAML structure; every remote action/reusable-workflow ref requires a full commit SHA; local targets must exist; write permissions are inventoried; dynamic uses/permissions, YAML anchors/merge keys, explicit keys, document markers and YAML tags fail closed. This is not a general-purpose YAML parser and does not yet prove duplicate-key handling, effective inherited permissions, or recursively verify dependencies inside local composite actions.",
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

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();
