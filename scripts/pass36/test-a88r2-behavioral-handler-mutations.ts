import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  executeBrainRequest,
  type BrainExecutionDependencies,
} from "../../lib/server/market-integrity-route-modules/brain.ts";
import {
  resolveAngelRequest,
  type AngelExecutionDependencies,
} from "../../lib/server/market-integrity-route-modules/angel.ts";
import {
  executeVlmRiskPostRequest,
  type VlmRiskExecutionDependencies,
} from "../../lib/server/market-integrity-route-modules/vlm.ts";
import {
  A88R2_REVISION,
  A88R2_SCHEMA,
  hmacA88R2,
  sha256A88R2,
  signA88R2Envelope,
  verifyA88R2Envelope,
  type A88R2EnvelopeCore,
  type A88R2DependencySpies,
  type A88R2ExpectedDecision,
  type A88R2Handler,
  type A88R2SignedEnvelope,
  type A88R2VerificationContext,
} from "../../lib/worldclass/pass36-a88r2-behavioral-verifier.ts";
import { buildA88R1FocusedCases } from "../../lib/worldclass/pass36-a88r1-semantic-adversarial-runtime.ts";
import type {
  VlmBehavioralTraceEvent,
  VlmBehavioralTraceSink,
} from "../../lib/ai/vlm-behavioral-trace.ts";
import type { TokenRiskResult } from "../../lib/market-integrity/risk-types.ts";

type FocusedCase = ReturnType<typeof buildA88R1FocusedCases>[number];

const OUTPUT_DIR =
  process.env.VELMERE_A88R2_OUTPUT_DIR ??
  path.resolve("artifacts/pass36/a88r2");
const KEY = crypto.randomBytes(32);
const HANDLER_PATHS: Record<A88R2Handler, string> = {
  brain: "lib/server/market-integrity-route-modules/brain.ts",
  angel: "lib/server/market-integrity-route-modules/angel.ts",
  risk: "lib/server/market-integrity-route-modules/vlm.ts",
};
const VERIFIER_PATH =
  "lib/worldclass/pass36-a88r2-behavioral-verifier.ts";
const HANDLER_DIGESTS = Object.fromEntries(
  Object.entries(HANDLER_PATHS).map(([handler, sourcePath]) => [
    handler,
    sha256A88R2(fs.readFileSync(sourcePath)),
  ]),
) as Record<A88R2Handler, string>;
const VERIFIER_DIGEST = sha256A88R2(fs.readFileSync(VERIFIER_PATH));

const SAFE_MARKET_RESULT: TokenRiskResult = {
  token: {
    marketId: "test-asset",
    symbol: "TST",
    name: "Test asset",
    assetClass: "crypto",
  },
  score: 0,
  level: "low",
  badge: "low_detected_risk",
  signals: [],
  metrics: {},
  dataQuality: "partial",
  dataSources: ["a88r2-local-test-provider"],
};

