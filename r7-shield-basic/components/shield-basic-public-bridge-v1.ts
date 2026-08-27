import "jsr:@supabase/functions-js@2.4.4/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.108.1";

const MAX_BODY_BYTES = 4096;
const ASSET = /^[A-Za-z0-9][A-Za-z0-9:._-]{2,159}$/;
const LOCALES = new Set(["pl", "en", "de"]);
const HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store, max-age=0",
  pragma: "no-cache",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};
const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: HEADERS });

async function constantTimeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const a = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(left)));
  const b = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(right)));
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index]! ^ b[index]!;
  return difference === 0;
}

const COPY = {
  pl: {
    title: "Shield — bieżąca postawa bezpieczeństwa",
    confidence: "Pewność dowodu",
    disclosure: "Opisowy sygnał obronny oparty na aktualnym publicznym evidence. To nie jest audyt, prawdopodobieństwo, porada inwestycyjna ani ocena prawna.",
  },
  en: {
    title: "Shield — current security posture",
    confidence: "Evidence confidence",
    disclosure: "A descriptive defensive signal based on current public evidence. It is not an audit, probability, investment advice, or legal determination.",
  },
  de: {
    title: "Shield — aktuelle Sicherheitslage",
    confidence: "Evidenzsicherheit",
    disclosure: "Ein beschreibendes defensives Signal auf Basis aktueller öffentlicher Evidenz. Kein Audit, keine Wahrscheinlichkeit, Anlageberatung oder Rechtsbewertung.",
  },
} as const;

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return respond(405, { ok: false, error: "method_not_allowed" });
  const contentLength = request.headers.get("content-length");
  if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_BODY_BYTES)) {
    return respond(413, { ok: false, error: "request_too_large" });
  }
  let raw = "";
  try { raw = await request.text(); } catch { return respond(400, { ok: false, error: "invalid_body" }); }
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return respond(413, { ok: false, error: "request_too_large" });

  let body: Record<string, unknown>;
  try { body = JSON.parse(raw) as Record<string, unknown>; } catch { return respond(400, { ok: false, error: "invalid_json" }); }
  if (Object.keys(body).some((key) => !["schemaVersion", "assetId", "locale"].includes(key))) {
    return respond(400, { ok: false, error: "request_shape_invalid" });
  }
  if (body.schemaVersion !== "velmere.r7.shield-basic-tile-request.v1") return respond(400, { ok: false, error: "schema_invalid" });
  const assetId = typeof body.assetId === "string" ? body.assetId.trim() : "";
  const locale = typeof body.locale === "string" ? body.locale : "en";
  if (!ASSET.test(assetId)) return respond(400, { ok: false, error: "asset_id_invalid" });
  if (!LOCALES.has(locale)) return respond(400, { ok: false, error: "locale_invalid" });

  const suppliedCapability = (request.headers.get("x-velmere-shield-server-capability") ?? "").trim();
  if (suppliedCapability.length < 48 || suppliedCapability.length > 256) return respond(403, { ok: false, error: "server_capability_missing" });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return respond(503, { ok: false, error: "server_environment_unavailable" });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const capability = await admin.rpc("velmere_r7_read_shield_server_capability_for_oidc");
  if (capability.error || typeof capability.data !== "string" || !(await constantTimeEqual(suppliedCapability, capability.data))) {
    return respond(403, { ok: false, error: "server_capability_invalid" });
  }

  const result = await admin.rpc("velmere_r7_shield_basic_tile_data_v1", { p_asset_id: assetId });
  if (result.error) return respond(503, { ok: false, error: "shield_evidence_unavailable", providerCode: result.error.code ?? null });
  const data = result.data as Record<string, unknown> | null;
  if (data?.resolution !== "RESOLVED" || !data.event || typeof data.event !== "object") {
    return respond(404, { ok: false, error: "shield_asset_not_found" });
  }
  const event = data.event as Record<string, unknown>;
  if (event.publicationState !== "PUBLIC" || event.customerPublishable !== true) {
    return respond(503, { ok: false, error: "shield_publication_boundary_failed" });
  }
  const snapshot = event.snapshot && typeof event.snapshot === "object" ? event.snapshot as Record<string, unknown> : {};
  const localized = COPY[locale as keyof typeof COPY];
  return respond(200, {
    ok: true,
    schemaVersion: "velmere.r7.shield-basic-customer-tile.v1",
    tile: {
      title: localized.title,
      assetId: event.assetId,
      canonicalAssetId: event.canonicalAssetId,
      symbol: event.symbol,
      name: event.name,
      postureScore: event.score,
      postureLevel: event.level,
      evidenceConfidence: event.confidence,
      evidenceConfidenceLabel: localized.confidence,
      signalCount: event.signalCount,
      observedAt: event.observedAt,
      sourceAsOf: event.sourceAsOf,
      methodologyVersion: event.methodologyVersion,
      scoreVersion: event.scoreVersion,
      evidenceVersion: event.evidenceVersion,
      eventDigest: event.eventDigest,
      evidenceDigest: event.evidenceDigest,
      currentDrivers: Array.isArray(event.changeReasons) ? event.changeReasons : [],
      eventTypes: Array.isArray(event.eventTypes) ? event.eventTypes : [],
      dominantAgent: snapshot.dominantAgent ?? null,
      publicationState: "PUBLIC",
      customerPublishable: true,
      uncertaintyDisclosure: localized.disclosure,
    },
    productContract: "CURRENT_DEFENSIVE_POSTURE_NOT_RISK_HISTORY",
    serviceRoleReturned: false,
    rawCapabilityReturned: false,
    truthBoundary: "Current customer-safe defensive posture only. Risk history is a separate Risk Indicator product route.",
  });
});
