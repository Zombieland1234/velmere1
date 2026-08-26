import fs from "node:fs";
import crypto from "node:crypto";

const root = process.argv[2];
if (!root) throw new Error("work_root_required");
const target = `${root}/lib/jobs/durable-computation-replay.ts`;
const expectedBefore = "7b4a96c90541ddf82bdaeec58bf2bdf25781fc70bf5fad297633db44f11427cc";
const expectedAfter = "b8027f3427029bc73fbefb92116262c5b9951df780f881b5c813b11834e8a23e";
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
function replaceOnce(text, oldValue, newValue, label) {
  const count = text.split(oldValue).length - 1;
  if (count !== 1) throw new Error(`${label}_anchor_count_${count}`);
  return text.replace(oldValue, newValue);
}

let text = fs.readFileSync(target, "utf8");
if (sha(Buffer.from(text)) !== expectedBefore) throw new Error("durable_computation_current_source_sha_mismatch");
text = replaceOnce(
  text,
  `import { hasSupabaseServiceRoleConfig } from "@/lib/db/supabase";`,
  `import { extractSupabaseUserAccessToken, hasSupabaseServiceRoleConfig } from "@/lib/db/supabase";`,
  "durable_import",
);

const rpcAnchor = `function parseRpcRow(data: unknown): Record<string, unknown> | null {\n  if (Array.isArray(data)) {\n    const first = data[0];\n    return first && typeof first === "object" ? first as Record<string, unknown> : null;\n  }\n  return data && typeof data === "object" ? data as Record<string, unknown> : null;\n}\n`;
const bridgeHelpers = `

type BrowserDurableComputationBridgeContext = Readonly<{
  url: URL;
  userAccessToken: string;
  serverCapability: string;
  accountId: string;
  requestId: string;
}>;

function resolveBrowserDurableComputationBridge(args: {
  kind: DurableComputationKind;
  request: Request;
  requestId?: string | null;
  subjectBinding?: DurableComputationSubjectBinding | null;
  workerPayload?: unknown;
  env: Record<string, string | undefined>;
}): BrowserDurableComputationBridgeContext | null {
  if (args.kind !== "lens_pdf_render" || args.workerPayload !== undefined) return null;
  if (args.subjectBinding?.kind !== "account") return null;
  const accountId = args.subjectBinding.value.trim();
  const requestId = String(args.requestId ?? args.request.headers.get("x-velmere-request-id") ?? "").trim();
  const userAccessToken = extractSupabaseUserAccessToken(args.request)?.token ?? "";
  const serverCapability = String(args.env.VELMERE_BROWSER_SERVER_CAPABILITY ?? "").trim();
  const rawUrl = String(args.env.VELMERE_DURABLE_COMPUTATION_BRIDGE_URL ?? "").trim();
  if (!accountId || !requestId || !userAccessToken || serverCapability.length < 48 || !rawUrl) return null;
  let url: URL;
  try { url = new URL(rawUrl); } catch { return null; }
  if (
    url.protocol !== "https:" ||
    !url.hostname.endsWith(".supabase.co") ||
    url.pathname !== "/functions/v1/r7-browser-durable-computation-bridge" ||
    url.search ||
    url.hash
  ) return null;
  return { url, userAccessToken, serverCapability, accountId, requestId };
}

async function callBrowserDurableComputationBridge(args: {
  bridge: BrowserDurableComputationBridgeContext;
  action: "claim" | "complete" | "fail";
  body: Record<string, unknown>;
}) {
  let response: Response;
  try {
    response = await fetch(args.bridge.url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${args.bridge.userAccessToken}`,
        "x-velmere-browser-server-capability": args.bridge.serverCapability,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        schemaVersion: "velmere.r7.browser-durable-computation-bridge-request.v1",
        action: args.action,
        accountId: args.bridge.accountId,
        kind: "lens_pdf_render",
        requestId: args.bridge.requestId,
        ...args.body,
      }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return null;
  }
  let envelope: Record<string, unknown>;
  try {
    envelope = parseStrictJsonText<Record<string, unknown>>(await response.text(), {
      maxBytes: 3_700_000,
      maxDepth: 24,
      maxNodes: 40_000,
      requireObject: true,
    });
  } catch {
    return null;
  }
  if (
    !response.ok ||
    envelope.ok !== true ||
    envelope.schemaVersion !== "velmere.r7.browser-durable-computation-bridge-response.v1" ||
    envelope.action !== args.action ||
    envelope.accountBound !== true ||
    envelope.serviceRoleInternalOnly !== true ||
    envelope.rawSecretsReturned !== false ||
    !envelope.data ||
    typeof envelope.data !== "object" ||
    Array.isArray(envelope.data)
  ) return null;
  return envelope.data as Record<string, unknown>;
}