const ALLOWED_ACCESS = {
  ok: true,
  depth: "basic",
  paidRequired: false,
  accessMode: "free_basic",
  policy: {},
  context: {},
  reason: "basic_is_free",
} as const;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    return `{${Object.keys(row)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(row[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function makeTrace() {
  const trace: VlmBehavioralTraceEvent[] = [];
  const sink: VlmBehavioralTraceSink = (event) => {
    trace.push({ sequence: trace.length + 1, ...event });
  };
  return { trace, sink };
}

function sanitizedRequestEvidence(
  request: Request,
  suppliedBody: unknown,
): string {
  const url = new URL(request.url);
  return canonical({
    method: request.method,
    origin: url.origin,
    pathname: url.pathname,
    canonicalQuery: [...url.searchParams.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    ),
    contentType: request.headers.get("content-type") ?? "",
    suppliedBody,
  });
}

async function responseEvidence(response: Response): Promise<Buffer> {
  const body = Buffer.from(await response.clone().arrayBuffer());
  return Buffer.concat([
    Buffer.from(
      canonical({
        status: response.status,
        contentType: response.headers.get("content-type") ?? "",
      }),
    ),
    Buffer.from([0]),
    body,
  ]);
}

function noSecurityWrite() {
  return undefined;
}

function makeDependencySpies(): A88R2DependencySpies {
  return {
    securityTelemetry: 0,
    rateLimit: 0,
    access: 0,
    marketProvider: 0,
    model: 0,
    tool: 0,
    durable: 0,
  };
}

function forbiddenDependency(
  spies: A88R2DependencySpies,
  key: "model" | "tool" | "durable",
) {
  return (..._args: unknown[]) => {
    spies[key] += 1;
    throw new Error(`a88r2_unexpected_${key}_dependency`);
  };
}

function brainDependencies(
  trace: VlmBehavioralTraceSink,
  spies: A88R2DependencySpies,
): BrainExecutionDependencies {
  return {
    trace,
    recordSecurityInspection: (() => {
      spies.securityTelemetry += 1;
      return noSecurityWrite();
    }) as NonNullable<
      BrainExecutionDependencies["recordSecurityInspection"]
    >,
    resolveAccess: (async () => {
      spies.access += 1;
      return ALLOWED_ACCESS as never;
    }) as NonNullable<
      BrainExecutionDependencies["resolveAccess"]
    >,
    recordResult: forbiddenDependency(spies, "durable") as NonNullable<
      BrainExecutionDependencies["recordResult"]
    >,
    persistSnapshots: forbiddenDependency(spies, "durable") as NonNullable<
      BrainExecutionDependencies["persistSnapshots"]
    >,
    readHistory: forbiddenDependency(spies, "durable") as NonNullable<
      BrainExecutionDependencies["readHistory"]
    >,
    buildDefiLlama: forbiddenDependency(spies, "tool") as NonNullable<
      BrainExecutionDependencies["buildDefiLlama"]
    >,
    analyzeKernel: forbiddenDependency(spies, "tool") as NonNullable<
      BrainExecutionDependencies["analyzeKernel"]
    >,
    generateAnalysis: forbiddenDependency(spies, "model") as NonNullable<
      BrainExecutionDependencies["generateAnalysis"]
    >,
    buildEvidencePacket: forbiddenDependency(spies, "tool") as NonNullable<
      BrainExecutionDependencies["buildEvidencePacket"]
    >,
  };
}

function angelDependencies(
  trace: VlmBehavioralTraceSink,
  spies: A88R2DependencySpies,
): AngelExecutionDependencies {
  return {
    trace,
    recordSecurityInspection: (() => {
      spies.securityTelemetry += 1;
      return noSecurityWrite();
    }) as NonNullable<
      AngelExecutionDependencies["recordSecurityInspection"]
    >,
    resolveAccess: (async () => {
      spies.access += 1;
      return ALLOWED_ACCESS as never;
    }) as NonNullable<
      AngelExecutionDependencies["resolveAccess"]
    >,
    readHistory: forbiddenDependency(spies, "durable") as NonNullable<
      AngelExecutionDependencies["readHistory"]
    >,
    generateAnalysis: forbiddenDependency(spies, "model") as NonNullable<
      AngelExecutionDependencies["generateAnalysis"]
    >,
    buildEvidencePacket: forbiddenDependency(spies, "tool") as NonNullable<
      AngelExecutionDependencies["buildEvidencePacket"]
    >,
  };
}

function riskDependencies(
  trace: VlmBehavioralTraceSink,
  spies: A88R2DependencySpies,
): VlmRiskExecutionDependencies {
  return {
    trace,
    recordSecurityInspection: (() => {
      spies.securityTelemetry += 1;
      return noSecurityWrite();
    }) as NonNullable<
      VlmRiskExecutionDependencies["recordSecurityInspection"]
    >,
    applyRateLimit: (async () => {
      spies.rateLimit += 1;
      return ({
        ok: true,
        remaining: 999,
        resetAt: Date.now() + 60_000,
        decision: {},
        headers: {},
      }) as never;
    }) as NonNullable<
      VlmRiskExecutionDependencies["applyRateLimit"]
    >,
    requireTierAccess: (async () => {
      spies.access += 1;
      return ({
        response: new Response(
          JSON.stringify({ ok: false, mode: "payment_required" }),
          {
            status: 402,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "no-store",
            },
          },
        ),
        access: {},
      }) as never;
    }) as NonNullable<
      VlmRiskExecutionDependencies["requireTierAccess"]
    >,
    resolveAccount: forbiddenDependency(spies, "durable") as NonNullable<
      VlmRiskExecutionDependencies["resolveAccount"]
    >,
    runDurableComputation: forbiddenDependency(
      spies,
      "durable",
    ) as NonNullable<VlmRiskExecutionDependencies["runDurableComputation"]>,
    resolveRiskAnalysis: forbiddenDependency(spies, "model") as NonNullable<
      VlmRiskExecutionDependencies["resolveRiskAnalysis"]
    >,
  };
}

async function invokeHandler(
  handler: A88R2Handler,
  row: Pick<FocusedCase, "locale" | "prompt">,
  trace: VlmBehavioralTraceSink,
  spies: A88R2DependencySpies,
) {
  const url =
    handler === "brain"
      ? new URL("http://localhost/api/market-integrity/brain")
      : new URL(
          `http://localhost/api/market-integrity/${handler === "risk" ? "vlm" : handler}`,
        );
  const body = {
    query: "TST",
    prompt: row.prompt,
    locale: row.locale,
    depth: handler === "risk" ? "pro" : "basic",
  } as const;

  if (handler === "brain") {
    url.searchParams.set("query", body.query);
    url.searchParams.set("prompt", body.prompt);
    url.searchParams.set("locale", body.locale);
    url.searchParams.set("depth", body.depth);
    const request = new Request(url, { method: "GET" });
    const response = await executeBrainRequest(
      request,
      async () => {
        spies.marketProvider += 1;
        return structuredClone(SAFE_MARKET_RESULT);
      },
      brainDependencies(trace, spies),
    );
    return { request, suppliedBody: null, response };
  }

  const request = new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost",
    },
    body: JSON.stringify(body),
  });
  if (handler === "angel") {
    const response = await resolveAngelRequest(
      request,
      body,
      async () => {
        spies.marketProvider += 1;
        return structuredClone(SAFE_MARKET_RESULT);
      },
      angelDependencies(trace, spies),
    );
    return { request, suppliedBody: body, response };
  }

  const response = await executeVlmRiskPostRequest(
    request,
    riskDependencies(trace, spies),
  );
  return { request, suppliedBody: body, response };
}

