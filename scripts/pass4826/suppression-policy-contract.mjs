import { createHash } from "node:crypto";
import path from "node:path";
import ts from "typescript";

export const SUPPRESSION_ALLOWLIST_SCHEMA = "velmere.pass4826.suppression-allowlist.v1";
export const SUPPRESSION_EVIDENCE_SCHEMA = "velmere.pass4826.world-class-evidence.v1";

const ESLINT_DIRECTIVE = /^(eslint-disable(?:-next-line|-line)?)(?:\s+(.+))?$/u;
const FORBIDDEN_DIRECTIVES = Object.freeze([
  "@ts-ignore",
  "@ts-nocheck",
  "@ts-expect-error",
  "tslint:disable",
  "biome-ignore",
  "istanbul ignore",
  "c8 ignore",
]);

export const canonicalSuppressionJson = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonicalSuppressionJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalSuppressionJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

export const sha256Suppression = (value) => createHash("sha256").update(value).digest("hex");

function invariant(condition, code) {
  if (!condition) throw new Error(code);
}

export function normalizeSuppressionComment(raw) {
  return String(raw)
    .replace(/^\s*\/\//u, "")
    .replace(/^\s*\/\*/u, "")
    .replace(/\*\/\s*$/u, "")
    .replace(/^\s*\*\s?/gmu, "")
    .replace(/\s+/gu, " ")
    .trim();
}

function splitJustification(comment) {
  const marker = comment.indexOf(" -- ");
  if (marker === -1) return { directive: comment, justification: "" };
  return {
    directive: comment.slice(0, marker).trim(),
    justification: comment.slice(marker + 4).trim(),
  };
}

function scriptKind(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".tsx") return ts.ScriptKind.TSX;
  if (extension === ".jsx") return ts.ScriptKind.JSX;
  if (extension === ".ts") return ts.ScriptKind.TS;
  return ts.ScriptKind.JS;
}

function directiveId({ path: filePath, kind, rules, commentSha256 }) {
  return sha256Suppression(`${filePath}\0${kind}\0${rules.join(",")}\0${commentSha256}`);
}

export function scanSuppressionDirectives(filePath, sourceText) {
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(filePath),
  );
  const commentRanges = new Map();
  const addRanges = (ranges) => {
    for (const range of ranges ?? []) commentRanges.set(`${range.pos}:${range.end}`, range);
  };
  const visit = (node) => {
    addRanges(ts.getLeadingCommentRanges(sourceText, node.pos));
    addRanges(ts.getTrailingCommentRanges(sourceText, node.end));
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  const output = [];
  const orderedRanges = [...commentRanges.values()].sort((left, right) => left.pos - right.pos || left.end - right.end);
  for (const range of orderedRanges) {
      const raw = sourceText.slice(range.pos, range.end);
      const normalized = normalizeSuppressionComment(raw);
      const position = range.pos;
      const line = sourceText.slice(0, position).split(/\r?\n/u).length;
      const { directive, justification } = splitJustification(normalized);
      const eslint = directive.match(ESLINT_DIRECTIVE);
      if (eslint) {
        const rules = eslint[2]
          ? eslint[2].split(",").map((entry) => entry.trim()).filter(Boolean).sort()
          : ["*"];
        const commentSha256 = sha256Suppression(normalized);
        const record = {
          path: filePath,
          line,
          kind: eslint[1],
          rules,
          justification,
          commentSha256,
          forbidden: false,
        };
        output.push({ ...record, directiveId: directiveId(record) });
      }
      for (const forbidden of FORBIDDEN_DIRECTIVES) {
        if (!directive.includes(forbidden)) continue;
        const commentSha256 = sha256Suppression(normalized);
        const record = {
          path: filePath,
          line,
          kind: forbidden,
          rules: [],
          justification,
          commentSha256,
          forbidden: true,
        };
        output.push({ ...record, directiveId: directiveId(record) });
      }
  }
  output.sort((left, right) => left.line - right.line || left.directiveId.localeCompare(right.directiveId, "en"));
  return output;
}

