const RAW_COMPARE = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

export const PRODUCTION_SMOKE_LOCAL_PRODUCT_PATHS = Object.freeze(
  ["pl", "en", "de"].flatMap((locale) => [
    `/${locale}/market-integrity`,
    `/${locale}/shield-pro`,
    `/${locale}/real-markets`,
  ]),
);

export const PRODUCTION_SMOKE_BASE_HEADER_PATHS = Object.freeze([
  "/en",
  "/pl/security",
]);

export const PRODUCTION_SMOKE_REFERRER_POLICY_PATHS = Object.freeze([
  "/en",
  "/pl/security",
  "/de/real-markets",
]);

export const PRODUCTION_SMOKE_CORE_ASSERTION_NAMES = Object.freeze([
  "auth_session_200",
  "en_locale_root_200",
  "robots_localized_200",
  "worker_without_envelope_401",
  "stripe_without_signature_400",
]);

export function productionSmokeExpectedAssertionNames() {
  const names = [
    "server_process_ready",
    ...PRODUCTION_SMOKE_CORE_ASSERTION_NAMES,
    "pl_security_200",
    "de_real_markets_200",
  ];
  for (const pathname of PRODUCTION_SMOKE_BASE_HEADER_PATHS) {
    names.push(
      `${pathname}_x_frame_options`,
      `${pathname}_nosniff`,
      `${pathname}_csp`,
    );
  }
  for (const pathname of PRODUCTION_SMOKE_REFERRER_POLICY_PATHS) {
    names.push(`${pathname}_referrer_policy`);
  }
  for (const pathname of PRODUCTION_SMOKE_LOCAL_PRODUCT_PATHS) {
    names.push(
      `${pathname}_local_product_200`,
      `${pathname}_x_frame_options`,
      `${pathname}_nosniff`,
      `${pathname}_csp`,
    );
  }
  names.push("server_log_no_fatal_patterns", "source_immutable");
  return names;
}

export function productionSmokeExpectedResultIdentities() {
  return [
    "GET /icon.svg",
    "GET /api/auth/session",
    "GET /en",
    "GET /pl/security",
    "GET /robots.txt",
    "POST /api/internal/workers/auth-security-alerts",
    "POST /api/stripe/webhook",
    ...PRODUCTION_SMOKE_LOCAL_PRODUCT_PATHS.map((pathname) => `GET ${pathname}`),
  ];
}

function duplicateValues(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .sort(([left], [right]) => RAW_COMPARE(left, right))
    .map(([value, count]) => ({ value, count }));
}

function difference(expected, actual) {
  const actualSet = new Set(actual);
  return expected.filter((value) => !actualSet.has(value));
}

function inspectOrderedIdentitySet({ actual, expected, label }) {
  const invalid = actual
    .map((value, index) => ({ value, index }))
    .filter(({ value }) => typeof value !== "string" || value.length === 0);
  const stringValues = actual.filter((value) => typeof value === "string" && value.length > 0);
  const duplicates = duplicateValues(stringValues);
  const missing = difference(expected, stringValues);
  const extra = difference(stringValues, expected);
  const orderedMatch = JSON.stringify(stringValues) === JSON.stringify(expected);
  return {
    label,
    expectedCount: expected.length,
    actualCount: actual.length,
    uniqueCount: new Set(stringValues).size,
    invalid,
    duplicates,
    missing,
    extra,
    orderedMatch,
    ok:
      invalid.length === 0
      && duplicates.length === 0
      && missing.length === 0
      && extra.length === 0
      && actual.length === expected.length
      && orderedMatch,
  };
}

export function productionSmokeResultIdentity(row) {
  return `${String(row?.method ?? "")} ${String(row?.path ?? "")}`;
}

export function inspectProductionSmokeEvidence({ assertions, results }) {
  const expectedAssertionNames = productionSmokeExpectedAssertionNames();
  const expectedResultIdentities = productionSmokeExpectedResultIdentities();
  const assertionSet = inspectOrderedIdentitySet({
    actual: Array.isArray(assertions) ? assertions.map((row) => row?.name) : [],
    expected: expectedAssertionNames,
    label: "assertions",
  });
  const resultSet = inspectOrderedIdentitySet({
    actual: Array.isArray(results) ? results.map(productionSmokeResultIdentity) : [],
    expected: expectedResultIdentities,
    label: "results",
  });
  return {
    schemaVersion: "velmere.production-smoke-evidence-contract.v1",
    ok: assertionSet.ok && resultSet.ok,
    assertionSet,
    resultSet,
    expectedAssertionNames,
    expectedResultIdentities,
    truthBoundary:
      "A passing production smoke receipt requires one exact ordered assertion identity set and one exact ordered HTTP result identity set. Duplicate rows, missing rows, extra rows, identity drift or denominator inflation fail closed.",
  };
}
