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
const respond = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: HEADERS });

async function equal(left: string, right: string) {
  const encoder = new TextEncoder();
  const a = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(left)));
  const b = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(right)));
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a[index]! ^ b[index]!;
  return diff === 0;
}

const copy = {
  pl: {
    title: "Shield Map — mapa dowodów",
    subtitle: "Bieżąca postawa, historia evidence, luki i następny krok w jednym grafie.",
    identity: "Tożsamość aktywa",
    current: "Bieżąca postawa",
    history: "Historia dowodów",
    provenance: "Pochodzenie",
    gap: "Luka dowodowa",
    next: "Następny krok",
    gapValue: "Pewność pozostaje ograniczona; nie traktuj wyniku jako prawdopodobieństwa bezpieczeństwa.",
    nextValue: "Zweryfikuj najnowszy digest evidence i porównaj bieżący segment metodologii z wcześniejszymi obserwacjami.",
    disclosure: "Mapa pokazuje pochodzenie i luki w customer-publishable evidence. Nie jest audytem, poradą inwestycyjną ani oceną prawną.",
  },
  en: {
    title: "Shield Map — evidence map",
    subtitle: "Current posture, evidence history, gaps, and the next step in one graph.",
    identity: "Asset identity",
    current: "Current posture",
    history: "Evidence history",
    provenance: "Provenance",
    gap: "Evidence gap",
    next: "Next step",
    gapValue: "Confidence remains bounded; do not treat the score as a probability of safety.",
    nextValue: "Verify the latest evidence digest and compare the current methodology segment with earlier observations.",
    disclosure: "The map exposes provenance and gaps in customer-publishable evidence. It is not an audit, investment advice, or legal determination.",
  },
  de: {
    title: "Shield Map — Evidenzkarte",
    subtitle: "Aktuelle Lage, Evidenzhistorie, Lücken und nächster Schritt in einem Graphen.",
    identity: "Asset-Identität",
    current: "Aktuelle Lage",
    history: "Evidenzhistorie",
    provenance: "Herkunft",
    gap: "Evidenzlücke",
    next: "Nächster Schritt",
    gapValue: "Die Konfidenz bleibt begrenzt; der Wert ist keine Sicherheitswahrscheinlichkeit.",
    nextValue: "Prüfe den neuesten Evidenz-Digest und vergleiche das aktuelle Methodiksegment mit früheren Beobachtungen.",
    disclosure: "Die Karte zeigt Herkunft und Lücken in kundenfreigegebener Evidenz. Kein Audit, keine Anlageberatung und keine Rechtsbewertung.",
  },
} as const;

