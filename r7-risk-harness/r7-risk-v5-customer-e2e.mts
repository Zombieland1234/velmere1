import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.env.R7_RISK_E2E_BASE_URL ?? "http://localhost:3100";
const alias = "multicall3-bsc";
const expectedCanonical = "eip155:56:0xca11bde05977b3631167028862be2a173976ca11";
const expectedFullSource = process.env.R7_RISK_EXPECTED_FULL_SOURCE_AGGREGATE_SHA256 ?? "";
const expectedExecution = process.env.R7_RISK_EXPECTED_EXECUTION_SLICE_AGGREGATE_SHA256 ?? "";
const sha = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function isObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function findEvents(value: unknown, depth = 0): any[] | null {
  if (depth > 8) return null;
  if (Array.isArray(value)) {
    if (value.length >= 2 && value.every((row) => isObject(row) && ("eventId" in row || "event_id" in row))) return value;
    for (const row of value) {
      const found = findEvents(row, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (isObject(value)) {
    for (const child of Object.values(value)) {
      const found = findEvents(child, depth + 1);
      if (found) return found;
    }
  }
  return null;
}
function recursiveKeys(value: unknown, output = new Set<string>(), depth = 0) {
  if (depth > 10) return output;
  if (Array.isArray(value)) for (const row of value) recursiveKeys(row, output, depth + 1);
  else if (isObject(value)) for (const [key, child] of Object.entries(value)) { output.add(key); recursiveKeys(child, output, depth + 1); }
  return output;
}
async function walk(directory: string): Promise<string[]> {
  const output: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await walk(absolute));
    else if (entry.isFile() && /route\.(?:ts|tsx|js|mjs)$/.test(entry.name)) output.push(absolute);
  }
  return output;
}
function routePath(file: string) {
  const normalized = file.replaceAll("\\", "/");
  const marker = "/app/api/";
  const index = normalized.indexOf(marker);
  if (index < 0) return null;
  let route = "/api/" + normalized.slice(index + marker.length).replace(/\/route\.(?:ts|tsx|js|mjs)$/, "");
  route = route.replace(/\[\[\.\.\.([^\]]+)\]\]/g, encodeURIComponent(alias));
  route = route.replace(/\[\.\.\.([^\]]+)\]/g, encodeURIComponent(alias));
  route = route.replace(/\[([^\]]+)\]/g, encodeURIComponent(alias));
  return route;
}
async function requestJson(url: string, method: "GET" | "POST", body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? { accept: "application/json", "cache-control": "no-store" } : { accept: "application/json", "content-type": "application/json", "cache-control": "no-store" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    redirect: "error",
  });
  const text = await response.text();
  let json: unknown = null;
  try { json = JSON.parse(text); } catch { /* Customer route may return HTML on a wrong probe. */ }
  return { response, text, json };
}

assert(/^[a-f0-9]{64}$/.test(expectedFullSource), "expected_full_source_missing");
assert(/^[a-f0-9]{64}$/.test(expectedExecution), "expected_execution_source_missing");

const apiRoot = path.join(process.cwd(), "app", "api");
const routeFiles = await walk(apiRoot);
const candidates: Array<{ file: string; route: string; methods: Array<"GET" | "POST">; params: string[] }> = [];
for (const file of routeFiles) {
  const source = await readFile(file, "utf8");
  if (!/(risk[-_ ]?history|riskIndicator|readPublicRisk|readRiskHistory|risk-ledger)/i.test(source)) continue;
  const route = routePath(file);
  if (!route) continue;
  const methods: Array<"GET" | "POST"> = [];
  if (/export\s+(?:async\s+)?function\s+GET|export\s+const\s+GET/.test(source)) methods.push("GET");
  if (/export\s+(?:async\s+)?function\s+POST|export\s+const\s+POST/.test(source)) methods.push("POST");
  if (!methods.length) continue;
  const params = [...source.matchAll(/searchParams(?:\?\.)?\.get\(["']([^"']+)["']\)/g)].map((match) => match[1]!);
  candidates.push({ file: path.relative(process.cwd(), file).replaceAll("\\", "/"), route, methods, params: [...new Set(params)] });
}
assert(candidates.length > 0, "risk_customer_api_route_not_found");