async function claimBrowserDurableComputationBridge(args: {
  jobId: string;
  inputHash: string;
  subjectHash: string;
  maxAttempts: number;
  leaseSeconds: number;
  sealedPayload?: DurableComputationSealedPayload | null;
  bridge: BrowserDurableComputationBridgeContext;
}) {
  if (args.sealedPayload) return { state: "store_failed" as const };
  const data = await callBrowserDurableComputationBridge({
    bridge: args.bridge,
    action: "claim",
    body: {
      jobId: args.jobId,
      inputHash: args.inputHash,
      subjectHash: args.subjectHash,
      maxAttempts: args.maxAttempts,
      leaseSeconds: args.leaseSeconds,
      sealedPayload: null,
    },
  });
  if (!data) return { state: "store_failed" as const };
  const state = String(data.state ?? "store_failed");
  if (state === "claimed") {
    const leaseToken = typeof data.leaseToken === "string" ? data.leaseToken : "";
    return leaseToken.length >= 24
      ? { state: "claimed" as const, leaseToken, attemptCount: Number(data.attemptCount ?? 1) }
      : { state: "store_failed" as const };
  }
  if (state === "completed") {
    const result = data.resultPayload && typeof data.resultPayload === "object" && !Array.isArray(data.resultPayload)
      ? data.resultPayload as StoredResult
      : null;
    return result
      ? { state: "completed" as const, result, attemptCount: Number(data.attemptCount ?? 1) }
      : { state: "store_failed" as const };
  }
  if (state === "in_progress") return { state: "in_progress" as const, attemptCount: Number(data.attemptCount ?? 1) };
  if (state === "retry_wait") return { state: "retry_wait" as const, attemptCount: Number(data.attemptCount ?? 1), retryAfterMs: Number(data.retryAfterMs ?? 1000) };
  if (state === "dead_letter") return { state: "dead_letter" as const, attemptCount: Number(data.attemptCount ?? args.maxAttempts) };
  if (state === "conflict") return { state: "conflict" as const };
  return { state: "store_failed" as const };
}
`;
text = replaceOnce(text, rpcAnchor, rpcAnchor + bridgeHelpers, "durable_bridge_helpers");

const storeStart = text.indexOf("async function claimStore(args: {");
const storeEnd = text.indexOf("\nexport class DurableComputationError", storeStart);
if (storeStart < 0 || storeEnd < 0) throw new Error("durable_store_block_anchor_missing");
const storeBlock = `async function claimStore(args: {
  jobId: string;
  kind: DurableComputationKind;
  inputHash: string;
  subjectHash: string;
  maxAttempts: number;
  leaseSeconds: number;
  nowMs: number;
  env: Record<string, string | undefined>;
  requireDurableStore: boolean;
  sealedPayload?: DurableComputationSealedPayload | null;
  bridge?: BrowserDurableComputationBridgeContext | null;
}) {
  if (!hasSupabaseServiceRoleConfig()) {
    if (args.bridge) return claimBrowserDurableComputationBridge({ ...args, bridge: args.bridge });
    if (productionLike(args.env)) {
      if (args.requireDurableStore) return { state: "store_required" as const };
      return { state: "direct" as const };
    }
    return claimMemory(args);
  }
  const leaseToken = randomBytes(24).toString("base64url");
  let data: unknown;
  try {
    ({ data } = await runRegisteredServiceRoleRpc({
      operation: "durable_computation_claim",
      args: {
        p_job_id: args.jobId,
        p_kind: args.kind,
        p_input_hash: args.inputHash,
        p_subject_hash: args.subjectHash,
        p_lease_token: leaseToken,
        p_lease_seconds: args.leaseSeconds,
        p_max_attempts: args.maxAttempts,
        p_sealed_payload: args.sealedPayload ?? null,
      },
    }));
  } catch {
    return { state: "store_failed" as const };
  }
  const row = parseRpcRow(data);
  const state = String(row?.state ?? "store_failed");
  if (state === "claimed") return { state: "claimed" as const, leaseToken, attemptCount: Number(row?.attempt_count ?? 1) };
  if (state === "completed") {
    const result = row?.result_payload && typeof row.result_payload === "object" ? row.result_payload as StoredResult : null;
    return result ? { state: "completed" as const, result, attemptCount: Number(row?.attempt_count ?? 1) } : { state: "store_failed" as const };
  }
  if (state === "in_progress") return { state: "in_progress" as const, attemptCount: Number(row?.attempt_count ?? 1) };
  if (state === "retry_wait") return { state: "retry_wait" as const, attemptCount: Number(row?.attempt_count ?? 1), retryAfterMs: Number(row?.retry_after_ms ?? 1000) };
  if (state === "dead_letter") return { state: "dead_letter" as const, attemptCount: Number(row?.attempt_count ?? args.maxAttempts) };
  if (state === "conflict") return { state: "conflict" as const };
  return { state: "store_failed" as const };
}