export function validateSuppressionAllowlist(allowlist) {
  invariant(allowlist && typeof allowlist === "object" && !Array.isArray(allowlist), "suppression_allowlist_invalid");
  invariant(allowlist.schemaVersion === SUPPRESSION_ALLOWLIST_SCHEMA, "suppression_allowlist_schema_mismatch");
  invariant(Array.isArray(allowlist.entries), "suppression_allowlist_entries_invalid");
  const seen = new Set();
  for (const [index, entry] of allowlist.entries.entries()) {
    invariant(entry && typeof entry === "object" && !Array.isArray(entry), `suppression_allowlist_entry_invalid:${index}`);
    invariant(typeof entry.path === "string" && entry.path.length > 0 && !entry.path.startsWith("/") && !entry.path.includes(".."), `suppression_allowlist_path_invalid:${index}`);
    invariant(typeof entry.kind === "string" && entry.kind.startsWith("eslint-disable"), `suppression_allowlist_kind_invalid:${index}`);
    invariant(Array.isArray(entry.rules) && entry.rules.length > 0 && entry.rules.every((rule) => typeof rule === "string" && rule.length > 0), `suppression_allowlist_rules_invalid:${index}`);
    invariant(JSON.stringify(entry.rules) === JSON.stringify([...entry.rules].sort()), `suppression_allowlist_rules_not_sorted:${index}`);
    invariant(/^[a-f0-9]{64}$/u.test(entry.commentSha256 ?? ""), `suppression_allowlist_comment_digest_invalid:${index}`);
    invariant(typeof entry.ownerRole === "string" && entry.ownerRole.length >= 3, `suppression_allowlist_owner_invalid:${index}`);
    invariant(typeof entry.rationale === "string" && entry.rationale.length >= 20, `suppression_allowlist_rationale_invalid:${index}`);
    invariant(/^\d{4}-\d{2}-\d{2}$/u.test(entry.expiresOn ?? "") && Number.isFinite(Date.parse(`${entry.expiresOn}T23:59:59.999Z`)), `suppression_allowlist_expiry_invalid:${index}`);
    const key = directiveId(entry);
    invariant(!seen.has(key), `suppression_allowlist_duplicate:${index}`);
    seen.add(key);
  }
  return allowlist;
}

export function evaluateSuppressions({ directives, allowlist, evaluationTime }) {
  validateSuppressionAllowlist(allowlist);
  invariant(Array.isArray(directives), "suppression_directives_invalid");
  const evaluationMs = Date.parse(evaluationTime);
  invariant(Number.isFinite(evaluationMs), "suppression_evaluation_time_invalid");
  const expected = new Map(allowlist.entries.map((entry) => [directiveId(entry), entry]));
  const observed = new Map();
  const unallowlisted = [];
  const forbidden = [];
  const missingJustification = [];
  const expired = [];
  for (const directive of directives) {
    invariant(!observed.has(directive.directiveId), `suppression_duplicate_directive_identity:${directive.directiveId}`);
    observed.set(directive.directiveId, directive);
    const allowance = expected.get(directive.directiveId);
    if (!allowance) unallowlisted.push(directive);
    if (directive.forbidden) forbidden.push(directive);
    if (directive.justification.length < 20) missingJustification.push(directive);
    if (allowance && Date.parse(`${allowance.expiresOn}T23:59:59.999Z`) < evaluationMs) {
      expired.push({ directive, allowance });
    }
  }
  const staleAllowances = allowlist.entries.filter((entry) => !observed.has(directiveId(entry)));
  const unexpectedIds = new Set([
    ...unallowlisted.map((entry) => entry.directiveId),
    ...forbidden.map((entry) => entry.directiveId),
    ...staleAllowances.map((entry) => directiveId(entry)),
  ]);
  return {
    passed: unexpectedIds.size === 0 && expired.length === 0 && missingJustification.length === 0,
    directiveCount: directives.length,
    allowlistEntryCount: allowlist.entries.length,
    matchedDirectiveCount: directives.filter((entry) => expected.has(entry.directiveId)).length,
    unexpectedSuppressionCount: unexpectedIds.size,
    expiredSuppressionCount: expired.length,
    missingJustificationCount: missingJustification.length,
    unallowlisted: unallowlisted.map(({ path: filePath, line, kind, rules }) => ({ path: filePath, line, kind, rules })),
    forbidden: forbidden.map(({ path: filePath, line, kind }) => ({ path: filePath, line, kind })),
    staleAllowances: staleAllowances.map(({ path: filePath, kind, rules }) => ({ path: filePath, kind, rules })),
    expired: expired.map(({ directive, allowance }) => ({ path: directive.path, line: directive.line, kind: directive.kind, expiresOn: allowance.expiresOn })),
    missingJustification: missingJustification.map(({ path: filePath, line, kind }) => ({ path: filePath, line, kind })),
  };
}

export function sealSuppressionEvidence(core) {
  return { ...core, receiptSha256: sha256Suppression(canonicalSuppressionJson(core)) };
}