function independentOracle(
  envelope: A88R2SignedEnvelope,
  context: A88R2VerificationContext,
) {
  const trace = Array.isArray(envelope.trace) ? envelope.trace : [];
  const stages = trace.map((event) => event.stage);
  const effectCount = (name: string) =>
    trace.filter((event) => event.effect === name).length;
  const envelopeKeys = [
    "caseId",
    "dependencySpies",
    "expectedDecision",
    "handler",
    "handlerSourceSha256",
    "integrity",
    "observedStatus",
    "promotion",
    "requestHmac",
    "requestId",
    "responseHmac",
    "revisionId",
    "schemaVersion",
    "trace",
    "traceSha256",
    "verifierSourceSha256",
  ].sort();
  const traceContract: Record<
    string,
    { effect: string | null; outcome: string }
  > = {
    handler_enter: { effect: null, outcome: "ENTER" },
    security_query_inspection: {
      effect: "security_telemetry",
      outcome: "CALLED",
    },
    security_prompt_inspection: {
      effect: "security_telemetry",
      outcome: "CALLED",
    },
    preflight_rejected: { effect: null, outcome: "REJECTED" },
    preflight_accepted: { effect: null, outcome: "RETURNED" },
    access: { effect: "access", outcome: "CALLED" },
    access_rejected: { effect: null, outcome: "REJECTED" },
    market_resolver: { effect: "market_provider", outcome: "CALLED" },
    publication_withheld: { effect: null, outcome: "REJECTED" },
  };
  const common =
    canonical(Object.keys(envelope).sort()) === canonical(envelopeKeys) &&
    canonical(Object.keys(envelope.integrity).sort()) ===
      canonical(["algorithm", "signature"].sort()) &&
    canonical(Object.keys(envelope.dependencySpies).sort()) ===
      canonical([
        "access",
        "durable",
        "marketProvider",
        "model",
        "rateLimit",
        "securityTelemetry",
        "tool",
      ].sort()) &&
    canonical(Object.keys(envelope.promotion).sort()) ===
      canonical(
        [
          "live",
          "productionApproved",
          "saleEnabled",
          "worldClassProven",
        ].sort(),
      ) &&
    envelope.schemaVersion === A88R2_SCHEMA &&
    envelope.revisionId === A88R2_REVISION &&
    /^[a-z0-9][a-z0-9._:-]{7,127}$/u.test(envelope.caseId) &&
    /^[a-f0-9]{32}$/u.test(envelope.requestId) &&
    envelope.handler === context.handler &&
    envelope.requestHmac === context.requestHmac &&
    envelope.responseHmac === context.responseHmac &&
    envelope.observedStatus === context.observedStatus &&
    envelope.handlerSourceSha256 === context.handlerSourceSha256 &&
    envelope.verifierSourceSha256 === context.verifierSourceSha256 &&
    canonical(envelope.dependencySpies) ===
      canonical(context.dependencySpies) &&
    envelope.dependencySpies.securityTelemetry ===
      effectCount("security_telemetry") &&
    envelope.traceSha256 === sha256A88R2(canonical(trace)) &&
    trace.every(
      (event, index) =>
        canonical(Object.keys(event).sort()) ===
          canonical(["effect", "outcome", "sequence", "stage"].sort()) &&
        event.sequence === index + 1 &&
        event.stage.length > 2 &&
        event.stage.length < 64 &&
        traceContract[event.stage]?.effect === event.effect &&
        traceContract[event.stage]?.outcome === event.outcome,
    ) &&
    new Set(stages).size === stages.length &&
    stages[0] === "handler_enter" &&
    envelope.promotion.live === false &&
    envelope.promotion.saleEnabled === false &&
    envelope.promotion.productionApproved === false &&
    envelope.promotion.worldClassProven === false;
  if (!common) return false;
  if (envelope.expectedDecision === "BLOCKED_PREFLIGHT") {
    const exactBlockedOrder =
      canonical(stages) ===
        canonical(["handler_enter", "preflight_rejected"]) ||
      canonical(stages) ===
        canonical([
          "handler_enter",
          "security_query_inspection",
          "security_prompt_inspection",
          "preflight_rejected",
        ]);
    return (
      [400, 422].includes(envelope.observedStatus) &&
      exactBlockedOrder &&
      stages.at(-1) === "preflight_rejected" &&
      !stages.includes("preflight_accepted") &&
      ["access", "market_provider", "model", "tool", "durable"].every(
        (effect) => effectCount(effect) === 0,
      ) &&
      envelope.dependencySpies.access === 0 &&
      envelope.dependencySpies.marketProvider === 0 &&
      envelope.dependencySpies.model === 0 &&
      envelope.dependencySpies.tool === 0 &&
      envelope.dependencySpies.durable === 0 &&
      envelope.dependencySpies.rateLimit ===
        (envelope.handler === "risk" ? 1 : 0)
    );
  }
  if (envelope.expectedDecision === "ALLOWED_WITHHELD_CONTROL") {
    return (
      envelope.handler !== "risk" &&
      envelope.observedStatus === 424 &&
      canonical(stages) ===
        canonical([
          "handler_enter",
          "security_query_inspection",
          "security_prompt_inspection",
          "preflight_accepted",
          "access",
          "market_resolver",
          "publication_withheld",
        ]) &&
      effectCount("access") === 1 &&
      effectCount("market_provider") === 1 &&
      ["model", "tool", "durable"].every(
        (effect) => effectCount(effect) === 0,
      ) &&
      envelope.dependencySpies.access === 1 &&
      envelope.dependencySpies.marketProvider === 1 &&
      envelope.dependencySpies.rateLimit === 0 &&
      envelope.dependencySpies.model === 0 &&
      envelope.dependencySpies.tool === 0 &&
      envelope.dependencySpies.durable === 0
    );
  }
  return (
    envelope.handler === "risk" &&
    envelope.observedStatus === 402 &&
    canonical(stages) ===
      canonical([
        "handler_enter",
        "security_query_inspection",
        "security_prompt_inspection",
        "preflight_accepted",
        "access",
        "access_rejected",
      ]) &&
    effectCount("access") === 1 &&
    ["market_provider", "model", "tool", "durable"].every(
      (effect) => effectCount(effect) === 0,
    ) &&
    envelope.dependencySpies.access === 1 &&
    envelope.dependencySpies.rateLimit === 1 &&
    envelope.dependencySpies.marketProvider === 0 &&
    envelope.dependencySpies.model === 0 &&
    envelope.dependencySpies.tool === 0 &&
    envelope.dependencySpies.durable === 0
  );
}

