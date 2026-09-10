#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const writeBaseline = process.argv.includes("--write-baseline");
const sqlPlanes = [
  { name: "deployable_migrations", directory: path.join(root, "supabase", "migrations") },
  { name: "legacy_or_design_sql", directory: path.join(root, "db") }
];

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function rel(file) { return path.relative(root, file).replaceAll(path.sep, "/"); }
function sqlFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const output = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith(".sql")) output.push(full);
    }
  };
  walk(directory);
  return output.sort();
}
function names(regex, text) {
  return [...text.matchAll(regex)].map((match) => match[1].replaceAll('"', "").toLowerCase());
}
function analyzePlane(plane) {
  const files = sqlFiles(plane.directory);
  const tables = new Map();
  const droppedTables = new Set();
  const rlsEnabled = new Set();
  const rlsForced = new Set();
  const policyTables = new Set();
  const revokedPublicTables = new Set();
  const serviceRoleGrantedTables = new Set();
  const functions = new Map();
  const triggerFunctions = new Set();
  const broadGrants = [];
  const destructiveStatements = [];
  const duplicateMigrationPrefixes = [];
  const prefixes = new Map();
  let bytes = 0;
  let lines = 0;

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    const normalized = text.replace(/--.*$/gmu, " ");
    bytes += Buffer.byteLength(text);
    lines += text.split(/\r?\n/u).length;
    const prefix = path.basename(file).match(/^(\d{8,14})/u)?.[1] ?? null;
    if (prefix) {
      if (!prefixes.has(prefix)) prefixes.set(prefix, []);
      prefixes.get(prefix).push(rel(file));
    }
    for (const table of names(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:(?:[a-zA-Z_]\w*)\.)?(["a-zA-Z_][\w"]*)/giu, normalized)) {
      tables.set(table, rel(file));
      droppedTables.delete(table);
    }
    for (const table of names(/drop\s+table\s+(?:if\s+exists\s+)?(?:(?:[a-zA-Z_]\w*)\.)?(["a-zA-Z_][\w"]*)/giu, normalized)) droppedTables.add(table);
    for (const table of names(/alter\s+table\s+(?:if\s+exists\s+)?(?:(?:[a-zA-Z_]\w*)\.)?(["a-zA-Z_][\w"]*)\s+enable\s+row\s+level\s+security\s*;/giu, normalized)) rlsEnabled.add(table);
    for (const table of names(/alter\s+table\s+(?:if\s+exists\s+)?(?:(?:[a-zA-Z_]\w*)\.)?(["a-zA-Z_][\w"]*)\s+force\s+row\s+level\s+security\s*;/giu, normalized)) rlsForced.add(table);
    for (const table of names(/create\s+policy\s+[\s\S]{1,300}?\s+on\s+(?:(?:[a-zA-Z_]\w*)\.)?(["a-zA-Z_][\w"]*)/giu, normalized)) policyTables.add(table);
    for (const table of names(/revoke\s+all\s+on\s+(?:table\s+)?(?:(?:[a-zA-Z_]\w*)\.)?(["a-zA-Z_][\w"]*)\s+from\s+public\s*,\s*anon\s*,\s*authenticated\s*;/giu, normalized)) revokedPublicTables.add(table);
    for (const table of names(/grant\s+(?:all|select(?:\s*,\s*insert|\s*,\s*update|\s*,\s*delete)*|insert|update|delete)[\s\S]{0,180}?\s+on\s+(?:table\s+)?(?:(?:[a-zA-Z_]\w*)\.)?(["a-zA-Z_][\w"]*)\s+to\s+service_role\s*;/giu, normalized)) serviceRoleGrantedTables.add(table);
    for (const match of normalized.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:(?:public|auth)\.)?(["a-zA-Z_][\w"]*)\s*\(([^;]*?)\)[\s\S]{0,2500}?security\s+definer([\s\S]{0,500}?)as\s+\$/giu)) {
      const functionName = match[1].replaceAll('"', "").toLowerCase();
      const header = match[0];
      functions.set(functionName, {
        file: rel(file),
        securityDefiner: true,
        fixedSearchPath: /set\s+search_path\s*=/iu.test(header)
      });
    }
    for (const functionName of names(/execute\s+function\s+(?:(?:public|auth)\.)?(["a-zA-Z_][\w"]*)\s*\(/giu, normalized)) triggerFunctions.add(functionName);
    for (const match of normalized.matchAll(/grant\s+(?:all|select|insert|update|delete|execute)[\s\S]{0,300}?\s+to\s+(public|anon|authenticated)\s*;/giu)) {
      broadGrants.push({ file: rel(file), grant: match[0].replace(/\s+/gu, " ").trim().slice(0, 500) });
    }
    for (const match of normalized.matchAll(/\b(drop\s+(?:table|function|policy)|truncate\s+table)\b[^;]*;/giu)) {
      destructiveStatements.push({ file: rel(file), statement: match[0].replace(/\s+/gu, " ").trim().slice(0, 500) });
    }
  }
  for (const [prefix, prefixFiles] of prefixes) if (prefixFiles.length > 1) duplicateMigrationPrefixes.push({ prefix, files: prefixFiles });
  const activeTables = [...tables.keys()].filter((table) => !droppedTables.has(table)).sort();
  const tablesWithoutRls = activeTables.filter((table) => !rlsEnabled.has(table));
  const rlsWithoutPolicy = activeTables.filter((table) => rlsEnabled.has(table) && !policyTables.has(table));
  const serviceRoleOnlyTables = activeTables.filter((table) => revokedPublicTables.has(table) && serviceRoleGrantedTables.has(table));
  const rlsWithoutPolicyAndNotServiceRoleOnly = rlsWithoutPolicy.filter((table) => !serviceRoleOnlyTables.includes(table));
  const securityDefinerWithoutSearchPath = [...functions.entries()].filter(([, value]) => !value.fixedSearchPath).map(([name, value]) => ({ name, ...value }));

  const allText = files.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  const triggerFunctionsWithoutExplicitRevoke = [...triggerFunctions].filter((functionName) => {
    const functionInfo = functions.get(functionName);
    if (!functionInfo?.securityDefiner) return false;
    const revokePattern = new RegExp(`revoke\\s+all\\s+on\\s+function\\s+(?:public\\.)?${functionName}\\s*\\(`, "iu");
    return !revokePattern.test(allText);
  }).sort().map((name) => ({ name, file: functions.get(name)?.file ?? null }));

  return {
    name: plane.name,
    files: files.length,
    bytes,
    lines,
    aggregateSha256: sha256(files.map((file) => `${rel(file)}\0${sha256(fs.readFileSync(file))}`).join("\n")),
    tablesDeclared: activeTables.length,
    rlsEnabledTables: activeTables.filter((table) => rlsEnabled.has(table)).length,
    rlsForcedTables: activeTables.filter((table) => rlsForced.has(table)).length,
    tablesWithPolicies: activeTables.filter((table) => policyTables.has(table)).length,
    tablesWithoutRls,
    rlsWithoutPolicy,
    serviceRoleOnlyTables,
    rlsWithoutPolicyAndNotServiceRoleOnly,
    securityDefinerFunctions: functions.size,
    securityDefinerWithoutSearchPath,
    triggerFunctionsWithoutExplicitRevoke,
    broadGrantCount: broadGrants.length,
    broadGrants: broadGrants.slice(0, 200),
    destructiveStatementCount: destructiveStatements.length,
    destructiveStatements: destructiveStatements.slice(0, 200),
    duplicateMigrationPrefixes
  };
}

