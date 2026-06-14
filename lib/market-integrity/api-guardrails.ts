export type GuardrailRoute =
  | "investigator"
  | "evidence-export"
  | "source-snapshots"
  | "market-integrity";

export type RateLimitResult = {
  ok: boolean;
  route: GuardrailRoute;
  key: string;
  limit: number;
  remaining: number;
  resetAt: string;
  retryAfterSeconds: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

type GuardrailStore = {
  buckets: Map<string, Bucket>;
};

const globalKey = "__velmereMarketIntegrityApiGuardrails";

type GlobalWithGuardrails = typeof globalThis & {
  [globalKey]?: GuardrailStore;
};

function getStore(): GuardrailStore {
  const g = globalThis as GlobalWithGuardrails;
  if (!g[globalKey]) g[globalKey] = { buckets: new Map() };
  return g[globalKey]!;
}

function nowMs() {
  return Date.now();
}

function routeLimit(route: GuardrailRoute) {
  if (route === "evidence-export") return { limit: 16, windowMs: 10 * 60 * 1000 };
  if (route === "investigator") return { limit: 30, windowMs: 10 * 60 * 1000 };
  if (route === "source-snapshots") return { limit: 60, windowMs: 10 * 60 * 1000 };
  return { limit: 90, windowMs: 10 * 60 * 1000 };
}

function headerValue(request: Request, name: string) {
  return request.headers.get(name) ?? request.headers.get(name.toLowerCase()) ?? "";
}

export function clientKeyFromRequest(request: Request, route: GuardrailRoute) {
  const forwarded = headerValue(request, "x-forwarded-for").split(",")[0]?.trim();
  const realIp = headerValue(request, "x-real-ip").trim();
  const userAgent = headerValue(request, "user-agent").slice(0, 90);
  return `${route}:${forwarded || realIp || "local"}:${userAgent || "unknown"}`;
}

export function checkRateLimit(request: Request, route: GuardrailRoute): RateLimitResult {
  const store = getStore();
  const key = clientKeyFromRequest(request, route);
  const { limit, windowMs } = routeLimit(route);
  const now = nowMs();
  const current = store.buckets.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    store.buckets.set(key, { count: 1, resetAt });
    return {
      ok: true,
      route,
      key,
      limit,
      remaining: limit - 1,
      resetAt: new Date(resetAt).toISOString(),
      retryAfterSeconds: 0,
    };
  }

  if (current.count >= limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return {
      ok: false,
      route,
      key,
      limit,
      remaining: 0,
      resetAt: new Date(current.resetAt).toISOString(),
      retryAfterSeconds,
    };
  }

  current.count += 1;
  store.buckets.set(key, current);
  return {
    ok: true,
    route,
    key,
    limit,
    remaining: Math.max(0, limit - current.count),
    resetAt: new Date(current.resetAt).toISOString(),
    retryAfterSeconds: 0,
  };
}

export function guardrailHeaders(rateLimit: RateLimitResult) {
  return {
    "cache-control": "no-store",
    "x-velmere-shield": "api-guarded",
    "x-ratelimit-limit": String(rateLimit.limit),
    "x-ratelimit-remaining": String(rateLimit.remaining),
    "x-ratelimit-reset": rateLimit.resetAt,
    ...(rateLimit.ok ? {} : { "retry-after": String(rateLimit.retryAfterSeconds) }),
  };
}

export function noStoreHeaders(extra: Record<string, string> = {}) {
  return {
    "cache-control": "no-store",
    "x-velmere-shield": "no-store",
    ...extra,
  };
}
