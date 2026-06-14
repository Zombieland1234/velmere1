import { createHash, timingSafeEqual } from "node:crypto";
import { securityJson } from "@/lib/security/api-guard";
import { recordSecurityAdminAudit } from "@/lib/security/security-admin-audit";

export type SecurityAdminScope =
  | "security:read"
  | "security:events"
  | "security:alerts"
  | "security:export"
  | "security:console";

export type SecurityAdminGateStatus = "ready" | "locked" | "not_configured" | "disabled";

export type SecurityAdminGateSnapshot = {
  schemaVersion: "velmere-security-admin-gate-v1";
  status: SecurityAdminGateStatus;
  consoleVisible: boolean;
  apiProtected: boolean;
  authHeaderNames: ["authorization", "x-velmere-security-admin-token"];
  requiredScopes: SecurityAdminScope[];
  configured: {
    tokenHash: boolean;
    tokenFallback: boolean;
    consoleEnabled: boolean;
    productionBypassDisabled: boolean;
  };
  missing: string[];
  productionBoundary: string;
};

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function safeEqualHex(a: string, b: string) {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

function safeEqualString(a: string, b: string) {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length || left.length === 0) return false;
  return timingSafeEqual(left, right);
}

function normalizeScopeList(value: string | undefined): SecurityAdminScope[] {
  const allowed = new Set<SecurityAdminScope>([
    "security:read",
    "security:events",
    "security:alerts",
    "security:export",
    "security:console",
  ]);
  return (value ?? "")
    .split(",")
    .map((scope) => scope.trim())
    .filter((scope): scope is SecurityAdminScope => allowed.has(scope as SecurityAdminScope));
}

function configuredScopes() {
  const scopes = normalizeScopeList(process.env.VELMERE_SECURITY_ADMIN_SCOPES);
  return scopes.length ? scopes : (["security:read", "security:events", "security:alerts", "security:export", "security:console"] satisfies SecurityAdminScope[]);
}

function extractProvidedToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice("bearer ".length).trim() : "";
  const headerToken = request.headers.get("x-velmere-security-admin-token")?.trim() ?? "";
  return bearer || headerToken;
}

export function getSecurityAdminGateSnapshot(requiredScopes: SecurityAdminScope[] = ["security:read"]): SecurityAdminGateSnapshot {
  const enabled = process.env.VELMERE_SECURITY_ADMIN_ENABLED === "true";
  const consoleEnabled = process.env.VELMERE_SECURITY_ADMIN_CONSOLE_ENABLED === "true";
  const tokenHash = Boolean(process.env.VELMERE_SECURITY_ADMIN_TOKEN_SHA256);
  const tokenFallback = Boolean(process.env.VELMERE_SECURITY_ADMIN_TOKEN);
  const bypassDisabled = process.env.NODE_ENV === "production" ? process.env.VELMERE_SECURITY_ADMIN_BYPASS !== "1" : true;
  const scopeSet = new Set(configuredScopes());
  const missing: string[] = [];

  if (!enabled) missing.push("VELMERE_SECURITY_ADMIN_ENABLED must be true");
  if (!tokenHash && !tokenFallback) missing.push("VELMERE_SECURITY_ADMIN_TOKEN_SHA256 or VELMERE_SECURITY_ADMIN_TOKEN must be configured");
  for (const scope of requiredScopes) {
    if (!scopeSet.has(scope)) missing.push(`missing scope ${scope}`);
  }

  const ready = enabled && (tokenHash || tokenFallback) && requiredScopes.every((scope) => scopeSet.has(scope));
  return {
    schemaVersion: "velmere-security-admin-gate-v1",
    status: ready ? "ready" : enabled ? "not_configured" : "locked",
    consoleVisible: ready && consoleEnabled,
    apiProtected: true,
    authHeaderNames: ["authorization", "x-velmere-security-admin-token"],
    requiredScopes,
    configured: {
      tokenHash,
      tokenFallback,
      consoleEnabled,
      productionBypassDisabled: bypassDisabled,
    },
    missing,
    productionBoundary:
      "Security admin gate is deny-by-default. API routes require a server-side token check; the public page remains locked unless console visibility is explicitly enabled.",
  };
}

export function verifySecurityAdminToken(request: Request, requiredScopes: SecurityAdminScope[] = ["security:read"]) {
  const snapshot = getSecurityAdminGateSnapshot(requiredScopes);
  if (snapshot.status !== "ready") {
    recordSecurityAdminAudit({
      request,
      scopes: requiredScopes,
      result: "not_configured",
      safeSummary: "Security admin request blocked because the admin gate is not configured.",
    });
    return {
      ok: false as const,
      snapshot,
      response: securityJson({
        ok: false,
        mode: "security_admin_gate_not_configured",
        gate: snapshot,
      }, { status: 503 }),
    };
  }

  const provided = extractProvidedToken(request);
  if (!provided) {
    recordSecurityAdminAudit({
      request,
      scopes: requiredScopes,
      result: "denied",
      safeSummary: "Security admin request denied because no token was provided.",
    });
    return {
      ok: false as const,
      snapshot,
      response: securityJson({
        ok: false,
        mode: "security_admin_token_required",
        requiredHeaders: snapshot.authHeaderNames,
        gate: { ...snapshot, configured: { ...snapshot.configured, tokenFallback: Boolean(snapshot.configured.tokenFallback) } },
      }, { status: 401 }),
    };
  }

  const expectedHash = process.env.VELMERE_SECURITY_ADMIN_TOKEN_SHA256?.trim().toLowerCase();
  const expectedPlain = process.env.VELMERE_SECURITY_ADMIN_TOKEN;
  const providedHash = sha256(provided);
  const hashOk = expectedHash ? safeEqualHex(providedHash, expectedHash) : false;
  const plainOk = expectedPlain ? safeEqualString(provided, expectedPlain) : false;

  if (!hashOk && !plainOk) {
    recordSecurityAdminAudit({
      request,
      scopes: requiredScopes,
      result: "denied",
      safeSummary: "Security admin request denied because token verification failed.",
    });
    return {
      ok: false as const,
      snapshot,
      response: securityJson({
        ok: false,
        mode: "security_admin_token_invalid",
      }, { status: 401 }),
    };
  }

  const operator = {
    id: "security-admin",
    scopes: requiredScopes,
    authMode: expectedHash ? "sha256" : "env-token",
  };
  recordSecurityAdminAudit({
    request,
    scopes: requiredScopes,
    result: "allowed",
    operatorId: operator.id,
    safeSummary: "Security admin request allowed by server-side token gate.",
  });

  return {
    ok: true as const,
    snapshot,
    operator,
  };
}

export function buildSecurityAdminGateReadiness() {
  return {
    ...getSecurityAdminGateSnapshot(["security:read", "security:events", "security:alerts", "security:export"]),
    nextCriticalStep:
      "Set VELMERE_SECURITY_ADMIN_ENABLED=true, configure VELMERE_SECURITY_ADMIN_TOKEN_SHA256, keep console disabled by default, and test authorized API calls on Vercel.",
  };
}