function reSignedMutants(
  baseline: A88R2SignedEnvelope,
): Array<{ family: string; value: A88R2SignedEnvelope }> {
  const { integrity: _integrity, ...baseCore } = baseline;
  const rows: Array<{ family: string; core: Record<string, unknown> }> = [];
  const add = (
    family: string,
    mutate: (core: Record<string, unknown>) => void,
  ) => {
    const core = structuredClone(baseCore) as unknown as Record<string, unknown>;
    mutate(core);
    rows.push({ family, core });
  };
  add("status_promotion", (core) => {
    core.observedStatus = 200;
  });
  add("request_rebinding", (core) => {
    core.requestHmac = "0".repeat(64);
  });
  add("response_rebinding", (core) => {
    core.responseHmac = "1".repeat(64);
  });
  add("handler_source_rebinding", (core) => {
    core.handlerSourceSha256 = "2".repeat(64);
  });
  add("verifier_source_rebinding", (core) => {
    core.verifierSourceSha256 = "3".repeat(64);
  });
  add("dependency_spy_forgery", (core) => {
    (core.dependencySpies as Record<string, unknown>).model = 1;
  });
  add("handler_shadowing", (core) => {
    core.handler = baseline.handler === "brain" ? "angel" : "brain";
  });
  add("decision_shadowing", (core) => {
    core.expectedDecision =
      baseline.expectedDecision === "BLOCKED_PREFLIGHT"
        ? "ALLOWED_WITHHELD_CONTROL"
        : "BLOCKED_PREFLIGHT";
  });
  add("live_promotion", (core) => {
    (core.promotion as Record<string, unknown>).live = true;
  });
  add("sale_promotion", (core) => {
    (core.promotion as Record<string, unknown>).saleEnabled = true;
  });
  add("production_promotion", (core) => {
    (core.promotion as Record<string, unknown>).productionApproved = true;
  });
  add("worldclass_promotion", (core) => {
    (core.promotion as Record<string, unknown>).worldClassProven = true;
  });
  add("trace_effect_injection", (core) => {
    const trace = core.trace as VlmBehavioralTraceEvent[];
    trace.push({
      sequence: trace.length + 1,
      stage: "model",
      effect: "model",
      outcome: "CALLED",
    });
    core.traceSha256 = sha256A88R2(canonical(trace));
  });
  add("trace_order_swap", (core) => {
    const trace = core.trace as VlmBehavioralTraceEvent[];
    if (trace.length > 2) {
      [trace[1], trace[2]] = [trace[2], trace[1]];
      trace.forEach((event, index) => {
        event.sequence = index + 1;
      });
    } else {
      trace.reverse();
      trace.forEach((event, index) => {
        event.sequence = index + 1;
      });
    }
    core.traceSha256 = sha256A88R2(canonical(trace));
  });
  add("trace_sequence_replay", (core) => {
    const trace = core.trace as VlmBehavioralTraceEvent[];
    trace[trace.length - 1].sequence = 1;
    core.traceSha256 = sha256A88R2(canonical(trace));
  });
  add("trace_outcome_mutation", (core) => {
    const trace = core.trace as VlmBehavioralTraceEvent[];
    trace[0].outcome = "RETURNED";
    core.traceSha256 = sha256A88R2(canonical(trace));
  });
  add("request_id_unicode", (core) => {
    core.requestId = "0000000000000000000000000000000о";
  });
  add("case_id_unicode", (core) => {
    core.caseId = "a88r2-cаse";
  });
  add("schema_drift", (core) => {
    core.schemaVersion = "velmere.pass36.a88r2.behavioral-handler-envelope.v4";
  });
  add("unknown_top_level_field", (core) => {
    core.shadowPass = true;
  });
  return rows.map(({ family, core }) => ({
    family,
    value: signA88R2Envelope(core as unknown as A88R2EnvelopeCore, KEY),
  }));
}