async function completeStore(args: {
  jobId: string;
  leaseToken: string;
  result: StoredResult;
  env: Record<string, string | undefined>;
  inputHash?: string;
  subjectHash?: string;
  bridge?: BrowserDurableComputationBridgeContext | null;
}) {
  if (!hasSupabaseServiceRoleConfig()) {
    if (args.bridge) {
      if (!args.inputHash || !args.subjectHash) return false;
      const data = await callBrowserDurableComputationBridge({
        bridge: args.bridge,
        action: "complete",
        body: {
          jobId: args.jobId,
          inputHash: args.inputHash,
          subjectHash: args.subjectHash,
          leaseToken: args.leaseToken,
          result: args.result,
        },
      });
      return String(data?.state ?? "store_failed") === "completed";
    }
    const row = memoryRows.get(args.jobId);
    if (!row || row.state !== "processing" || row.leaseTokenHash !== sha256Hex(args.leaseToken)) return false;
    memoryRows.set(args.jobId, { ...row, state: "completed", result: args.result, leaseTokenHash: null, leaseExpiresAtMs: null });
    return true;
  }
  try {
    const { data } = await runRegisteredServiceRoleRpc({
      operation: "durable_computation_complete",
      args: { p_job_id: args.jobId, p_lease_token: args.leaseToken, p_result_payload: args.result },
    });
    return String(parseRpcRow(data)?.state ?? data) === "completed";
  } catch {
    return false;
  }
}

