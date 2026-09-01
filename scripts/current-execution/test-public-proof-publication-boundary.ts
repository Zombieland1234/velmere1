import { readFileSync } from "node:fs";
import { resolve } from "node:path";

async function main() {
const pagePaths = [
  "app/proof/market-integrity/[publicProofId]/page.tsx",
  "app/proof/market-integrity/[publicProofId]/verify/page.tsx",
  "app/proof/market-integrity/[publicProofId]/audit-trail/page.tsx",
] as const;

const checks: Array<{ id: string; pass: boolean; detail?: unknown }> = [];
function check(id: string, condition: unknown, detail?: unknown) {
  checks.push({ id, pass: Boolean(condition), detail });
}

const sources = pagePaths.map((path) => ({
  path,
  source: readFileSync(resolve(path), "utf8"),
}));
const proxySource = readFileSync(resolve("proxy.ts"), "utf8");

for (const { path, source } of sources) {
  check(`${path}:force_dynamic`, source.includes('export const dynamic = "force-dynamic"'));
  check(`${path}:zero_revalidate`, source.includes("export const revalidate = 0"));
  check(`${path}:force_no_store`, source.includes('export const fetchCache = "force-no-store"'));
  check(`${path}:uses_page_boundary`, source.includes("public-proof-page-boundary"));
  check(`${path}:no_direct_registry_resolver`, !source.includes("public-proof-publication-resolver"));
  check(`${path}:uniform_not_found`, source.includes("notFound()"));
  check(`${path}:no_path_sanitization`, !source.includes("safeProofId"));
  check(`${path}:no_path_derived_digest`, !/sha256(?:Digest|Token)/u.test(source));
  check(`${path}:no_unresolved_acceptance_claim`, !/\b(?:accepted|sealed|ready)\b/iu.test(source));
}

check(
  "proxy_has_exact_public_proof_prefix",
  proxySource.includes('const PUBLIC_MARKET_INTEGRITY_PROOF_PREFIX = "/proof/market-integrity/"'),
);
check(
  "proxy_bypasses_locale_middleware_for_public_proof",
  proxySource.indexOf("normalizedPath.startsWith(PUBLIC_MARKET_INTEGRITY_PROOF_PREFIX)")
    < proxySource.lastIndexOf("intlMiddleware(securedRequest)"),
);
check(
  "proxy_public_proof_no_store",
  proxySource.includes('response.headers.set("cache-control", "no-store, private")'),
);
check(
  "proxy_public_proof_noindex",
  proxySource.includes('response.headers.set("x-robots-tag", "noindex, nofollow, noarchive")'),
);

try {
  const pageBoundary = await import("../../lib/market-integrity/public-proof-page-boundary");
  const runtimeFixtureId = `pubidx-${"a".repeat(48)}`;
  const runtimeUnknownId = `pubidx-${"b".repeat(48)}`;
  const runtimeIds = [
    runtimeFixtureId,
    runtimeUnknownId,
    `../${runtimeFixtureId}`,
    runtimeFixtureId.toUpperCase(),
    `${runtimeFixtureId}.`,
  ];
  for (const [mode, metadata] of Object.entries(pageBoundary.PUBLIC_PROOF_PAGE_METADATA)) {
    check(`${mode}:metadata_does_not_reflect_path`, !JSON.stringify(metadata).includes("ATTACKER"));
    check(`${mode}:metadata_noindex`, metadata.robots.index === false && metadata.robots.follow === false);
  }
  for (const publicProofId of runtimeIds) {
    const record = await pageBoundary.resolvePublicProofRecordPageBoundary(publicProofId);
    check(`record_boundary_withheld_without_durable_registry:${publicProofId}`, record === null, record);
  }

  const routeFixture = {
    schemaVersion: "velmere.verify-public-projection.v1",
    publicProofId: runtimeFixtureId,
    visibility: "PUBLIC",
    currentStatus: "VERIFIED",
    riskStatus: "LOW_DETECTED_RISK",
    chainId: "56",
    contractAddress: `0x${"1".repeat(40)}`,
    projectName: "Route fixture",
    reportTitle: "Route fixture report",
    publicSummary: "Exact redacted route fixture.",
    auditVersion: 1,
    publicationVersion: 1,
    reportDigest: "a".repeat(64),
    currentDeploymentDigest: "b".repeat(64),
    lastCheckedAt: "2026-08-21T12:00:00.000Z",
    monitorDueAt: "2026-08-21T13:00:00.000Z",
    statusChangedAt: "2026-08-21T12:00:00.000Z",
    historyVisibility: "PUBLIC",
    headEventDigest: "c".repeat(64),
    canonicalPath: `/proof/market-integrity/${runtimeFixtureId}`,
    materialChangeDetected: false,
    monitoringCurrent: true,
    reportCurrent: true,
  } as const;
  const injectedRecord = await pageBoundary.resolvePublicProofRecordPageBoundary(runtimeFixtureId, {
    resolveProof: async (publicProofId) => publicProofId === runtimeFixtureId ? routeFixture : null,
  });
  check("route_boundary_exact_record_resolves", injectedRecord?.publicProofId === runtimeFixtureId, injectedRecord);
  const injectedHistory = [{ eventDigest: routeFixture.headEventDigest }] as never;
  const auditTrail = await pageBoundary.resolvePublicProofAuditTrailPageBoundary(runtimeFixtureId, 50, {
    resolveProof: async () => routeFixture,
    resolveHistory: async () => injectedHistory,
  });
  check("route_boundary_head_bound_history_resolves", auditTrail?.history === injectedHistory, auditTrail);
  const mismatchedAuditTrail = await pageBoundary.resolvePublicProofAuditTrailPageBoundary(runtimeFixtureId, 50, {
    resolveProof: async () => routeFixture,
    resolveHistory: async () => [{ eventDigest: "d".repeat(64) }] as never,
  });
  check("route_boundary_history_head_mismatch_withheld", mismatchedAuditTrail === null, mismatchedAuditTrail);
} catch (error) {
  check("public_proof_page_boundary_loads", false, error instanceof Error ? error.message : error);
}

try {
  const boundary = await import("../../lib/market-integrity/public-proof-publication-resolver");
  const fixtureId = `pubidx-${"a".repeat(48)}`;
  const digestA = "a".repeat(64);
  const digestB = "b".repeat(64);
  const digestC = "c".repeat(64);
  const fixedNow = new Date("2026-08-21T12:01:00.000Z");
  const publishedFixture = {
    schemaVersion: "velmere.verify-public-projection.v1",
    publicProofId: fixtureId,
    visibility: "PUBLIC",
    currentStatus: "VERIFIED",
    riskStatus: "LOW_DETECTED_RISK",
    chainId: "56",
    contractAddress: `0x${"1".repeat(40)}`,
    projectName: "Server fixture",
    reportTitle: "Durable verification report",
    publicSummary: "Exact redacted public summary for the controlled server fixture.",
    auditVersion: 1,
    publicationVersion: 1,
    reportDigest: digestA,
    currentDeploymentDigest: digestB,
    lastCheckedAt: "2026-08-21T12:00:00.000Z",
    monitorDueAt: "2026-08-21T13:00:00.000Z",
    statusChangedAt: "2026-08-21T12:00:00.000Z",
    historyVisibility: "PUBLIC",
    headEventDigest: digestC,
    canonicalPath: `/proof/market-integrity/${fixtureId}`,
    materialChangeDetected: false,
    monitoringCurrent: true,
    reportCurrent: true,
  } as const;

  const serverOwnedResolver = {
    authority: "server_owned_publication_registry" as const,
    resolveExact: async (publicProofId: string) =>
      publicProofId === fixtureId ? publishedFixture : null,
  };

  const positive = await boundary.resolvePublishedPublicProofWithServerOwnedResolver(
    fixtureId,
    serverOwnedResolver,
    fixedNow,
  );
  check("server_owned_fixture_resolves", positive?.publicProofId === fixtureId, positive);
  check("server_owned_fixture_is_redacted_projection", positive?.reportDigest === digestA, positive);

  const validUnknown = `pubidx-${"b".repeat(48)}`;
  check(
    "unknown_valid_id_withheld",
    await boundary.resolvePublishedPublicProofWithServerOwnedResolver(validUnknown, serverOwnedResolver, fixedNow) === null,
  );

  for (const [id, mutation] of [
    ["private", { ...publishedFixture, visibility: "PRIVATE" }],
    ["stale-green", { ...publishedFixture, monitorDueAt: "2026-08-21T11:00:00.000Z" }],
    ["non-green-risk-replay", { ...publishedFixture, currentStatus: "CHANGE_DETECTED", monitoringCurrent: false, materialChangeDetected: true }],
    ["id-mismatch", { ...publishedFixture, publicProofId: validUnknown }],
    ["extra-private-field", { ...publishedFixture, privatePayload: "must-not-project" }],
  ] as const) {
    const result = await boundary.resolvePublishedPublicProofWithServerOwnedResolver(fixtureId, {
      authority: "server_owned_publication_registry",
      resolveExact: async () => mutation,
    }, fixedNow);
    check(`${id}_record_withheld`, result === null, result);
  }

  let invalidResolverCalls = 0;
  const collisionResolver = {
    authority: "server_owned_publication_registry" as const,
    resolveExact: async () => {
      invalidResolverCalls += 1;
      return publishedFixture;
    },
  };
  const invalidIds = [
    `../${fixtureId}`,
    `${fixtureId}/verify`,
    `${fixtureId}%2fverify`,
    fixtureId.toUpperCase(),
    `${fixtureId}.`,
    "pubidx-server_owned_fixture_00000001",
    "pubidx-short",
    "",
  ];
  for (const invalidId of invalidIds) {
    const result = await boundary.resolvePublishedPublicProofWithServerOwnedResolver(
      invalidId,
      collisionResolver,
    );
    check(`invalid_id_withheld:${invalidId}`, result === null, result);
  }
  check("invalid_ids_never_reach_resolver", invalidResolverCalls === 0, invalidResolverCalls);

  const defaultRuntime = await boundary.resolvePublishedPublicProof(fixtureId);
  check("runtime_surface_withheld_without_durable_registry", defaultRuntime === null, defaultRuntime);
} catch (error) {
  check("publication_resolver_module_loads", false, error instanceof Error ? error.message : error);
}

const failed = checks.filter((row) => !row.pass);
console.log(JSON.stringify({
  schemaVersion: "velmere.current-execution.public-proof-publication-boundary-test.v1",
  status: failed.length ? "FAIL" : "PASS_LOCAL_ONLY",
  assertions: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  failures: failed,
  truthBoundary: "Local current-source route-controller and resolver proof only. React/Next production rendering, durable Supabase staging, deployment, uptime and external use remain unproven.",
  nextReactRuntimeCredit: false,
  finalCredit: false,
  liveCredit: false,
}, null, 2));
if (failed.length) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
