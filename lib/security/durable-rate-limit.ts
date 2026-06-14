import {
  buildPass632FixedWindow,
  buildPass632RateLimitHeaders,
  buildPass632RecoveryDelay,
} from "@/lib/security/pass632-production-rate-limit-adapter";

export type DurableRateLimitMode = "memory" | "upstash_rest" | "upstash_fallback_memory" | "disabled";
// PASS183 compatibility marker: upstash_ready was upgraded to upstash_rest in PASS184.
export type DurableRateLimitDecision = {
  ok: boolean;
  mode: DurableRateLimitMode;
  remaining: number;
  resetAt: number;
  limit: number;
  windowMs: number;
  fixedWindowId: number;
  boundaryKey: string;
  degraded: boolean;
  reason?: string;
  retryAfterSeconds?: number;
  provider?: "memory" | "upstash";
  providerError?: string;
};

export type DurableRateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
  namespace?: string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const memoryBuckets = new Map<string, Bucket>();
let upstashConsecutiveFailures = 0;
let upstashCooldownUntil = 0;
let upstashProbeLockUntil = 0;

function nowMs() {
  return Date.now();
}

function normalizeKey(value: string) {
  return value
    .replace(/[^a-zA-Z0-9:_@.-]/g, "_")
    .slice(0, 240);
}

function resolveMode(): DurableRateLimitMode {
  if (process.env.VELMERE_RATE_LIMIT_DISABLED === "1") return "disabled";
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) return "upstash_rest";
  return "memory";
}

function normalizedOptions(options: DurableRateLimitOptions) {
  const limit = Math.max(1, Math.round(options.limit));
  const windowMs = Math.max(1_000, Math.round(options.windowMs));
  const baseKey = normalizeKey(`${options.namespace ?? "velmere"}:${options.key}`);
  const fixedWindow = buildPass632FixedWindow({ key: baseKey, windowMs });
  return { limit, windowMs, baseKey, fixedWindow };
}

function memoryDecision(
  options: DurableRateLimitOptions,
  mode: DurableRateLimitMode,
  providerError?: string,
): DurableRateLimitDecision {
  const normalized = normalizedOptions(options);
  const key = normalized.fixedWindow.bucketKey;
  const now = nowMs();
  const existing = memoryBuckets.get(key);
  const degraded = mode === "upstash_fallback_memory";

  if (!existing || existing.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: normalized.fixedWindow.resetAt });
    return {
      ok: true,
      mode,
      provider: "memory",
      remaining: normalized.limit - 1,
      resetAt: normalized.fixedWindow.resetAt,
      limit: normalized.limit,
      windowMs: normalized.windowMs,
      fixedWindowId: normalized.fixedWindow.windowId,
      boundaryKey: normalized.baseKey,
      degraded,
      providerError,
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, normalized.limit - existing.count);
  if (existing.count > normalized.limit) {
    return {
      ok: false,
      mode,
      provider: "memory",
      remaining: 0,
      resetAt: existing.resetAt,
      limit: normalized.limit,
      windowMs: normalized.windowMs,
      fixedWindowId: normalized.fixedWindow.windowId,
      boundaryKey: normalized.baseKey,
      degraded,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      reason: "rate_limit_exceeded",
      providerError,
    };
  }

  return {
    ok: true,
    mode,
    provider: "memory",
    remaining,
    resetAt: existing.resetAt,
    limit: normalized.limit,
    windowMs: normalized.windowMs,
    fixedWindowId: normalized.fixedWindow.windowId,
    boundaryKey: normalized.baseKey,
    degraded,
    providerError,
  };
}

function registerUpstashFailure(key: string) {
  upstashConsecutiveFailures = Math.min(8, upstashConsecutiveFailures + 1);
  upstashCooldownUntil = nowMs() + buildPass632RecoveryDelay({
    key,
    consecutiveFailures: upstashConsecutiveFailures,
    baseDelayMs: 1_000,
    maxDelayMs: 30_000,
  });
  upstashProbeLockUntil = 0;
}

function registerUpstashSuccess() {
  upstashConsecutiveFailures = 0;
  upstashCooldownUntil = 0;
  upstashProbeLockUntil = 0;
}