async function failStore(args: {
  jobId: string;
  leaseToken: string;
  errorCode: string;
  retryAfterSeconds: number;
  env: Record<string, string | undefined>;
  inputHash?: string;
  subjectHash?: string;
  bridge?: BrowserDurableComputationBridgeContext | null;
}) {
  if (!hasSupabaseServiceRoleConfig()) {
    if (args.bridge) {
      if (!args.inputHash || !args.subjectHash) return "store_failed" as const;
      const data = await callBrowserDurableComputationBridge({
        bridge: args.bridge,
        action: "fail",
        body: {
          jobId: args.jobId,
          inputHash: args.inputHash,
          subjectHash: args.subjectHash,
          leaseToken: args.leaseToken,
          errorCode: boundedCode(args.errorCode),
          retryAfterSeconds: args.retryAfterSeconds,
        },
      });
      const state = String(data?.state ?? "store_failed");
      return state === "dead_letter" ? "dead_letter" as const : state === "retry_wait" ? "retry_wait" as const : "store_failed" as const;
    }
    const row = memoryRows.get(args.jobId);
    if (!row || row.state !== "processing" || row.leaseTokenHash !== sha256Hex(args.leaseToken)) return "store_failed" as const;
    const dead = row.attemptCount >= row.maxAttempts;
    memoryRows.set(args.jobId, {
      ...row,
      state: dead ? "dead_letter" : "retry_wait",
      leaseTokenHash: null,
      leaseExpiresAtMs: null,
      nextAttemptAtMs: dead ? null : Date.now() + args.retryAfterSeconds * 1000,
      lastErrorCode: args.errorCode,
    });
    return dead ? "dead_letter" as const : "retry_wait" as const;
  }
  try {
    const { data } = await runRegisteredServiceRoleRpc({
      operation: "durable_computation_fail",
      args: { p_job_id: args.jobId, p_lease_token: args.leaseToken, p_error_code: args.errorCode, p_retry_after_seconds: args.retryAfterSeconds },
    });
    const state = String(parseRpcRow(data)?.state ?? data);
    return state === "dead_letter" ? "dead_letter" as const : state === "retry_wait" ? "retry_wait" as const : "store_failed" as const;
  } catch {
    return "store_failed" as const;
  }
}
`;
text = text.slice(0, storeStart) + storeBlock + text.slice(storeEnd);

text = replaceOnce(
  text,
  `  const identity = buildDurableComputationIdentity(args);\n  const sealedPayload = args.workerPayload === undefined ? null : sealDurableComputationPayload({`,
  `  const identity = buildDurableComputationIdentity(args);\n  const bridge = resolveBrowserDurableComputationBridge({\n    kind: args.kind,\n    request: args.request,\n    requestId: args.requestId,\n    subjectBinding: args.subjectBinding,\n    workerPayload: args.workerPayload,\n    env,\n  });\n  const sealedPayload = args.workerPayload === undefined ? null : sealDurableComputationPayload({`,
  "durable_run_bridge",
);
text = replaceOnce(
  text,
  `    requireDurableStore: args.requireDurableStore ?? true,\n    sealedPayload,\n  });`,
  `    requireDurableStore: args.requireDurableStore ?? true,\n    sealedPayload,\n    bridge,\n  });`,
  "durable_claim_bridge",
);
text = replaceOnce(
  text,
  `    const completed = await completeStore({ jobId: identity.jobId, leaseToken: claim.leaseToken, result, env });`,
  `    const completed = await completeStore({\n      jobId: identity.jobId,\n      leaseToken: claim.leaseToken,\n      result,\n      env,\n      inputHash: identity.inputHash,\n      subjectHash: identity.subjectHash,\n      bridge,\n    });`,
  "durable_complete_bridge",
);
text = replaceOnce(
  text,
  `    await failStore({ jobId: identity.jobId, leaseToken: claim.leaseToken, errorCode: boundedCode(error), retryAfterSeconds, env });`,
  `    await failStore({\n      jobId: identity.jobId,\n      leaseToken: claim.leaseToken,\n      errorCode: boundedCode(error),\n      retryAfterSeconds,\n      env,\n      inputHash: identity.inputHash,\n      subjectHash: identity.subjectHash,\n      bridge,\n    });`,
  "durable_fail_bridge",
);
const modeOld = `(hasSupabaseServiceRoleConfig() ? "supabase" : "memory_non_production") as DurableComputationMode`;
const modeCount = text.split(modeOld).length - 1;
if (modeCount !== 2) throw new Error(`durable_mode_anchor_count_${modeCount}`);
text = text.split(modeOld).join(`(hasSupabaseServiceRoleConfig() || bridge ? "supabase" : "memory_non_production") as DurableComputationMode`);

if (sha(Buffer.from(text)) !== expectedAfter) throw new Error("durable_computation_candidate_sha_mismatch");
fs.writeFileSync(target, text, "utf8");
if (sha(fs.readFileSync(target)) !== expectedAfter) throw new Error("durable_computation_candidate_write_sha_mismatch");
console.log(JSON.stringify({
  status: "PASS_BROWSER_DURABLE_COMPUTATION_EDGE_BRIDGE_PATCH_APPLIED_CANDIDATE_ONLY",
  file: target,
  beforeSha256: expectedBefore,
  afterSha256: expectedAfter,
  currentSourceModified: false,
  customerFinalCredit: false,
}, null, 2));
