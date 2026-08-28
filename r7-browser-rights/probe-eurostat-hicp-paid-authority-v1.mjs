import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const PACKET_PATH = resolve(
  "r7-browser-rights/R7_BROWSER_EUROSTAT_PAID_RIGHTS_REVIEW_PACKET_20260828.json",
);
const OUTPUT_PATH = resolve(
  process.argv[2] ?? "artifacts/r7/browser-rights/R7_BROWSER_EUROSTAT_TECHNICAL_PROBE.json",
);
const ORIGIN = "https://ec.europa.eu";
const PATH = "/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_minr";
const GEOGRAPHIES = Object.freeze(["EA20", "DE", "PL"]);
const ADVANCED_CATEGORIES = Object.freeze([
  "TOTAL", "CP01", "CP02", "CP03", "CP04", "CP05", "CP06",
  "CP07", "CP08", "CP09", "CP10", "CP11", "CP12", "CP13",
]);
const MAX_RESPONSE_BYTES = 1_048_576;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function assert(value, message) {
  if (!value) throw new Error(message);
}

function exactKeys(index, expected, label) {
  assert(index && typeof index === "object" && !Array.isArray(index), `${label}_index_missing`);
  const actual = Object.keys(index).sort();
  const wanted = [...expected].sort();
  assert(JSON.stringify(actual) === JSON.stringify(wanted), `${label}_index_mismatch:${actual.join(",")}`);
}

function buildUrl(categories) {
  const url = new URL(PATH, ORIGIN);
  url.searchParams.set("lang", "en");
  for (const geography of GEOGRAPHIES) url.searchParams.append("geo", geography);
  url.searchParams.set("unit", "RCH_A");
  for (const category of categories) url.searchParams.append("coicop18", category);
  url.searchParams.set("sinceTimePeriod", process.env.R7_EUROSTAT_SINCE ?? "2023-01");
  assert(url.origin === ORIGIN && url.pathname === PATH, "eurostat_url_boundary_invalid");
  return url;
}

async function fetchAndInspect(tier, categories) {
  const url = buildUrl(categories);
  const response = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json", "cache-control": "no-store" },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  assert(response.status === 200, `${tier}_http_${response.status}`);
  assert((response.headers.get("content-type") ?? "").toLowerCase().includes("application/json"), `${tier}_content_type_invalid`);
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  assert(!declaredLength || declaredLength <= MAX_RESPONSE_BYTES, `${tier}_declared_response_too_large`);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert(bytes.byteLength > 0 && bytes.byteLength <= MAX_RESPONSE_BYTES, `${tier}_response_size_invalid`);
  let data;
  try { data = JSON.parse(bytes.toString("utf8")); }
  catch { throw new Error(`${tier}_invalid_json`); }
  assert(data?.version === "2.0" && data?.class === "dataset", `${tier}_json_stat_contract_invalid`);
  assert(data?.source === "ESTAT", `${tier}_source_not_estat`);
  assert(data?.label === "Harmonised index of consumer prices (HICP) - ECOICOP ver.2 - indices and rates of change, monthly data", `${tier}_dataset_label_invalid`);
  assert(JSON.stringify(data?.id) === JSON.stringify(["freq", "unit", "coicop18", "geo", "time"]), `${tier}_dimension_order_invalid`);
  assert(Array.isArray(data?.size) && data.size.length === 5, `${tier}_dimension_sizes_invalid`);
  exactKeys(data?.dimension?.freq?.category?.index, ["M"], `${tier}_frequency`);
  exactKeys(data?.dimension?.unit?.category?.index, ["RCH_A"], `${tier}_unit`);
  exactKeys(data?.dimension?.geo?.category?.index, GEOGRAPHIES, `${tier}_geographies`);
  exactKeys(data?.dimension?.coicop18?.category?.index, categories, `${tier}_categories`);
  const periods = Object.keys(data?.dimension?.time?.category?.index ?? {});
  assert(periods.length >= 12 && periods.every((period) => /^\d{4}-\d{2}$/u.test(period)), `${tier}_time_series_invalid`);
  assert(data?.value && typeof data.value === "object" && Object.keys(data.value).length >= periods.length * GEOGRAPHIES.length, `${tier}_values_missing`);
  assert(typeof data?.updated === "string" && Number.isFinite(Date.parse(data.updated)), `${tier}_updated_at_invalid`);
  return {
    tier,
    url: url.toString(),
    httpStatus: response.status,
    contentType: response.headers.get("content-type"),
    responseBytes: bytes.byteLength,
    responseSha256: sha256(bytes),
    source: data.source,
    datasetUpdatedAt: data.updated,
    periodCount: periods.length,
    categories: [...categories],
    geographies: [...GEOGRAPHIES],
    valueCount: Object.keys(data.value).length,
  };
}

const packetBytes = await readFile(PACKET_PATH);
const packet = JSON.parse(packetBytes.toString("utf8"));
assert(packet?.status === "PENDING_OWNER_LEGAL_APPROVAL", "rights_packet_must_remain_pending");
assert(packet?.legalApprovalRecorded === false, "rights_packet_cannot_claim_legal_approval");
assert(packet?.customerFinalCredit === false && packet?.paidValueFinalCredit === false, "rights_packet_cannot_claim_final_credit");
assert(packet?.boundedCandidateScope?.datasetCode === "prc_hicp_minr", "rights_packet_dataset_scope_invalid");
exactKeys(Object.fromEntries(packet.boundedCandidateScope.geographies.map((value) => [value, true])), GEOGRAPHIES, "rights_packet_geographies");

const [pro, advanced] = await Promise.all([
  fetchAndInspect("pro", ["TOTAL"]),
  fetchAndInspect("advanced", ADVANCED_CATEGORIES),
]);

const receipt = {
  schemaVersion: "velmere.r7.browser-eurostat-technical-probe.v1",
  status: "PASS_TECHNICAL_ACCESS_WITHHELD_EXTERNAL_LEGAL_APPROVAL",
  observedAt: new Date().toISOString(),
  githubRunId: process.env.GITHUB_RUN_ID ?? null,
  githubRunAttempt: Number(process.env.GITHUB_RUN_ATTEMPT ?? 0),
  githubHeadSha: process.env.GITHUB_SHA ?? null,
  runtime: { node: process.version, platform: process.platform, architecture: process.arch },
  rightsReviewPacketPath: "r7-browser-rights/R7_BROWSER_EUROSTAT_PAID_RIGHTS_REVIEW_PACKET_20260828.json",
  rightsReviewPacketSha256: sha256(packetBytes),
  officialPolicyUrl: packet.officialAuthorities.copyrightAndReusePolicyUrl,
  apiDocumentationUrl: packet.officialAuthorities.apiDocumentationUrl,
  technicalAccessVerified: true,
  legalApprovalRecorded: false,
  customerArtifactDelivered: false,
  customerFinalCredit: false,
  paidValueFinalCredit: false,
  rightsGateBypassed: false,
  providerObservations: [pro, advanced],
  oneActionRequired: packet.requiredAuthorizedDecision.oneAction,
  truthBoundary: "This is a live, zero-euro technical API/schema probe. It proves neither legal approval nor paid customer delivery and must not unlock the fail-closed Browser route.",
};

await mkdir(dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "w" });
process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
