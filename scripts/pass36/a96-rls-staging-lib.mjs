import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parseStrictJsonCli } from "./strict-json-cli.mjs";

export const A96_REV = "VELMERE_PASS36_A96R0_RLS_19_CASE_EXECUTABLE_REPLAY_AND_CUSTOMER_ARTIFACT_USER_CLIENT_BOUNDARY";
export const A96_PARENT = "VELMERE_PASS36_A95R0_STAGING_SUBJECT_REBIND_ENVIRONMENT_ISOLATION_AND_ZERO_MUTATION_PREFLIGHT";
export const A96_RECEIPT_PREFIX = "A96_RLS_RECEIPT=";

export const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
export const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));

export function regularFileIdentity(file) {
  const absolute = path.resolve(file);
  const lstat = fs.lstatSync(absolute);
  if (!lstat.isFile() || lstat.isSymbolicLink()) throw new Error("a96_regular_file_required");
  const real = fs.realpathSync(absolute);
  if (real !== absolute) throw new Error("a96_realpath_mismatch");
  const bytes = fs.readFileSync(absolute);
  return { absolute, byteLength: bytes.byteLength, sha256: sha256(bytes), mode: lstat.mode & 0o777 };
}

function forbiddenToken(value, tokens) {
  const normalized = String(value ?? "").normalize("NFKC").toLowerCase();
  return tokens.find((token) => normalized.includes(token)) ?? null;
}

export function classifyDatabaseUrl(raw, policy, { fixtureMode = false } = {}) {
  let url;
  try { url = new URL(raw); }
  catch { return { ok: false, reason: "invalid_database_url" }; }
  if (!policy.databaseSafety.protocols.includes(url.protocol)) return { ok: false, reason: "database_protocol_not_allowed" };
  const host = url.hostname.toLowerCase();
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
  if (local && !(fixtureMode && policy.databaseSafety.localhostAllowedOnlyInFixture)) return { ok: false, reason: "localhost_not_disposable_staging" };
  const hostToken = forbiddenToken(host, policy.databaseSafety.rejectHostnameTokens);
  if (hostToken) return { ok: false, reason: "production_like_database_host", token: hostToken };
  const database = decodeURIComponent(url.pathname.replace(/^\//u, "")).trim();
  if (!database) return { ok: false, reason: "database_name_missing" };
  const dbToken = forbiddenToken(database, policy.databaseSafety.rejectDatabaseTokens);
  if (dbToken) return { ok: false, reason: "production_like_database_name", token: dbToken };
  const unknownQuery = [...url.searchParams.keys()].filter((key) => !["sslmode", "connect_timeout", "application_name"].includes(key));
  if (unknownQuery.length) return { ok: false, reason: "unknown_database_query_parameter", keys: unknownQuery };
  const sslMode = url.searchParams.get("sslmode") || (local ? "disable" : "verify-full");
  if (!local && !policy.databaseSafety.requiredSslModes.includes(sslMode)) return { ok: false, reason: "database_tls_mode_insufficient", sslMode };
  const port = url.port ? Number(url.port) : 5432;
  if (!Number.isSafeInteger(port) || port < 1 || port > 65535) return { ok: false, reason: "database_port_invalid" };
  return {
    ok: true,
    connection: {
      host,
      port: String(port),
      database,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      sslMode,
    },
    publicIdentity: {
      hostSha256: sha256(host),
      databaseSha256: sha256(database),
      userSha256: url.username ? sha256(decodeURIComponent(url.username)) : null,
      port,
      sslMode,
      local,
    },
  };
}

export function buildMinimalPsqlEnvironment(connection, base = process.env) {
  const env = {
    PGHOST: connection.host,
    PGPORT: connection.port,
    PGDATABASE: connection.database,
    PGUSER: connection.user,
    PGPASSWORD: connection.password,
    PGSSLMODE: connection.sslMode,
    PGCONNECT_TIMEOUT: "15",
    PGAPPNAME: "velmere-pass36-a96-rls-replay",
    LC_ALL: "C.UTF-8",
    LANG: "C.UTF-8",
  };
  for (const key of ["SystemRoot", "WINDIR", "COMSPEC", "PATHEXT", "TEMP", "TMP"]) {
    if (base[key]) env[key] = base[key];
  }
  return env;
}

export function parseA96Receipt(stdout, policy) {
  if (Buffer.byteLength(stdout, "utf8") > policy.budgets.maximumStdoutBytes) throw new Error("a96_stdout_too_large");
  const lines = String(stdout).split(/\r?\n/u).filter((line) => line.startsWith(A96_RECEIPT_PREFIX));
  if (lines.length !== 1) throw new Error(lines.length ? "a96_duplicate_receipt_marker" : "a96_receipt_marker_missing");
  const raw = lines[0].slice(A96_RECEIPT_PREFIX.length);
  const receipt = parseStrictJsonCli(raw, { maxBytes: policy.budgets.maximumReceiptBytes, maxDepth: 48, maxNodes: 100000, requireObject: true });
  const requiredIds = readJson(policy.matrixPath).cases.map((row) => row.caseId).sort();
  const resultIds = Array.isArray(receipt.results) ? receipt.results.map((row) => row?.case_id).sort() : [];
  const checks = [
    receipt.schemaVersion === "velmere.pass36.a96.rls-19-case-replay-receipt.v1",
    receipt.decision === policy.decisions.verified,
    receipt.casesPrepared === policy.requiredCases,
    receipt.casesExecuted === policy.requiredExecuted,
    receipt.casesPassed === policy.requiredPassed,
    receipt.transactionRolledBack === true,
    receipt.fixtureContainsRealCustomerData === false,
    receipt.liveProven === false,
    receipt.saleEnabled === false,
    JSON.stringify(resultIds) === JSON.stringify(requiredIds),
    Array.isArray(receipt.results) && receipt.results.every((row) => row?.passed === true && Number.isSafeInteger(row?.checks) && row.checks >= 4),
  ];
  if (!checks.every(Boolean)) throw new Error("a96_receipt_semantic_mismatch");
  return receipt;
}

export function verifyA95AdmissionReceipt(file, expectedSha256, policy) {
  const identity = regularFileIdentity(file);
  if (!/^[a-f0-9]{64}$/u.test(expectedSha256) || identity.sha256 !== expectedSha256) throw new Error("a96_a95_receipt_sha256_mismatch");
  const value = parseStrictJsonCli(fs.readFileSync(identity.absolute, "utf8"), { maxBytes: 2 * 1024 * 1024, requireObject: true });
  if (value.decision !== policy.requiredA95Decision || value.preflightPassed !== true || value.executedStages !== 0 || value.mutationStarted !== false || value.sourceUnchanged !== true) {
    throw new Error("a96_a95_admission_not_ready");
  }
  return { identity, decision: value.decision, sourceManifestSha256: value.sourceManifestSha256 ?? null };
}
