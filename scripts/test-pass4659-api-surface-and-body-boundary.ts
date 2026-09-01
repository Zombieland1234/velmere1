import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative, sep } from "node:path";
import {
  PASS4659_API_SURFACE_REGISTRY_ID,
  classifyPass4659ApiPath,
  isPass4659ControlPlanePath,
  type Pass4659ApiSurfaceClass,
} from "../lib/security/api-surface-registry";

const root = process.cwd();
const apiRoot = join(root, "app", "api");
const artifactsDir = join(root, "artifacts");
mkdirSync(artifactsDir, { recursive: true });

function walk(dir: string): string[] {
  const result: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) result.push(...walk(path));
    else if (name === "route.ts") result.push(path);
  }
  return result;
}

function routePath(file: string) {
  const rel = relative(join(root, "app"), file).split(sep).join("/").replace(/\/route\.ts$/, "");
  return `/${rel}`;
}

function localImports(source: string) {
  return [...source.matchAll(/from\s+["'](@\/[^"']+|\.\.?\/[^"']+)["']/g)].map((match) => match[1]);
}

type MutatingBodyHandling =
  | "not_applicable"
  | "stream_bounded"
  | "body_rejected"
  | "unsafe_direct_parser"
  | "unverified";

// These are route-facing adapters whose implementations are pinned below to
// an actual streaming reader. Merely calling rejectLargeContentLength is
// deliberately absent: chunked and HTTP/2 bodies can omit Content-Length.
const STREAM_BOUNDED_ROUTE_MARKERS = [
  "readBoundedJsonBody",
  "readBoundedBodyBytes",
  "readBoundedFormDataBody",
  "readPass4281AuditJson",
  "readPublicMutationJsonBody",
  "handleAuditWatchPost",
  "handleStripeWebhookRequest",
  "authorizeInternalWorkerMutation",
] as const;
const BODY_REJECTION_ROUTE_MARKER = "rejectUnexpectedRequestBody" as const;

const sharedBoundaryProofs = [
  {
    marker: "readPass4281AuditJson",
    file: "lib/security/api-security-post-wrapper.ts",
    required: ["readBoundedJsonBody", "resolveRequestAccount", "applyDurableRateLimit", "withExpensiveRouteBudget"],
  },
  {
    marker: "readPublicMutationJsonBody",
    file: "lib/security/mutation-request-boundary.ts",
    required: ["readBoundedJsonBody"],
  },
  {
    marker: "handleAuditWatchPost",
    file: "lib/security/audit-watch-post-handler.ts",
    required: ["readBoundedJsonBody<Pass4640AuditWatchPayload>", "256 * 1024"],
  },
  {
    marker: "handleStripeWebhookRequest",
    file: "lib/payments/stripe-webhook/ingress.ts",
    required: ["readBoundedBodyBytes", "readBodyBytes(req, 1_000_000)"],
  },
  {
    marker: "authorizeInternalWorkerMutation",
    file: "lib/security/internal-worker-mutation-boundary.ts",
    required: [
      "readBoundedJsonBody<Record<string, unknown>>",
      "options.maxBytes ?? 16 * 1024",
      "maxDepth: 8",
      "requireObject: true",
      "rejectDuplicateKeys: true",
      "rejectDangerousKeys: true",
    ],
  },
  {
    marker: BODY_REJECTION_ROUTE_MARKER,
    file: "lib/security/payment-webhook-guard.ts",
    required: ["readBoundedBodyBytes(request, 0)"],
  },
] as const;

for (const proof of sharedBoundaryProofs) {
  const implementation = readFileSync(join(root, proof.file), "utf8");
  for (const required of proof.required) {
    assert.ok(
      implementation.includes(required),
      `${proof.marker} must remain backed by ${required} in ${proof.file}`,
    );
  }
}

function classifyMutatingBodyHandling(source: string, mutating: boolean): {
  handling: MutatingBodyHandling;
  evidence: string[];
} {
  if (!mutating) return { handling: "not_applicable", evidence: [] };
  if (source.includes(BODY_REJECTION_ROUTE_MARKER)) {
    return { handling: "body_rejected", evidence: [BODY_REJECTION_ROUTE_MARKER] };
  }
  const evidence = STREAM_BOUNDED_ROUTE_MARKERS.filter((marker) => source.includes(marker));
  if (evidence.length) return { handling: "stream_bounded", evidence };
  if (/\b(?:request|req)\s*\.\s*(?:json|text|formData|arrayBuffer|blob)\s*\(/.test(source)) {
    return { handling: "unsafe_direct_parser", evidence: ["direct_request_body_parser"] };
  }
  return { handling: "unverified", evidence: [] };
}

const obviousControlPlane = [
  /\/audit-pass\d+/i,
  /\/pass\d+(?:[-/]|$)/i,
  /\/proof-status(?:\/|$)/i,
  /\/action-report-/i,
  /\/(?:final|worldclass)-[^/]+/i,
  /\/market-integrity\/(?:release-|runtime-(?:health|parity|premium-evidence)|replay|fixture-|proof-gap-)/i,
];

const criticalBoundedRoutes = new Set([
  "/api/square/posts",
  "/api/square/comments",
  "/api/angel/memory",
  "/api/profile",
  "/api/products/checkout-guard",
  "/api/ai",
  "/api/market-integrity/angel",
]);

type ApiSurfaceRow = {
  path: string;
  file: string;
  methods: string[];
  mutating: boolean;
  bodyBoundary: boolean;
  bodyHandling: MutatingBodyHandling;
  bodyBoundaryEvidence: string[];
  sourceClass: Pass4659ApiSurfaceClass;
  lineCount: number;
  localImports: string[];
};

function buildRow(args: { path: string; file: string; source: string; methods?: string[] }): ApiSurfaceRow {
  const detectedMethods = [...args.source.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g)]
    .map((match) => match[1]);
  const methods = [...new Set(args.methods ?? detectedMethods)].sort();
  const mutating = methods.some((method) => ["POST", "PUT", "PATCH", "DELETE"].includes(method));
  const bodyHandling = classifyMutatingBodyHandling(args.source, mutating);
  const bodyBoundary = bodyHandling.handling === "stream_bounded" || bodyHandling.handling === "body_rejected";
  return {
    path: args.path,
    file: args.file,
    methods,
    mutating,
    bodyBoundary,
    bodyHandling: bodyHandling.handling,
    bodyBoundaryEvidence: bodyHandling.evidence,
    sourceClass: classifyPass4659ApiPath(args.path),
    lineCount: args.source.split(/\r?\n/).length,
    localImports: localImports(args.source),
  };
}

const routeDispatchManifest = JSON.parse(readFileSync(join(root, "config/pass15/route-dispatch-manifest.json"), "utf8")) as Record<string, unknown>;
const directRouteRecovery = JSON.parse(readFileSync(join(root, "config/pass35/a41-critical-route-recovery.json"), "utf8")) as {
  authorizedDirectRoutes?: string[];
};
const authorizedDirectRoutes = new Set(directRouteRecovery.authorizedDirectRoutes ?? []);
const verifiedRecoveredDirectRoutes = new Set<string>();
const consolidatedGroups = ["marketIntegrity", "internalWorkers", "security", "search", "admin"] as const;
const consolidatedRows: ApiSurfaceRow[] = [];
const dispatcherFiles = new Set<string>();
for (const groupName of consolidatedGroups) {
  const group = routeDispatchManifest[groupName] as {
    dispatcher: string;
    routes: Array<{ publicPath: string; originalPath: string; handlerModule: string; methods: string[] }>;
  };
  assert.ok(group && Array.isArray(group.routes), `Missing route-dispatch group ${groupName}`);
  dispatcherFiles.add(group.dispatcher);
  for (const route of group.routes) {
    const handlerFile = join(root, route.handlerModule);
    assert.ok(statSync(handlerFile).isFile(), `Missing current handler ${route.handlerModule}`);
    if (authorizedDirectRoutes.has(route.originalPath)) {
      const directSource = readFileSync(join(root, route.originalPath), "utf8");
      const expectedBinding = `@/${route.handlerModule.replace(/\.ts$/u, "")}`;
      const directMethods = [...directSource.matchAll(/export\s*\{\s*([^}]+)\s*\}\s*from/gu)]
        .flatMap((match) => match[1].split(",").map((method) => method.trim()))
        .filter((method) => /^(?:GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)$/u.test(method))
        .sort();
      assert.ok(directSource.includes(expectedBinding), `Recovered direct route ${route.originalPath} must bind ${expectedBinding}`);
      assert.deepEqual(directMethods, [...route.methods].sort(), `Recovered direct route ${route.originalPath} methods must match the fallback manifest`);
      verifiedRecoveredDirectRoutes.add(route.originalPath);
      // Next gives this explicit static route precedence over [operation].
      // Inventory the canonical direct entry below and retain the dynamic
      // registry only as its verified fallback, never as a second API surface.
      continue;
    }
    consolidatedRows.push(buildRow({
      path: route.publicPath,
      file: route.handlerModule,
      source: readFileSync(handlerFile, "utf8"),
      methods: route.methods,
    }));
  }
}
assert.deepEqual(
  [...verifiedRecoveredDirectRoutes].sort(),
  [...authorizedDirectRoutes].sort(),
  "Every authorized recovered direct route must remain bound to exactly one fallback-manifest entry",
);

const accountOperationsShell = "app/api/market-integrity/account-operations/[operation]/route.ts";
const accountOperationsSource = readFileSync(join(root, accountOperationsShell), "utf8");
const accountRows: ApiSurfaceRow[] = [...accountOperationsSource.matchAll(/"([a-z0-9-]+)"\s*:\s*\(\)\s*=>\s*import\("(@\/lib\/server\/account-operations\/[a-z0-9-]+)"\)/gu)]
  .map((match) => {
    const operation = match[1];
    const handlerModule = `${match[2].slice(2)}.ts`;
    const handlerFile = join(root, handlerModule);
    assert.ok(statSync(handlerFile).isFile(), `Missing account operation handler ${handlerModule}`);
    return buildRow({
      path: `/api/market-integrity/account-operations/${operation}`,
      file: handlerModule,
      source: readFileSync(handlerFile, "utf8"),
      methods: ["GET"],
    });
  });
assert.equal(accountRows.length, 29, "Account operation registry must expose exactly the current 29 allowlisted operations");

dispatcherFiles.add(accountOperationsShell);

const delegatedDirectRouteHandlers = new Map([
  [
    "app/api/checkout/vlm-service/verify/route.ts",
    "lib/server/vlm-service-verify-handler.ts",
  ],
]);

const nestedRegistryGroups = [
  {
    shell: "app/api/market-integrity/vlm/[operation]/route.ts",
    registry: "lib/server/route-registries/market-integrity-vlm.ts",
    basePath: "/api/market-integrity/vlm",
  },
  {
    shell: "app/api/market-integrity/real-markets/[operation]/route.ts",
    registry: "lib/server/route-registries/real-markets.ts",
    basePath: "/api/market-integrity/real-markets",
  },
] as const;
const nestedRegistryRows: ApiSurfaceRow[] = [];
for (const group of nestedRegistryGroups) {
  dispatcherFiles.add(group.shell);
  const registrySource = readFileSync(join(root, group.registry), "utf8");
  const registryMatches = [...registrySource.matchAll(/"([a-z0-9-]+)"\s*:\s*\{\s*methods:\s*\[([^\]]+)\][\s\S]*?import\("@\/(lib\/server\/[^"']+)"\)/gu)];
  assert.ok(registryMatches.length > 0, `Missing nested registry entries in ${group.registry}`);
  for (const match of registryMatches) {
    const operation = match[1];
    const methods = [...match[2].matchAll(/"(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)"/gu)].map((method) => method[1]);
    const handlerModule = `${match[3]}.ts`;
    const handlerFile = join(root, handlerModule);
    assert.ok(statSync(handlerFile).isFile(), `Missing nested handler ${handlerModule}`);
    nestedRegistryRows.push(buildRow({
      path: `${group.basePath}/${operation}`,
      file: handlerModule,
      source: readFileSync(handlerFile, "utf8"),
      methods,
    }));
  }
}

const directRows = walk(apiRoot)
  .map((file) => relative(root, file).split(sep).join("/"))
  .filter((file) => !dispatcherFiles.has(file))
  .map((file) => {
    const shellSource = readFileSync(join(root, file), "utf8");
    const delegatedHandler = delegatedDirectRouteHandlers.get(file);
    const lazyImport = shellSource.match(/(?:load\s*:\s*|const\s+load\s*=\s*)\(\)\s*=>\s*import\(["']@\/(lib\/server\/lazy-route-modules\/[^"']+)["']\)/u);
    const implementationFile = delegatedHandler
      ?? (lazyImport ? `${lazyImport[1]}.ts` : file);
    if (delegatedHandler) {
      const exactImport = `@/${delegatedHandler.replace(/\.ts$/u, "")}`;
      assert.ok(
        shellSource.includes(exactImport),
        `Delegated direct route ${file} must bind exact handler ${exactImport}`,
      );
      assert.ok(
        statSync(join(root, delegatedHandler)).isFile(),
        `Missing delegated direct handler ${delegatedHandler}`,
      );
    }
    const implementationSource =
      delegatedHandler || lazyImport
        ? readFileSync(join(root, implementationFile), "utf8")
        : shellSource;
    const shellMethods = [...shellSource.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g)]
      .map((match) => match[1]);
    return buildRow({
      path: routePath(join(root, file)),
      file: implementationFile,
      source: `${shellSource}
${implementationSource}`,
      methods: shellMethods,
    });
  });

const rows = [...directRows, ...consolidatedRows, ...accountRows, ...nestedRegistryRows].sort((left, right) => left.path.localeCompare(right.path));
// PASS28 consolidates 160 physical route entrypoints into five fail-closed
// dispatchers and also exposes 29 allowlisted account operations behind one
// additional dynamic shell. Count logical public operations, not route.ts files.
const pass28LogicalRouteFloor = 265;
assert.ok(rows.length >= pass28LogicalRouteFloor, `Expected at least ${pass28LogicalRouteFloor} logical API operations, got ${rows.length}`);
assert.equal(new Set(rows.map((row) => row.path)).size, rows.length, "API route paths must be unique");

const escapedControlPlane = rows.filter((row) => obviousControlPlane.some((pattern) => pattern.test(row.path)) && row.sourceClass !== "control_plane");
assert.deepEqual(escapedControlPlane.map((row) => row.path), [], `Obvious control-plane routes escaped classification: ${escapedControlPlane.map((row) => row.path).join(", ")}`);

const controlPlane = rows.filter((row) => row.sourceClass === "control_plane");
// PASS28 removed the historical action-report/proof-plane entrypoints from the
// operational route manifest. A zero count is therefore a stronger current
// source property, not route loss; historical paths remain in the runtime
// deny manifest and are not reintroduced as executable handlers.
assert.equal(controlPlane.length, 0, `Operational API must not expose historical control-plane routes: ${controlPlane.map((row) => row.path).join(", ")}`);
for (const row of controlPlane) assert.equal(isPass4659ControlPlanePath(row.path), true);

assert.deepEqual(
  rows.filter((row) => row.sourceClass === "unclassified").map((row) => row.path),
  [],
  "Every API route must have an explicit trust-boundary class",
);

for (const route of criticalBoundedRoutes) {
  const row = rows.find((candidate) => candidate.path === route);
  assert.ok(row, `Missing critical route ${route}`);
  assert.equal(row?.mutating, true, `${route} must remain a mutating route`);
  assert.equal(row?.bodyBoundary, true, `${route} must use the shared bounded JSON reader`);
}

const pass4995ResidualContracts = new Map<string, MutatingBodyHandling>([
  ["/api/admin/sync-printful", "body_rejected"],
  ["/api/angel/stream", "stream_bounded"],
  ["/api/security/advanced-entitlement-proof", "body_rejected"],
  ["/api/security/advanced-entitlement-smoke", "body_rejected"],
  ["/api/security/angel-gemini-health", "body_rejected"],
  ["/api/security/audit-provider-conflict-arbitration-matrix", "stream_bounded"],
  ["/api/security/audit-provider-intelligence", "stream_bounded"],
  ["/api/security/audit-provider-runtime", "stream_bounded"],
  ["/api/security/audit-real-provider-adapter-hardening", "stream_bounded"],
  ["/api/security/audit-runtime-build-readiness-type-safety-sweep", "stream_bounded"],
  ["/api/security/audit-runtime-confidence", "stream_bounded"],
  ["/api/security/audit-source-quorum", "stream_bounded"],
  ["/api/security/audit-watch/pro-pdf/token", "stream_bounded"],
  ["/api/security/audit-watch", "stream_bounded"],
  ["/api/security/cart-mail-wallet-microinteraction-sweep", "body_rejected"],
  ["/api/security/modal-mobile-scroll-lock-final-sweep", "body_rejected"],
  ["/api/security/supabase-runtime-truth", "body_rejected"],
  ["/api/stripe/webhook", "stream_bounded"],
]);
for (const [route, expectedHandling] of pass4995ResidualContracts) {
  const row = rows.find((candidate) => candidate.path === route);
  assert.ok(row, `Missing PASS4995 residual route ${route}`);
  assert.equal(row?.bodyHandling, expectedHandling, `${route} body handling must be ${expectedHandling}`);
  assert.equal(row?.bodyBoundary, true, `${route} must have an actual stream-safe body policy`);
}

const counts = rows.reduce<Record<Pass4659ApiSurfaceClass, number>>((acc, row) => {
  acc[row.sourceClass] += 1;
  return acc;
}, {
  control_plane: 0,
  machine_webhook: 0,
  admin_operator: 0,
  authenticated_customer: 0,
  public_product: 0,
  unclassified: 0,
});

const mutatingRows = rows.filter((row) => row.mutating);
const boundedMutatingRows = mutatingRows.filter((row) => row.bodyBoundary);
const unboundedMutatingRows = mutatingRows.filter((row) => !row.bodyBoundary);
assert.deepEqual(
  unboundedMutatingRows.map((row) => `${row.path}:${row.bodyHandling}`),
  [],
  "Every mutating route, including isolated control-plane routes, must have an actual stream-safe body policy",
);
const mutatingProductRows = mutatingRows.filter((row) => row.sourceClass !== "control_plane");
const boundedProductRows = mutatingProductRows.filter((row) => row.bodyBoundary);
const unboundedProductRows = mutatingProductRows.filter((row) => !row.bodyBoundary);
assert.deepEqual(
  unboundedProductRows.map((row) => `${row.path}:${row.bodyHandling}`),
  [],
  "Every mutating non-control route must stream-bound or explicitly reject its body",
);
const mutatingBodyHandlingCounts = mutatingProductRows.reduce<Record<string, number>>((acc, row) => {
  acc[row.bodyHandling] = (acc[row.bodyHandling] ?? 0) + 1;
  return acc;
}, {});
const allMutatingBodyHandlingCounts = mutatingRows.reduce<Record<string, number>>((acc, row) => {
  acc[row.bodyHandling] = (acc[row.bodyHandling] ?? 0) + 1;
  return acc;
}, {});
const inventory = {
  passId: PASS4659_API_SURFACE_REGISTRY_ID,
  generatedAt: new Date().toISOString(),
  routeCount: rows.length,
  counts,
  controlPlaneCount: controlPlane.length,
  mutatingRouteCount: mutatingRows.length,
  boundedMutatingRouteCount: boundedMutatingRows.length,
  unboundedMutatingRouteCount: unboundedMutatingRows.length,
  boundedMutatingCoveragePercent: Number(((boundedMutatingRows.length / Math.max(1, mutatingRows.length)) * 100).toFixed(2)),
  allMutatingBodyHandlingCounts,
  mutatingProductRouteCount: mutatingProductRows.length,
  boundedMutatingProductRouteCount: boundedProductRows.length,
  boundedMutatingProductCoveragePercent: Number(((boundedProductRows.length / Math.max(1, mutatingProductRows.length)) * 100).toFixed(2)),
  unboundedMutatingProductRouteCount: unboundedProductRows.length,
  mutatingBodyHandlingCounts,
  contentLengthOnlyCountsAsBoundary: false,
  pass4995ResidualContractCount: pass4995ResidualContracts.size,
  criticalBoundedRoutes: [...criticalBoundedRoutes],
  routes: rows,
};

writeFileSync(join(artifactsDir, "PASS4659_API_SURFACE_INVENTORY.json"), JSON.stringify(inventory, null, 2));
const text = [
  `PASS4659 API SURFACE INVENTORY`,
  `Registry: ${PASS4659_API_SURFACE_REGISTRY_ID}`,
  `Routes: ${inventory.routeCount}`,
  `Control-plane isolated: ${inventory.controlPlaneCount}`,
  `Mutating routes: ${inventory.mutatingRouteCount}`,
  `All bounded mutating routes: ${inventory.boundedMutatingRouteCount}`,
  `All unbounded mutating routes: ${inventory.unboundedMutatingRouteCount}`,
  `All mutating coverage: ${inventory.boundedMutatingCoveragePercent}%`,
  `All mutating body handling: ${JSON.stringify(allMutatingBodyHandlingCounts)}`,
  `Mutating non-control routes: ${inventory.mutatingProductRouteCount}`,
  `Bounded mutating non-control routes: ${inventory.boundedMutatingProductRouteCount}`,
  `Unbounded mutating non-control routes: ${inventory.unboundedMutatingProductRouteCount}`,
  `Coverage: ${inventory.boundedMutatingProductCoveragePercent}%`,
  `Body handling: ${JSON.stringify(mutatingBodyHandlingCounts)}`,
  `Content-Length-only guard accepted as stream boundary: false`,
  `Classes: ${JSON.stringify(counts)}`,
  "",
  "CONTROL-PLANE KILL LIST / FREEZE CANDIDATES",
  ...controlPlane.map((row) => `${row.path} | ${row.methods.join(",") || "no-exported-method"} | ${row.lineCount} lines | imports=${row.localImports.length}`),
].join("\n");
writeFileSync(join(artifactsDir, "PASS4659_API_SURFACE_INVENTORY.txt"), `${text}\n`);

console.log(JSON.stringify({
  ok: true,
  passId: PASS4659_API_SURFACE_REGISTRY_ID,
  routeCount: rows.length,
  controlPlaneCount: controlPlane.length,
  counts,
  mutatingRouteCount: mutatingRows.length,
  boundedMutatingRouteCount: boundedMutatingRows.length,
  unboundedMutatingRouteCount: unboundedMutatingRows.length,
  boundedMutatingCoveragePercent: inventory.boundedMutatingCoveragePercent,
  allMutatingBodyHandlingCounts,
  mutatingProductRouteCount: mutatingProductRows.length,
  boundedMutatingProductRouteCount: boundedProductRows.length,
  unboundedMutatingProductRouteCount: unboundedProductRows.length,
  mutatingBodyHandlingCounts,
  boundedCoveragePercent: inventory.boundedMutatingProductCoveragePercent,
  assertions: 16 + criticalBoundedRoutes.size * 3 + pass4995ResidualContracts.size * 3
    + sharedBoundaryProofs.reduce((sum, proof) => sum + proof.required.length, 0),
}, null, 2));