async function upstashRestDecision(options: DurableRateLimitOptions): Promise<DurableRateLimitDecision> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return memoryDecision(options, "memory");

  const normalized = normalizedOptions(options);
  const now = nowMs();
  if (now < upstashCooldownUntil) {
    return memoryDecision(options, "upstash_fallback_memory", "upstash_recovery_cooldown");
  }
  if (now < upstashProbeLockUntil) {
    return memoryDecision(options, "upstash_fallback_memory", "upstash_single_probe_in_flight");
  }

  const windowSeconds = Math.max(1, Math.ceil(normalized.windowMs / 1000));
  const retentionSeconds = windowSeconds + 30;
  const key = normalized.fixedWindow.bucketKey;
  upstashProbeLockUntil = now + 2_500;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2_200);
    const response = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(retentionSeconds)],
      ]),
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      registerUpstashFailure(key);
      return memoryDecision(options, "upstash_fallback_memory", `upstash_http_${response.status}`);
    }

    const payload = await response.json() as Array<{ result?: number | string; error?: string }>;
    const count = Number(payload?.[0]?.result ?? 1);
    if (!Number.isFinite(count) || payload?.some((entry) => entry?.error)) {
      registerUpstashFailure(key);
      return memoryDecision(options, "upstash_fallback_memory", "upstash_invalid_pipeline_result");
    }

    registerUpstashSuccess();
    const remaining = Math.max(0, normalized.limit - count);
    if (count > normalized.limit) {
      return {
        ok: false,
        mode: "upstash_rest",
        provider: "upstash",
        remaining: 0,
        resetAt: normalized.fixedWindow.resetAt,
        limit: normalized.limit,
        windowMs: normalized.windowMs,
        fixedWindowId: normalized.fixedWindow.windowId,
        boundaryKey: normalized.baseKey,
        degraded: false,
        retryAfterSeconds: Math.max(1, Math.ceil((normalized.fixedWindow.resetAt - now) / 1000)),
        reason: "rate_limit_exceeded",
      };
    }

    return {
      ok: true,
      mode: "upstash_rest",
      provider: "upstash",
      remaining,
      resetAt: normalized.fixedWindow.resetAt,
      limit: normalized.limit,
      windowMs: normalized.windowMs,
      fixedWindowId: normalized.fixedWindow.windowId,
      boundaryKey: normalized.baseKey,
      degraded: false,
    };
  } catch (error) {
    registerUpstashFailure(key);
    return memoryDecision(
      options,
      "upstash_fallback_memory",
      error instanceof Error ? error.message.slice(0, 120) : "upstash_unknown_error",
    );
  }
}

export async function applyDurableRateLimit(options: DurableRateLimitOptions): Promise<DurableRateLimitDecision> {
  const mode = resolveMode();
  const normalized = normalizedOptions(options);

  if (mode === "disabled") {
    return {
      ok: true,
      mode,
      remaining: Math.max(0, normalized.limit - 1),
      resetAt: normalized.fixedWindow.resetAt,
      limit: normalized.limit,
      windowMs: normalized.windowMs,
      fixedWindowId: normalized.fixedWindow.windowId,
      boundaryKey: normalized.baseKey,
      degraded: false,
    };
  }

  if (mode === "upstash_rest") return upstashRestDecision(options);
  return memoryDecision(options, "memory");
}

export function buildDurableRateLimitHeaders(decision: DurableRateLimitDecision) {
  return buildPass632RateLimitHeaders({
    limit: decision.limit,
    remaining: decision.remaining,
    resetAt: decision.resetAt,
    retryAfterSeconds: decision.ok ? undefined : decision.retryAfterSeconds,
    mode: decision.mode,
    degraded: decision.degraded,
  });
}

export function buildDurableRateLimitReadiness() {
  const mode = resolveMode();
  return {
    schemaVersion: "velmere-durable-rate-limit-readiness-v3-pass632",
    mode,
    hasUpstashUrl: Boolean(process.env.UPSTASH_REDIS_REST_URL),
    hasUpstashToken: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
    memoryFallback: mode !== "disabled",
    upstashRestAdapter: "implemented",
    fixedWindowBuckets: true,
    retryAfterHeaders: true,
    recoveryCooldown: true,
    singleRecoveryProbe: true,
    consecutiveProviderFailures: upstashConsecutiveFailures,
    providerCooldownUntil: upstashCooldownUntil ? new Date(upstashCooldownUntil).toISOString() : null,
    fallbackMode: "upstash_fallback_memory",
    productionBoundary:
      "PASS632 uses hashed route/provider/user/client boundaries, fixed-window buckets, explicit Retry-After metadata and a single recovery probe. Platform/WAF limits remain an additional production layer.",
  };
}