const planes = sqlPlanes.map(analyzePlane);
const deployable = planes.find((plane) => plane.name === "deployable_migrations");
const blockers = [];
if (deployable.tablesWithoutRls.length) blockers.push("deployable_tables_without_rls");
if (deployable.securityDefinerWithoutSearchPath.length) blockers.push("deployable_security_definer_without_fixed_search_path");
if (deployable.triggerFunctionsWithoutExplicitRevoke.length) blockers.push("deployable_trigger_security_definer_without_explicit_revoke");
if (deployable.duplicateMigrationPrefixes.length) blockers.push("duplicate_deployable_migration_prefixes");
const result = {
  schemaVersion: "velmere.pass14.database-contract-audit.v1",
  generatedAt: new Date().toISOString(),
  truthBoundary: "Static SQL corpus audit. RLS/policy presence is not proof that migrations apply cleanly or that multi-user isolation works in a real Postgres/Supabase instance.",
  ok: blockers.length === 0,
  blockers,
  planes,
  nextRequiredProof: [
    "Apply the deployable migration chain to an empty staging database.",
    "Apply it again through the supported upgrade path.",
    "Run multi-user RLS positive/negative tests with anon, authenticated, service_role and operator roles.",
    "Measure migration duration, locks, rollback and backup/restore."
  ]
};
const diagnosticsDirectory = path.join(root, ".velmere", "pass14-diagnostics");
fs.mkdirSync(diagnosticsDirectory, { recursive: true });
const diagnosticsPath = path.join(diagnosticsDirectory, "database-contract-audit.json");
fs.writeFileSync(diagnosticsPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
if (writeBaseline) fs.writeFileSync(path.join(root, "config", "pass14", "database-audit-baseline.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: result.ok, blockers, planes: planes.map((plane) => ({ name: plane.name, files: plane.files, tablesDeclared: plane.tablesDeclared, rlsEnabledTables: plane.rlsEnabledTables, tablesWithoutRls: plane.tablesWithoutRls.length, serviceRoleOnlyTables: plane.serviceRoleOnlyTables.length, rlsWithoutPolicyAndNotServiceRoleOnly: plane.rlsWithoutPolicyAndNotServiceRoleOnly.length, securityDefinerFunctions: plane.securityDefinerFunctions, missingSearchPath: plane.securityDefinerWithoutSearchPath.length, triggerAclGaps: plane.triggerFunctionsWithoutExplicitRevoke.length })), diagnosticsPath: rel(diagnosticsPath), baselineWritten: writeBaseline }, null, 2));
if (!result.ok) process.exit(1);
