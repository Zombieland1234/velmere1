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
    title: "Shield Pro Basic — terminal triage",
    subtitle: "Darmowy, ograniczony terminal jednego celu: bieżący stan, evidence, zmiany i kolejka działań.",
    labels: {
      identity: "Tożsamość celu",
      posture: "Bieżąca postawa",
      confidence: "Pewność evidence",
      signals: "Aktywne sygnały",
      methodology: "Metodologia",
      provenance: "Digest evidence",
      freshness: "Aktualność źródła",
      comparability: "Porównywalność",
    },
    queue: [
      "Zweryfikuj najnowszy digest evidence przed decyzją operacyjną.",
      "Porównaj obecny segment metodologii z poprzednią obserwacją.",
      "Zbadaj przyczynę zmiany evidence i metodologii.",
      "Eskaluje do audytu, jeżeli potrzebna jest ocena kodu lub logiki biznesowej.",
    ],
    disclosure: "To opisowy terminal defensywny oparty na customer-publishable evidence. Nie jest audytem, prawdopodobieństwem bezpieczeństwa, poradą inwestycyjną ani oceną prawną.",
  },
  en: {
    title: "Shield Pro Basic — triage terminal",
    subtitle: "A free bounded single-target terminal for current posture, evidence, changes, and an action queue.",
    labels: {
      identity: "Target identity",
      posture: "Current posture",
      confidence: "Evidence confidence",
      signals: "Active signals",
      methodology: "Methodology",
      provenance: "Evidence digest",
      freshness: "Source freshness",
      comparability: "Comparability",
    },
    queue: [
      "Verify the latest evidence digest before an operational decision.",
      "Compare the current methodology segment with the previous observation.",
      "Investigate the reason for the evidence and methodology change.",
      "Escalate to an audit when code or business-logic assurance is required.",
    ],
    disclosure: "This is a descriptive defensive terminal based on customer-publishable evidence. It is not an audit, a probability of safety, investment advice, or a legal determination.",
  },
  de: {
    title: "Shield Pro Basic — Triage-Terminal",
    subtitle: "Ein kostenloses begrenztes Ein-Ziel-Terminal für aktuelle Lage, Evidenz, Änderungen und Maßnahmen.",
    labels: {
      identity: "Zielidentität",
      posture: "Aktuelle Lage",
      confidence: "Evidenzsicherheit",
      signals: "Aktive Signale",
      methodology: "Methodik",
      provenance: "Evidenz-Digest",
      freshness: "Quellenaktualität",
      comparability: "Vergleichbarkeit",
    },
    queue: [
      "Prüfe den neuesten Evidenz-Digest vor einer operativen Entscheidung.",
      "Vergleiche das aktuelle Methodiksegment mit der vorherigen Beobachtung.",
      "Untersuche den Grund der Evidenz- und Methodikänderung.",
      "Eskaliere zu einem Audit, wenn Code- oder Geschäftslogikprüfung nötig ist.",
    ],
    disclosure: "Dies ist ein beschreibendes defensives Terminal auf Basis kundenfreigegebener Evidenz. Kein Audit, keine Sicherheitswahrscheinlichkeit, Anlageberatung oder Rechtsbewertung.",
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
  if (body.schemaVersion !== "velmere.r7.shield-pro-basic-terminal-request.v2") {
    return respond(400, { ok: false, error: "schema_invalid" });
  }

  const assetId = typeof body.assetId === "string" ? body.assetId.trim() : "";
  const locale = typeof body.locale === "string" ? body.locale : "en";
  if (!ASSET.test(assetId)) return respond(400, { ok: false, error: "asset_id_invalid" });
  if (!LOCALES.has(locale)) return respond(400, { ok: false, error: "locale_invalid" });

  const supplied = (request.headers.get("x-velmere-shield-pro-basic-v2-server-capability") ?? "").trim();
  if (supplied.length < 48 || supplied.length > 256) {
    return respond(403, { ok: false, error: "server_capability_missing" });
  }

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return respond(503, { ok: false, error: "server_environment_unavailable" });

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const capability = await admin.rpc("velmere_r7_read_shield_pro_basic_v2_server_capability_for_oidc");
  if (capability.error || typeof capability.data !== "string" || !await equal(supplied, capability.data)) {
    return respond(403, { ok: false, error: "server_capability_invalid" });
  }

  const result = await admin.rpc("velmere_r7_shield_pro_basic_terminal_data_v2", { p_asset_id: assetId });
  if (result.error) {
    return respond(503, {
      ok: false,
      error: "shield_pro_basic_evidence_unavailable",
      providerCode: result.error.code ?? null,
    });
  }

  const data = result.data as Record<string, unknown> | null;
  if (data?.resolution !== "RESOLVED") {
    return respond(404, { ok: false, error: "shield_pro_basic_asset_not_found" });
  }
  if (data.customerPublishable !== true || data.publicationState !== "PUBLIC") {
    return respond(503, { ok: false, error: "shield_pro_basic_publication_boundary_failed" });
  }

  const current = data.currentEvent as SafeEvent | null;
  const history = Array.isArray(data.history) ? data.history as SafeEvent[] : [];
  if (!current || history.length < 2) {
    return respond(503, { ok: false, error: "shield_pro_basic_history_incomplete" });
  }

  const localized = copy[locale as keyof typeof copy];
  const cards = [
    { id: "identity", label: localized.labels.identity, value: `${String(data.symbol)} · ${String(data.canonicalAssetId)}`, state: "VERIFIED" },
    { id: "posture", label: localized.labels.posture, value: `${String(current.score)} / ${String(current.level)}`, state: "CURRENT" },
    { id: "confidence", label: localized.labels.confidence, value: String(current.confidence), state: Number(current.confidence) < 0.8 ? "BOUNDED" : "HIGH" },
    { id: "signals", label: localized.labels.signals, value: String(current.signalCount), state: "OBSERVED" },
    { id: "methodology", label: localized.labels.methodology, value: String(current.methodologyVersion), state: "VERSIONED" },
    { id: "provenance", label: localized.labels.provenance, value: String(current.evidenceDigest), state: "DIGEST_BOUND" },
    { id: "freshness", label: localized.labels.freshness, value: String(current.sourceAsOf), state: "CURRENT" },
    { id: "comparability", label: localized.labels.comparability, value: `${String(data.comparabilitySegments)} segments`, state: "SEGMENTED" },
  ];

  const operatorTable = history.map((event, index) => ({
    sequence: index + 1,
    observedAt: event.observedAt,
    sourceAsOf: event.sourceAsOf,
    score: event.score,
    level: event.level,
    confidence: event.confidence,
    signalCount: event.signalCount,
    eventTypes: Array.isArray(event.eventTypes) ? event.eventTypes : [],
    changeReasons: Array.isArray(event.changeReasons) ? event.changeReasons : [],
    eventDigest: event.eventDigest,
    evidenceDigest: event.evidenceDigest,
    methodologyVersion: event.methodologyVersion,
    comparabilityKey: event.comparabilityKey,
    comparableToPrevious: event.comparableToPrevious,
  }));

  const actionQueue = localized.queue.map((instruction, index) => ({
    position: index + 1,
    priority: index === 0 ? "HIGH" : index === 1 ? "MEDIUM" : "NORMAL",
    instruction,
    requiresHumanJudgment: index >= 2,
    automatedExecutionAllowed: false,
  }));

  return respond(200, {
    ok: true,
    schemaVersion: "velmere.r7.shield-pro-basic-customer-terminal.v2",
    productSlug: "shield-pro-basic",
    productOrdinal: 10,
    tier: "basic",
    freeBasic: true,
    paidValueCredit: false,
    customerVisible: true,
    productContract: "BOUNDED_SINGLE_TARGET_FREE_DEFENSIVE_TRIAGE_TERMINAL",
    locale,
    title: localized.title,
    subtitle: localized.subtitle,
    asset: { assetId: data.assetId, canonicalAssetId: data.canonicalAssetId, symbol: data.symbol, name: data.name, identityClass: data.identityClass },
    cards,
    operatorTable,
    actionQueue,
    structuredPayload: {
      currentEvent: current,
      history,
      historyCount: data.historyCount,
      comparabilitySegments: data.comparabilitySegments,
      firstObservedAt: data.firstObservedAt,
      latestObservedAt: data.latestObservedAt,
      requiredEventDigests: history.map((event) => String(event.eventDigest ?? "")),
      requiredEvidenceDigests: history.map((event) => String(event.evidenceDigest ?? "")),
    },
    currentness: { sourceAsOf: current.sourceAsOf, observedAt: current.observedAt, state: "CURRENT", maxAgeSeconds: data.maxAgeSeconds },
    rights: {
      sourceClass: "VELMERE_GENERATED_PUBLIC_EVIDENCE_FROM_DIRECT_CHAIN_BOUND_SOURCE",
      customerDisplayRightsBasis: "FIRST_PARTY_DERIVED_CUSTOMER_PUBLISHABLE_EVIDENCE",
      externalProviderDisplayRightsRequired: false,
      externalProviderRedistributionClaimed: false,
      providerNetworkCalls: 0,
      rawProviderPayloadReturned: false,
    },
    uncertaintyDisclosure: localized.disclosure,
    serviceRoleReturned: false,
    rawCapabilityReturned: false,
    truthBoundary: "Shield Pro Basic is a free, bounded, single-target defensive triage terminal. It does not provide monitoring, team automation, an audit, a probability of safety, legal advice, or investment advice. Paid tiers must add materially stronger workflows rather than degrade this Basic output.",
  });
});
