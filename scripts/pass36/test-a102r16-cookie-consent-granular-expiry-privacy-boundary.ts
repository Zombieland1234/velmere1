import fs from "node:fs";
import path from "node:path";
import {
  CONSENT_POLICY_VERSION,
  CONSENT_STORAGE_KEY,
  CONSENT_TTL_MS,
  LEGACY_CONSENT_STORAGE_KEYS,
  clearBrowserConsent,
  consentAllows,
  createConsentChoice,
  createGranularConsentChoice,
  parseConsent,
  readBrowserConsent,
  serializeConsentChoice,
  writeBrowserConsent,
  type BrowserConsentStorage,
} from "../../lib/privacy/consent";

const root = process.cwd();
let passed = 0;
const failures: string[] = [];
function check(name: string, condition: unknown) {
  if (condition) passed += 1;
  else failures.push(name);
}
function source(relative: string) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

class MemoryStorage implements BrowserConsentStorage {
  readonly values = new Map<string, string>();
  readonly removed: string[] = [];
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.removed.push(key); this.values.delete(key); }
}

const now = new Date("2026-07-30T12:00:00.000Z");
const choice = createGranularConsentChoice({ analytics: true, marketing: false, now });
check("schema", choice.schemaVersion === "velmere.browser-consent-choice.v2");
check("policy", choice.policyVersion === CONSENT_POLICY_VERSION);
check("decided-at", choice.decidedAt === now.toISOString());
check("expiry-exact", Date.parse(choice.expiresAt) - Date.parse(choice.decidedAt) === CONSENT_TTL_MS);
check("necessary", choice.necessary === true);
check("granular-analytics", choice.analytics === true);
check("granular-marketing", choice.marketing === false);
check("source-choice", choice.source === "user_choice");
check("not-legal-proof", choice.legalProof === false);
check("not-server-recorded", choice.serverRecorded === false);

const serialized = serializeConsentChoice(choice);
const parsed = parseConsent(serialized, now);
check("roundtrip", JSON.stringify(parsed) === serialized);
check("allows-analytics", consentAllows(parsed, "analytics") === true);
check("blocks-marketing", consentAllows(parsed, "marketing") === false);
check("null-blocks", consentAllows(null, "analytics") === false);

const accepted = createConsentChoice("accepted", now);
const declined = createConsentChoice("declined", now);
check("accept-all", accepted.analytics === true && accepted.marketing === true);
check("decline-all", declined.analytics === false && declined.marketing === false);

const mutations: Array<[string, unknown]> = [
  ["wrong-schema", { ...choice, schemaVersion: "v1" }],
  ["wrong-policy", { ...choice, policyVersion: "old" }],
  ["necessary-false", { ...choice, necessary: false }],
  ["analytics-string", { ...choice, analytics: "true" }],
  ["marketing-number", { ...choice, marketing: 1 }],
  ["source-wrong", { ...choice, source: "server" }],
  ["legal-proof-true", { ...choice, legalProof: true }],
  ["server-recorded-true", { ...choice, serverRecorded: true }],
  ["unknown-key", { ...choice, unknown: true }],
  ["noncanonical-date", { ...choice, decidedAt: "2026-07-30 12:00:00Z" }],
  ["future-decision", { ...choice, decidedAt: "2026-07-30T12:06:00.000Z", expiresAt: new Date(Date.parse("2026-07-30T12:06:00.000Z") + CONSENT_TTL_MS).toISOString() }],
  ["expiry-before", { ...choice, expiresAt: "2026-07-30T11:59:59.000Z" }],
  ["ttl-drift", { ...choice, expiresAt: new Date(Date.parse(choice.expiresAt) + 1).toISOString() }],
];
for (const [name, mutation] of mutations) check(`reject-${name}`, parseConsent(JSON.stringify(mutation), now) === null);
check("reject-expired", parseConsent(serialized, new Date(Date.parse(choice.expiresAt))) === null);
check("reject-duplicate", parseConsent(serialized.replace('"analytics":true', '"analytics":true,"analytics":false'), now) === null);
check("reject-prototype", parseConsent(serialized.replace('{', '{"__proto__":{},'), now) === null);
check("reject-oversized", parseConsent(`{"x":"${"a".repeat(3000)}"}`, now) === null);
check("reject-array", parseConsent("[]", now) === null);
check("reject-null", parseConsent(null, now) === null);