function expectedDecisionFor(
  handler: A88R2Handler,
  blocked: boolean,
): A88R2ExpectedDecision {
  if (blocked) return "BLOCKED_PREFLIGHT";
  return handler === "risk"
    ? "ALLOWED_ENTITLEMENT_CONTROL"
    : "ALLOWED_WITHHELD_CONTROL";
}

async function buildEnvelope(
  handler: A88R2Handler,
  row: Pick<FocusedCase, "caseId" | "locale" | "family" | "prompt">,
  blocked: boolean,
  sequence: number,
) {
  const { trace, sink } = makeTrace();
  const dependencySpies = makeDependencySpies();
  const execution = await invokeHandler(handler, row, sink, dependencySpies);
  const requestHmac = hmacA88R2(
    sanitizedRequestEvidence(execution.request, execution.suppliedBody),
    KEY,
  );
  const responseHmac = hmacA88R2(
    await responseEvidence(execution.response),
    KEY,
  );
  const core: A88R2EnvelopeCore = {
    schemaVersion: A88R2_SCHEMA,
    revisionId: A88R2_REVISION,
    caseId: `a88r2-${handler}-${row.locale}-${row.family}-${String(sequence).padStart(3, "0")}`,
    requestId: crypto.randomBytes(16).toString("hex"),
    handler,
    expectedDecision: expectedDecisionFor(handler, blocked),
    observedStatus: execution.response.status,
    requestHmac,
    responseHmac,
    handlerSourceSha256: HANDLER_DIGESTS[handler],
    verifierSourceSha256: VERIFIER_DIGEST,
    dependencySpies,
    trace,
    traceSha256: sha256A88R2(canonical(trace)),
    promotion: {
      live: false,
      saleEnabled: false,
      productionApproved: false,
      worldClassProven: false,
    },
  };
  const envelope = signA88R2Envelope(core, KEY);
  const context: A88R2VerificationContext = {
    handler,
    requestHmac,
    responseHmac,
    observedStatus: execution.response.status,
    handlerSourceSha256: HANDLER_DIGESTS[handler],
    verifierSourceSha256: VERIFIER_DIGEST,
    dependencySpies,
  };
  return { envelope, context, dependencySpies };
}

