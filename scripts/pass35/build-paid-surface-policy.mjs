#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
let ts = null;
try {
  ts = (await import("typescript")).default;
} catch {
  ts = null;
}

const root = process.cwd();
const GUARD_IMPORT = "@/lib/commerce/vlm-paid-surface-guard";
const DIRECT_IMPORTS = new Set([
  "@/lib/commerce/vlm-advanced-only-access-policy",
  "@/lib/commerce/vlm-entitlement-ledger",
  "@/lib/commerce/vlm-paid-access-server",
  "@/lib/commerce/paid-access-boundary",
]);
const NON_AUTHORIZING_DIRECT_NAMES = new Set([
  "buildVlmAdvancedOnlyPolicySummary",
  "VlmAccessDepth",
  "VlmAccessPurpose",
  "VlmAccessSurface",
]);
const DIRECT_ALLOW_PREFIXES = [
  "lib/commerce/",
  "lib/payments/stripe-webhook/",
  "lib/security/audit-intake-case-vault.ts",
  "lib/security/server-payment-account-delivery-gate.ts",
  "lib/market-integrity/provider-recovery-smoke.ts",
  "lib/server/lazy-route-modules/admin--security--advanced-audit-release.ts",
  "lib/server/security-route-modules/advanced-entitlement-proof.ts",
  "app/api/checkout/vlm-service/route.ts",
  "app/api/checkout/vlm-service/verify/route.ts",
];
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const lexical = (a, b) => a < b ? -1 : a > b ? 1 : 0;

function walk(directory, prefix = "") {
  const found = [];
  for (const item of readdirSync(directory, { withFileTypes: true }).sort((a, b) => lexical(a.name, b.name))) {
    const relative = prefix ? `${prefix}/${item.name}` : item.name;
    const absolute = path.join(directory, item.name);
    if (item.isDirectory()) found.push(...walk(absolute, relative));
    else if (item.isFile() && /\.(?:ts|tsx)$/u.test(item.name) && !item.name.endsWith(".d.ts")) found.push(relative);
  }
  return found;
}

const files = [...walk(path.join(root, "app"), "app"), ...walk(path.join(root, "lib"), "lib")].sort(lexical);
const sourceByPath = new Map(files.map((file) => [file, readFileSync(path.join(root, file), "utf8")]));
const guardConsumers = [];
const directResolverImports = [];

function parseNamedImports(clause) {
  const match = clause.match(/\{([\s\S]*?)\}/u);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const normalized = part.replace(/^type\s+/u, "").trim();
      const alias = normalized.split(/\s+as\s+/u).map((value) => value.trim()).filter(Boolean);
      return alias.at(-1) ?? normalized;
    });
}

function collectLexicalImports(text) {
  const imports = [];
  const pattern = /import\s+([\s\S]*?)\s+from\s+["']([^"']+)["']\s*;?/gu;
  for (const match of text.matchAll(pattern)) {
    imports.push({ module: match[2], names: parseNamedImports(match[1]).sort(lexical) });
  }
  return imports;
}

function findBalancedObject(text, openIndex) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(openIndex, index + 1);
    }
  }
  return null;
}

