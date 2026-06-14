import { createHmac, createHash, timingSafeEqual, randomBytes } from "node:crypto";
import {
  normalizePaidContext,
  type VlmPaidAccessContext,
  type VlmPaidProductId,
} from "@/lib/commerce/pass2024-vlm-paid-access";

export type VlmPaidAccessTokenPayload = {
  version: "vlm-paid-access-v1";
  productId: VlmPaidProductId;
  contextHash: string;
  sessionId: string;
  issuedAt: string;
  expiresAt: string;
  nonce: string;
};

function getSecret() {
  return process.env.VELMERE_PAID_ACCESS_SECRET || process.env.VELMERE_VLM_RECEIPT_SECRET || "";
}

function resolvePaidAccessTokenTtlMs() {
  const raw = Number(process.env.VELMERE_PAID_ACCESS_TTL_MS);
  if (Number.isFinite(raw) && raw >= 1000 * 60 * 10 && raw <= 1000 * 60 * 60 * 24 * 365) return raw;
  return 1000 * 60 * 60 * 24 * 30;
}

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function parseBase64url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function hashVlmPaidAccessContext(context: Partial<VlmPaidAccessContext>): string {
  const normalized = normalizePaidContext(context, context.locale);
  return createHash("sha256")
    .update(JSON.stringify({
      surface: normalized.surface,
      locale: normalized.locale,
      assetId: normalized.assetId || "",
      symbol: normalized.symbol || "",
      depth: normalized.depth || "",
      requestId: normalized.requestId || "",
    }))
    .digest("hex");
}

export function createVlmPaidAccessToken(args: {
  productId: VlmPaidProductId;
  context: Partial<VlmPaidAccessContext>;
  sessionId: string;
  ttlMs?: number;
  now?: Date;
}) {
  const secret = getSecret();
  if (secret.length < 32) {
    return { ok: false as const, error: "missing_paid_access_secret" };
  }
  const now = args.now ?? new Date();
  const payload: VlmPaidAccessTokenPayload = {
    version: "vlm-paid-access-v1",
    productId: args.productId,
    contextHash: hashVlmPaidAccessContext(args.context),
    sessionId: args.sessionId.slice(0, 96),
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + (args.ttlMs ?? resolvePaidAccessTokenTtlMs())).toISOString(),
    nonce: randomBytes(12).toString("hex"),
  };
  const encoded = base64url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return { ok: true as const, token: `${encoded}.${signature}`, payload };
}

export function verifyVlmPaidAccessToken(args: {
  token: string | null | undefined;
  productId: VlmPaidProductId;
  context: Partial<VlmPaidAccessContext>;
  now?: Date;
}) {
  const secret = getSecret();
  if (!args.token || secret.length < 32) {
    return { ok: false as const, error: "missing_token_or_secret" };
  }
  const [encoded, signature] = args.token.split(".");
  if (!encoded || !signature) return { ok: false as const, error: "malformed_token" };
  const expected = createHmac("sha256", secret).update(encoded).digest("base64url");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
    return { ok: false as const, error: "invalid_signature" };
  }
  let payload: VlmPaidAccessTokenPayload;
  try {
    payload = JSON.parse(parseBase64url(encoded)) as VlmPaidAccessTokenPayload;
  } catch {
    return { ok: false as const, error: "invalid_payload" };
  }
  if (payload.version !== "vlm-paid-access-v1") return { ok: false as const, error: "invalid_version" };
  if (payload.productId !== args.productId) return { ok: false as const, error: "product_mismatch" };
  if (payload.contextHash !== hashVlmPaidAccessContext(args.context)) return { ok: false as const, error: "context_mismatch" };
  if (Date.parse(payload.expiresAt) <= (args.now ?? new Date()).getTime()) return { ok: false as const, error: "expired" };
  return { ok: true as const, payload };
}