const allFocused = buildA88R1FocusedCases();
const blockedCases = allFocused.filter(
  (row) => row.expected !== "ALLOW_INFORMATIONAL_ANALYSIS",
);
const safeControl = allFocused.find(
  (row) =>
    row.locale === "en" &&
    row.expected === "ALLOW_INFORMATIONAL_ANALYSIS" &&
    row.family === "educational_probability_control",
);
if (!safeControl) throw new Error("a88r2_safe_control_missing");

let baselines = 0;
let baselineFailures = 0;
let independentOracleFailures = 0;
let mutationGenerated = 0;
let mutationKilled = 0;
let mutationSignatureFailures = 0;
const statusCounts: Record<string, number> = {};
const handlerCounts: Record<string, number> = {};
const familyCounts: Record<string, number> = {};
const mutantFamilyCounts: Record<string, { generated: number; killed: number }> =
  {};
const failureSamples: unknown[] = [];
const baselineEvidence: Array<{
  envelope: A88R2SignedEnvelope;
  context: A88R2VerificationContext;
}> = [];
const dependencySpyTotals = makeDependencySpies();
function retainBaseline(
  envelope: A88R2SignedEnvelope,
  context: A88R2VerificationContext,
) {
  baselineEvidence.push({ envelope, context });
  for (const key of Object.keys(dependencySpyTotals) as Array<
    keyof A88R2DependencySpies
  >) {
    dependencySpyTotals[key] += context.dependencySpies[key];
  }
}