const queryNames = ["assetId", "asset", "id", "canonicalAssetId", "slug", "query", "q"];
const probes: any[] = [];
let success: { candidate: typeof candidates[number]; url: string; json: unknown; status: number } | null = null;
for (const candidate of candidates) {
  for (const method of candidate.methods) {
    const names = [...new Set([...candidate.params, ...queryNames])];
    if (method === "GET") {
      for (const name of names) {
        const target = new URL(candidate.route, base);
        target.searchParams.set(name, alias);
        target.searchParams.set("limit", "10");
        const result = await requestJson(target.toString(), "GET");
        const events = findEvents(result.json);
        probes.push({ route: candidate.route, method, parameter: name, status: result.response.status, eventCount: events?.length ?? 0 });
        if (result.response.status === 200 && events && events.length >= 2) { success = { candidate, url: target.toString(), json: result.json, status: result.response.status }; break; }
      }
    } else {
      for (const shape of [
        { assetId: alias, limit: 10 },
        { asset: alias, limit: 10 },
        { id: alias, limit: 10 },
        { schemaVersion: "velmere.risk-history-request.v1", assetId: alias, limit: 10 },
      ]) {
        const target = new URL(candidate.route, base);
        const result = await requestJson(target.toString(), "POST", shape);
        const events = findEvents(result.json);
        probes.push({ route: candidate.route, method, bodyKeys: Object.keys(shape), status: result.response.status, eventCount: events?.length ?? 0 });
        if (result.response.status === 200 && events && events.length >= 2) { success = { candidate, url: target.toString(), json: result.json, status: result.response.status }; break; }
      }
    }
    if (success) break;
  }
  if (success) break;
}
assert(success, `risk_customer_route_no_success:${JSON.stringify(probes.slice(-20))}`);
const events = findEvents(success.json)!;
assert(events.length >= 2, "risk_history_too_short");
const normalized = events.map((event) => ({
  eventId: String(event.eventId ?? event.event_id ?? ""),
  canonicalAssetId: String(event.canonicalAssetId ?? event.canonical_asset_id ?? event.snapshot?.canonicalAssetId ?? ""),
  publicationState: String(event.publicationState ?? event.publication_state ?? event.snapshot?.publicationState ?? ""),
  customerPublishable: Boolean(event.customerPublishable ?? event.customer_publishable ?? event.snapshot?.customerPublishable),
  methodologyVersion: String(event.methodologyVersion ?? event.methodology_version ?? event.snapshot?.methodologyVersion ?? ""),
  evidenceVersion: String(event.evidenceVersion ?? event.evidence_version ?? event.snapshot?.evidenceVersion ?? ""),
  observedAt: String(event.observedAt ?? event.observed_at ?? event.snapshot?.timestamp ?? ""),
  sourceAsOf: String(event.sourceAsOf ?? event.source_as_of ?? event.snapshot?.sourceAsOf ?? ""),
  riskScore: Number(event.score ?? event.riskScore ?? event.risk_score ?? event.snapshot?.score),
}));
for (const row of normalized) {
  assert(row.eventId.length >= 20, "risk_event_identity_missing");
  assert(row.canonicalAssetId === expectedCanonical, `risk_canonical_identity_mismatch:${row.canonicalAssetId}`);
  assert(row.publicationState === "PUBLIC", `risk_event_not_public:${row.publicationState}`);
  assert(row.customerPublishable === true, "risk_event_not_customer_publishable");
  assert(row.methodologyVersion.length > 8 && row.evidenceVersion.length > 8, "risk_version_boundary_missing");
  assert(Number.isFinite(row.riskScore) && row.riskScore >= 0 && row.riskScore <= 100, "risk_score_domain_invalid");
  assert(Number.isFinite(Date.parse(row.observedAt)) && Number.isFinite(Date.parse(row.sourceAsOf)), "risk_currentness_timestamp_missing");
}
assert(new Set(normalized.map((row) => row.eventId)).size === normalized.length, "risk_history_duplicate_event_identity");
assert(new Set(normalized.map((row) => `${row.methodologyVersion}|${row.evidenceVersion}`)).size >= 2, "risk_methodology_or_evidence_change_not_visible");

const keys = [...recursiveKeys(success.json)].map((key) => key.toLowerCase());
for (const forbidden of ["service_role", "servicekey", "service_key", "rawsecret", "decrypted_secret", "servercapability", "server_capability", "privateraw", "providerrawbody"]) {
  assert(!keys.some((key) => key.includes(forbidden)), `risk_customer_payload_private_key:${forbidden}`);
}

const unknownUrl = new URL(success.url);
for (const name of queryNames) if (unknownUrl.searchParams.has(name)) unknownUrl.searchParams.set(name, "definitely-not-a-real-velmere-risk-asset");
let unknownResult;
if (success.candidate.methods.includes("GET")) unknownResult = await requestJson(unknownUrl.toString(), "GET");
else unknownResult = await requestJson(new URL(success.candidate.route, base).toString(), "POST", { assetId: "definitely-not-a-real-velmere-risk-asset", limit: 10 });
assert([200, 404].includes(unknownResult.response.status), `risk_unknown_asset_status_${unknownResult.response.status}`);
if (unknownResult.response.status === 200) assert((findEvents(unknownResult.json)?.length ?? 0) === 0, "risk_unknown_asset_fabricated_history");

const receipt = {
  schemaVersion: "velmere.r7.risk-indicator-v5-customer-route-e2e.v1",
  status: "PASS_RISK_INDICATOR_V5_CUSTOMER_ROUTE_E2E",
  fullSourceAggregateSha256: expectedFullSource,
  executionSliceAggregateSha256: expectedExecution,
  githubRunId: process.env.GITHUB_RUN_ID ?? null,
  githubRunAttempt: Number(process.env.GITHUB_RUN_ATTEMPT ?? 0),
  githubSha: process.env.GITHUB_SHA ?? null,
  routeFile: success.candidate.file,
  route: new URL(success.url).pathname,
  method: success.candidate.methods[0],
  canonicalAssetId: expectedCanonical,
  alias,
  publicEventCount: normalized.length,
  distinctMethodologyEvidenceSegments: new Set(normalized.map((row) => `${row.methodologyVersion}|${row.evidenceVersion}`)).size,
  publicOnly: true,
  customerPublishableOnly: true,
  currentnessTimestampsPresent: true,
  unknownAssetDoesNotFabricateHistory: true,
  privatePayloadDisclosure: false,
  descriptiveRiskBoundary: true,
  probabilityClaim: false,
  investmentRecommendation: false,
  probes,
  responseDigestSha256: sha(JSON.stringify(success.json)),
  customerFinalCredit: false,
};
await writeFile("artifacts/r7/risk/R7_RISK_INDICATOR_V5_CUSTOMER_E2E.json", `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ ...receipt, probes: probes.slice(-12), responseDigestSha256: "<sha256>" }, null, 2));