const storage = new MemoryStorage();
for (const key of LEGACY_CONSENT_STORAGE_KEYS) storage.values.set(key, '{"legacy":true}');
const saved = writeBrowserConsent(storage, { analytics: false, marketing: true }, now);
check("write-success", saved?.analytics === false && saved?.marketing === true);
check("stored-v2", storage.values.has(CONSENT_STORAGE_KEY));
check("legacy-removed", LEGACY_CONSENT_STORAGE_KEYS.every((key) => !storage.values.has(key)));
check("read-success", readBrowserConsent(storage, now)?.marketing === true);
check("read-not-legal", readBrowserConsent(storage, now)?.legalProof === false);

storage.values.set(CONSENT_STORAGE_KEY, "not-json");
check("invalid-read-null", readBrowserConsent(storage, now) === null);
check("invalid-read-purged", !storage.values.has(CONSENT_STORAGE_KEY));
check("clear", clearBrowserConsent(storage) === true && !storage.values.has(CONSENT_STORAGE_KEY));
check("missing-storage-read", readBrowserConsent(null, now) === null);
check("missing-storage-write", writeBrowserConsent(null, { analytics: true, marketing: true }, now) === null);
check("missing-storage-clear", clearBrowserConsent(null) === false);

const component = source("components/CookieConsent.tsx");
const consentSource = source("lib/privacy/consent.ts");
const opsTelemetry = source("lib/launch/ops-telemetry.ts");
check("component-reads-boundary", component.includes("readBrowserConsent(window.localStorage)"));
check("component-writes-boundary", component.includes("writeBrowserConsent(window.localStorage"));
check("component-no-direct-set", !component.includes("localStorage.setItem"));
check("component-no-direct-get", !component.includes("localStorage.getItem"));
check("analytics-switch", component.includes('["analytics", analytics, setAnalytics]'));
check("marketing-switch", component.includes('["marketing", marketing, setMarketing]'));
check("switch-aria", component.includes('role="switch"') && component.includes("aria-checked={enabled}"));
check("save-granular", component.includes("choose({ analytics, marketing })"));
check("decline-explicit", component.includes("choose({ analytics: false, marketing: false })"));
check("accept-explicit", component.includes("choose({ analytics: true, marketing: true })"));
check("storage-failure-visible", component.includes("setIsVisible(!saved)"));
check("strict-json", consentSource.includes("parseStrictJsonText"));
check("expiry-bound", consentSource.includes("CONSENT_TTL_MS"));
check("legal-proof-false", consentSource.includes("legalProof: false"));
check("server-recorded-false", consentSource.includes("serverRecorded: false"));
check("analytics-default-off-ops", opsTelemetry.includes("Do not send analytics until consent"));

const output = {
  status: failures.length
    ? "FAIL_A102R16_COOKIE_CONSENT_GRANULAR_EXPIRY_PRIVACY_BOUNDARY"
    : "PASS_A102R16_COOKIE_CONSENT_GRANULAR_EXPIRY_PRIVACY_BOUNDARY_LOCAL_ONLY",
  assertions: passed + failures.length,
  passed,
  failed: failures.length,
  failures,
  truth: {
    necessaryAlwaysOn: true,
    analyticsDefaultOff: true,
    marketingDefaultOff: true,
    granularChoiceImplemented: true,
    consentExpiryRequired: true,
    strictJsonRequired: true,
    localStorageIsLegalProof: false,
    serverConsentLedgerProven: false,
    realBrowserMatrixProven: false,
    legalApprovalProven: false,
    liveProven: false,
    saleEnabled: false,
  },
};
console.log(JSON.stringify(output, null, 2));
if (failures.length) process.exitCode = 1;