function collectLexicalCalls(text, guardedNames) {
  const calls = [];
  const policyIds = new Set();
  for (const name of guardedNames) {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
    const pattern = new RegExp(`\\b${escapedName}\\s*\\(`, "gu");
    for (const match of text.matchAll(pattern)) {
      calls.push(name);
      const afterCall = match.index + match[0].length;
      const objectStart = text.indexOf("{", afterCall);
      if (objectStart < 0 || objectStart - afterCall > 256) continue;
      const objectText = findBalancedObject(text, objectStart);
      if (!objectText) continue;
      const policyMatch = objectText.match(/\bpolicyId\s*:\s*["']([a-z0-9_]+)["']/u);
      if (policyMatch) policyIds.add(policyMatch[1]);
    }
  }
  return { calls, policyIds };
}

for (const file of files) {
  const text = sourceByPath.get(file);
  const guardedNames = new Set();
  const direct = [];
  const calls = [];
  const policyIds = new Set();

  if (ts) {
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    for (const statement of source.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const imported = statement.moduleSpecifier.text;
      const named = statement.importClause?.namedBindings && ts.isNamedImports(statement.importClause.namedBindings)
        ? statement.importClause.namedBindings.elements.map((entry) => entry.name.text)
        : [];
      if (imported === GUARD_IMPORT) named.forEach((name) => guardedNames.add(name));
      if (DIRECT_IMPORTS.has(imported)) direct.push({ module: imported, names: named.sort(lexical) });
    }
    function visit(node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && guardedNames.has(node.expression.text)) {
        calls.push(node.expression.text);
        const arg = node.arguments[0];
        if (arg && ts.isObjectLiteralExpression(arg)) {
          for (const property of arg.properties) {
            if (!ts.isPropertyAssignment(property)) continue;
            const name = ts.isIdentifier(property.name) || ts.isStringLiteral(property.name) ? property.name.text : "";
            if (name === "policyId" && ts.isStringLiteral(property.initializer)) policyIds.add(property.initializer.text);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  } else {
    const imports = collectLexicalImports(text);
    for (const entry of imports) {
      if (entry.module === GUARD_IMPORT) entry.names.forEach((name) => guardedNames.add(name));
      if (DIRECT_IMPORTS.has(entry.module)) direct.push(entry);
    }
    const lexicalCalls = collectLexicalCalls(text, guardedNames);
    lexicalCalls.calls.forEach((name) => calls.push(name));
    lexicalCalls.policyIds.forEach((id) => policyIds.add(id));
  }

  if (direct.length) {
    const onlyNonAuthorizingSymbols = direct.every((entry) => entry.names.every((name) => NON_AUTHORIZING_DIRECT_NAMES.has(name)));
    const allowed = onlyNonAuthorizingSymbols || DIRECT_ALLOW_PREFIXES.some((prefix) => file.startsWith(prefix));
    directResolverImports.push({ file, allowed, onlyNonAuthorizingSymbols, imports: direct });
  }
  if (!guardedNames.size) continue;
  const referrers = files.filter((candidate) => candidate !== file && sourceByPath.get(candidate).includes(file.replace(/\.(?:ts|tsx)$/u, "").replace(/^lib\//u, "@/lib/")));
  const bytes = Buffer.from(text);
  guardConsumers.push({
    file,
    bytes: bytes.length,
    sha256: sha256(bytes),
    parserMode: ts ? "TYPESCRIPT_AST" : "DEPENDENCY_FREE_LEXICAL_FALLBACK",
    importedGuardFunctions: [...guardedNames].sort(lexical),
    calledGuardFunctions: [...new Set(calls)].sort(lexical),
    policyIds: [...policyIds].sort(lexical),
    referrers,
  });
}

const violations = directResolverImports.filter((entry) => !entry.allowed);
const guardPath = "lib/commerce/vlm-paid-surface-guard.ts";
const guardBytes = readFileSync(path.join(root, guardPath));
const guardSource = guardBytes.toString("utf8");
const declaredPolicyIds = [...guardSource.matchAll(/^\s{2}([a-z0-9_]+):\s*\{/gmu)].map((match) => match[1]).sort(lexical);
const consumedPolicyIds = [...new Set(guardConsumers.flatMap((entry) => entry.policyIds))].sort(lexical);
const unconsumedPolicyIds = declaredPolicyIds.filter((id) => !consumedPolicyIds.includes(id));
const output = {
  schemaVersion: "velmere.pass35.paid-surface-entitlement-policy.v1",
  candidateId: "VELMERE_PASS35_OFFLINE_CANDIDATE_R3",
  generatedAt: new Date().toISOString(),
  evidenceClass: ts ? "STATIC_AST_IMPORT_AND_CALL_GRAPH" : "STATIC_LEXICAL_IMPORT_AND_CALL_GRAPH_FALLBACK",
  parserMode: ts ? "TYPESCRIPT_AST" : "DEPENDENCY_FREE_LEXICAL_FALLBACK",
  truthBoundary: "AST or dependency-free lexical import/call coverage proves source routing only. Lexical fallback is conservative static evidence, not a full parser. Neither mode is runtime entitlement, payment, staging, or live proof.",
  guardPath,
  guardBytes: guardBytes.length,
  guardSha256: sha256(guardBytes),
  declaredPolicyIds,
  consumedPolicyIds,
  unconsumedPolicyIds,
  guardedConsumerCount: guardConsumers.length,
  guardConsumers,
  directResolverImports,
  forbiddenDirectResolverImports: violations,
  status: violations.length === 0 ? "STATIC_PROVEN" : "BLOCKED_DIRECT_RESOLVER_IMPORT",
  rules: [
    "All paid customer surfaces must call the central guard.",
    "Direct entitlement resolvers are restricted to commerce internals, payment webhooks, checkout verification, and explicitly listed operator proof paths.",
    "Product-cell readiness is a separate mandatory gate before PaymentIntent creation.",
    "No static result may be promoted to staging or live proof."
  ]
};
const outputPath = path.join(root, "config/paid-surface-entitlement-policy.json");
mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ status: output.status, guardConsumers: guardConsumers.length, declaredPolicyIds, consumedPolicyIds, violations }, null, 2));
if (violations.length) process.exit(1);