for (const handler of ["brain", "angel", "risk"] as A88R2Handler[]) {
  let sequence = 0;
  for (const row of blockedCases) {
    sequence += 1;
    const { envelope, context } = await buildEnvelope(
      handler,
      row,
      true,
      sequence,
    );
    retainBaseline(envelope, context);
    baselines += 1;
    handlerCounts[handler] = (handlerCounts[handler] ?? 0) + 1;
    familyCounts[row.family] = (familyCounts[row.family] ?? 0) + 1;
    statusCounts[String(envelope.observedStatus)] =
      (statusCounts[String(envelope.observedStatus)] ?? 0) + 1;
    const verified = verifyA88R2Envelope(envelope, KEY, context);
    if (!verified.passed) {
      baselineFailures += 1;
      if (failureSamples.length < 10) {
        failureSamples.push({
          caseId: envelope.caseId,
          status: envelope.observedStatus,
          trace: envelope.trace,
          failures: verified.failures,
        });
      }
    }
    if (!independentOracle(envelope, context)) {
      independentOracleFailures += 1;
    }
    for (const mutant of reSignedMutants(envelope)) {
      mutationGenerated += 1;
      const result = verifyA88R2Envelope(mutant.value, KEY, context);
      const signatureStillValid = !result.failures.includes("signature_invalid");
      if (!signatureStillValid) mutationSignatureFailures += 1;
      const independentRejected = !independentOracle(mutant.value, context);
      const killed = !result.passed && signatureStillValid && independentRejected;
      if (killed) mutationKilled += 1;
      const stats =
        mutantFamilyCounts[mutant.family] ??
        (mutantFamilyCounts[mutant.family] = { generated: 0, killed: 0 });
      stats.generated += 1;
      if (killed) stats.killed += 1;
    }
  }

  for (const locale of ["pl", "en", "de"] as const) {
    sequence += 1;
    const row = { ...safeControl, locale };
    const { envelope, context } = await buildEnvelope(
      handler,
      row,
      false,
      sequence,
    );
    retainBaseline(envelope, context);
    baselines += 1;
    handlerCounts[handler] = (handlerCounts[handler] ?? 0) + 1;
    familyCounts.allowed_control =
      (familyCounts.allowed_control ?? 0) + 1;
    statusCounts[String(envelope.observedStatus)] =
      (statusCounts[String(envelope.observedStatus)] ?? 0) + 1;
    const verified = verifyA88R2Envelope(envelope, KEY, context);
    if (!verified.passed) {
      baselineFailures += 1;
      if (failureSamples.length < 10) {
        failureSamples.push({
          caseId: envelope.caseId,
          status: envelope.observedStatus,
          trace: envelope.trace,
          failures: verified.failures,
        });
      }
    }
    if (!independentOracle(envelope, context)) {
      independentOracleFailures += 1;
    }
    for (const mutant of reSignedMutants(envelope)) {
      mutationGenerated += 1;
      const result = verifyA88R2Envelope(mutant.value, KEY, context);
      const signatureStillValid = !result.failures.includes("signature_invalid");
      if (!signatureStillValid) mutationSignatureFailures += 1;
      const independentRejected = !independentOracle(mutant.value, context);
      const killed = !result.passed && signatureStillValid && independentRejected;
      if (killed) mutationKilled += 1;
      const stats =
        mutantFamilyCounts[mutant.family] ??
        (mutantFamilyCounts[mutant.family] = { generated: 0, killed: 0 });
      stats.generated += 1;
      if (killed) stats.killed += 1;
    }
  }
}

const passed =
  baselines === blockedCases.length * 3 + 9 &&
  baselineFailures === 0 &&
  independentOracleFailures === 0 &&
  mutationGenerated > 0 &&
  mutationKilled === mutationGenerated &&
  mutationSignatureFailures === 0;

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const localTestKeyPath = path.join(
  OUTPUT_DIR,
  "LOCAL_TEST_ONLY_A88R2_HMAC_KEY.hex",
);
const baselineEvidencePath = path.join(
  OUTPUT_DIR,
  "PASS36_A88R2_SANITIZED_SIGNED_BASELINES.json",
);
fs.writeFileSync(localTestKeyPath, `${KEY.toString("hex")}\n`, {
  mode: 0o600,
});
fs.writeFileSync(
  baselineEvidencePath,
  `${JSON.stringify({
    schemaVersion: "velmere.pass36.a88r2.sanitized-signed-baselines.v1",
    revisionId: A88R2_REVISION,
    rows: baselineEvidence,
  }, null, 2)}\n`,
);
const supportBindings = {
  localTestKeySha256: sha256A88R2(fs.readFileSync(localTestKeyPath)),
  baselineEvidenceSha256: sha256A88R2(
    fs.readFileSync(baselineEvidencePath),
  ),
  baselineEvidenceRows: baselineEvidence.length,
  authenticityCredit: false,
  purpose:
    "Self-contained local reproducibility only; the co-located test key is not an independent trust anchor.",
};