type SafeEvent = {
  eventId?: unknown;
  eventDigest?: unknown;
  evidenceDigest?: unknown;
  observedAt?: unknown;
  sourceAsOf?: unknown;
  score?: unknown;
  level?: unknown;
  confidence?: unknown;
  signalCount?: unknown;
  methodologyVersion?: unknown;
  scoreVersion?: unknown;
  evidenceVersion?: unknown;
  comparabilityKey?: unknown;
  comparableToPrevious?: unknown;
  eventTypes?: unknown;
  changeReasons?: unknown;
};

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return respond(405, { ok: false, error: "method_not_allowed" });
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY_BYTES)) {
    return respond(413, { ok: false, error: "request_too_large" });
  }
  let raw = "";
  try {
    raw = await request.text();
  } catch {
    return respond(400, { ok: false, error: "invalid_body" });
  }
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return respond(413, { ok: false, error: "request_too_large" });
  }
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return respond(400, { ok: false, error: "invalid_json" });
  }
  if (Object.keys(body).some((key) => !["schemaVersion", "assetId", "locale"].includes(key))) {
    return respond(400, { ok: false, error: "request_shape_invalid" });
  }
  if (body.schemaVersion !== "velmere.r7.shield-map-request.v1") {
    return respond(400, { ok: false, error: "schema_invalid" });
  }
  const assetId = typeof body.assetId === "string" ? body.assetId.trim() : "";
  const locale = typeof body.locale === "string" ? body.locale : "en";
  if (!ASSET.test(assetId)) return respond(400, { ok: false, error: "asset_id_invalid" });
  if (!LOCALES.has(locale)) return respond(400, { ok: false, error: "locale_invalid" });

  const supplied = (request.headers.get("x-velmere-shield-map-server-capability") ?? "").trim();
  if (supplied.length < 48 || supplied.length > 256) {
    return respond(403, { ok: false, error: "server_capability_missing" });
  }
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return respond(503, { ok: false, error: "server_environment_unavailable" });
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const capability = await admin.rpc("velmere_r7_read_shield_map_server_capability_for_oidc");
  if (capability.error || typeof capability.data !== "string" || !await equal(supplied, capability.data)) {
    return respond(403, { ok: false, error: "server_capability_invalid" });
  }

  const result = await admin.rpc("velmere_r7_shield_map_graph_data_v1", { p_asset_id: assetId });
  if (result.error) {
    return respond(503, { ok: false, error: "shield_map_evidence_unavailable", providerCode: result.error.code ?? null });
  }
  const data = result.data as Record<string, unknown> | null;
  if (data?.resolution !== "RESOLVED") return respond(404, { ok: false, error: "shield_map_asset_not_found" });
  if (data.customerPublishable !== true || data.publicationState !== "PUBLIC") {
    return respond(503, { ok: false, error: "shield_map_publication_boundary_failed" });
  }
  const current = data.currentEvent as SafeEvent | null;
  const history = Array.isArray(data.history) ? data.history as SafeEvent[] : [];
  if (!current || history.length < 2) {
    return respond(503, { ok: false, error: "shield_map_history_incomplete" });
  }
  const localized = copy[locale as keyof typeof copy];
  const confidence = Number(current.confidence);
  const confidenceGap = !Number.isFinite(confidence) || confidence < 0.8;
  const eventDigests = history.map((row) => String(row.eventDigest ?? ""));
  const evidenceDigests = history.map((row) => String(row.evidenceDigest ?? ""));
  const cards = [
    { id: "identity", label: localized.identity, value: `${String(data.symbol)} · ${String(data.canonicalAssetId)}`, state: "VERIFIED" },
    { id: "current", label: localized.current, value: `${String(current.score)} / ${String(current.level)} · ${String(current.confidence)}`, state: "CURRENT" },
    { id: "history", label: localized.history, value: `${String(data.historyCount)} events · ${String(data.comparabilitySegments)} segments`, state: "BOUND" },
    { id: "provenance", label: localized.provenance, value: String(current.evidenceDigest), state: "DIGEST_BOUND" },
    { id: "gap", label: localized.gap, value: localized.gapValue, state: confidenceGap ? "OPEN" : "BOUNDED" },
    { id: "next", label: localized.next, value: localized.nextValue, state: "ACTIONABLE" },
  ];
  const nodes = cards.map((card) => ({
    id: card.id,
    kind: card.id,
    label: card.label,
    state: card.state,
    value: card.value,
  }));
  const edges = [
    { from: "identity", to: "current", relation: "resolves_to" },
    { from: "current", to: "history", relation: "supported_by" },
    { from: "history", to: "provenance", relation: "bound_by" },
    { from: "current", to: "gap", relation: "limited_by" },
    { from: "gap", to: "next", relation: "drives" },
  ];

  return respond(200, {
    ok: true,
    schemaVersion: "velmere.r7.shield-map-customer-graph.v1",
    productSlug: "shield-map",
    productContract: "EVIDENCE_LINEAGE_GAPS_NEXT_ACTION_NOT_CURRENT_POSTURE_TILE",
    customerVisible: true,
    locale,
    title: localized.title,
    subtitle: localized.subtitle,
    asset: {
      assetId: data.assetId,
      canonicalAssetId: data.canonicalAssetId,
      symbol: data.symbol,
      name: data.name,
      identityClass: data.identityClass,
    },
    cards,
    graph: { nodes, edges },
    structuredPayload: {
      currentEvent: current,
      history,
      historyCount: data.historyCount,
      comparabilitySegments: data.comparabilitySegments,
      firstObservedAt: data.firstObservedAt,
      latestObservedAt: data.latestObservedAt,
      eventDigests,
      evidenceDigests,
    },
    currentness: {
      sourceAsOf: current.sourceAsOf,
      observedAt: current.observedAt,
      state: "CURRENT",
      maxAgeSeconds: data.maxAgeSeconds,
    },
    rights: {
      sourceClass: "VELMERE_GENERATED_PUBLIC_EVIDENCE_FROM_DIRECT_CHAIN_BOUND_SOURCE",
      externalProviderDisplayRightsRequired: false,
      providerNetworkCalls: 0,
      rawProviderPayloadReturned: false,
    },
    uncertaintyDisclosure: localized.disclosure,
    serviceRoleReturned: false,
    rawCapabilityReturned: false,
    paidValueCredit: false,
    truthBoundary: "Shield Map visualizes customer-publishable Velmere evidence lineage, gaps, and next actions. It does not duplicate the Shield Basic posture tile or Risk Indicator history product and makes no probability, audit, legal, or investment-advice claim.",
  });
});