const receipt = {
  schemaVersion: "velmere.pass36.a88r2.behavioral-handler-receipt.v1",
  revisionId: A88R2_REVISION,
  parentRevisionId:
    "VELMERE_PASS36_A88R1_SEMANTIC_GENERALIZATION_ROUTE_EXECUTION_PRIVACY_AND_PDF_EVIDENCE_RETENTION",
  generatedAt: new Date().toISOString(),
  status: passed
    ? "PASS_A88R2_LOCAL_ACTUAL_HANDLER_RESIGNED_SEMANTIC_MUTATIONS_NO_PROMOTION"
    : "FAIL_A88R2_LOCAL_ACTUAL_HANDLER_RESIGNED_SEMANTIC_MUTATIONS",
  denominator: {
    blockedFocusedCasesPerHandler: blockedCases.length,
    blockedActualHandlerExecutions: blockedCases.length * 3,
    allowedControls: 9,
    actualHandlerExecutions: baselines,
    adversarialBehavioralHandlerExecutions: blockedCases.length * 3,
    reSignedSemanticMutations: mutationGenerated,
  },
  observed: {
    baselineFailures,
    independentOracleFailures,
    reSignedSemanticMutationsKilled: mutationKilled,
    mutationSignatureFailures,
    statusCounts,
    handlerCounts,
    familyCounts,
    mutantFamilyCounts,
    dependencySpyTotals,
  },
  bindings: {
    handlerSourceSha256: HANDLER_DIGESTS,
    verifierSourceSha256: VERIFIER_DIGEST,
    requestBinding: "per-run ephemeral HMAC-SHA256 over method, origin, path, canonical query, content type and supplied body",
    responseBinding: "per-run ephemeral HMAC-SHA256 over status, content type and actual response bytes",
    traceBinding: "ordered exact stage/effect/outcome trace with SHA-256 and HMAC envelope binding",
    stablePublicPromptFingerprintPublished: false,
    hmacKeyPersisted: false,
    rawPromptsPersisted: false,
    rawRequestBodiesPersisted: false,
    supportBindings,
  },
  oracle: {
    implementation: "LOCAL_INDEPENDENT_IMPLEMENTATION",
    externalIndependentAssurance: false,
    description:
      "A separate local oracle independently recomputes request/response/source bindings, ordered trace effects, status and no-promotion invariants.",
  },
  executionTruth: {
    actualProductionInnerHandlerFunctions: [
      "executeBrainRequest",
      "resolveAngelRequest",
      "executeVlmRiskPostRequest",
    ],
    actualExternalProviderCalls: 0,
    actualModelCalls: 0,
    actualCustomerCases: 0,
    rightsApprovedRealCases: 0,
    publicRouteDispatcherExecutions: 0,
    syntheticLocalBehavioralCases: baselines,
    live: false,
    saleEnabled: false,
    productionApproved: false,
    worldClassProven: false,
  },
  failureSamples,
  truthBoundary:
    "This receipt proves local execution of the actual Brain, Angel and VLM Risk inner handler functions with independent injected dependency counters for security telemetry, rate limit, access, market provider, model, tool and durable effects; adversarial request behavior; response/source binding; a separate local oracle; and re-signed semantic mutation rejection. It does not prove public route-dispatch wrappers, real model quality, real provider execution, real customer utility, independent authenticity or assurance, staging, LIVE or sale readiness.",
};

const outputPath = path.join(
  OUTPUT_DIR,
  "PASS36_A88R2_BEHAVIORAL_HANDLER_MUTATION_RECEIPT.json",
);
fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
process.stdout.write(
  `${JSON.stringify({
    status: receipt.status,
    outputPath,
    denominator: receipt.denominator,
    observed: {
      baselineFailures,
      independentOracleFailures,
      reSignedSemanticMutationsKilled: mutationKilled,
      mutationSignatureFailures,
    },
  })}\n`,
);
if (!passed) process.exitCode = 1;
