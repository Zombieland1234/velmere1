export type CanonicalAssetClass =
  | "crypto"
  | "equity"
  | "etf"
  | "fx"
  | "commodity"
  | "index"
  | "rate"
  | "bond"
  | "other";

export type CanonicalInstrumentType =
  | "spot"
  | "future"
  | "perpetual"
  | "equity"
  | "etf"
  | "index"
  | "reference_rate"
  | "other";

export type CanonicalSettlementType = "cash" | "physical" | "none" | "unknown";
export type CanonicalPriceType = "spot" | "last" | "mark" | "index" | "settlement" | "mid" | "unknown";

export interface CanonicalInstrumentIdentity {
  instrumentId: string;
  assetClass: CanonicalAssetClass;
  instrumentType: CanonicalInstrumentType;
  economicExposure: string;
  underlying: string;
  canonicalSymbol: string;
  providerSymbol: string;
  venue: string | null;
  mic: string | null;
  baseCurrency: string | null;
  quoteCurrency: string | null;
  contractMonth: string | null;
  expiry: string | null;
  settlementType: CanonicalSettlementType;
  priceType: CanonicalPriceType;
  timezone: string;
  marketCalendar: string;
  jurisdiction: string[];
  dataProvider: string;
  asOf: string | null;
  freshnessSeconds: number | null;
  rollMethodology: string | null;
}

export type VelmereTier = "basic" | "pro" | "advanced";

export interface TieredInstrumentView {
  tier: VelmereTier;
  identity: CanonicalInstrumentIdentity;
  analysisDepth?: string | null;
}

export interface CanonicalInstrumentValidationResult {
  valid: boolean;
  errors: string[];
}

const FUTURES_PROVIDER_SYMBOL = /(?:^|[:._-])(?:GC|SI|CL|NG|6E|6J)(?:[FGHJKMNQUVXZ]\d{1,2}|[-_:]?FRONT|\d{1,2})?(?:$|[:._-])/i;

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function looksLikeFuture(identity: CanonicalInstrumentIdentity) {
  return (
    identity.instrumentType === "future" ||
    Boolean(identity.contractMonth) ||
    Boolean(identity.expiry) ||
    FUTURES_PROVIDER_SYMBOL.test(identity.providerSymbol)
  );
}

export function validateCanonicalInstrumentIdentity(
  identity: CanonicalInstrumentIdentity,
): CanonicalInstrumentValidationResult {
  const errors: string[] = [];

  for (const [field, value] of [
    ["instrumentId", identity.instrumentId],
    ["economicExposure", identity.economicExposure],
    ["underlying", identity.underlying],
    ["canonicalSymbol", identity.canonicalSymbol],
    ["providerSymbol", identity.providerSymbol],
    ["timezone", identity.timezone],
    ["marketCalendar", identity.marketCalendar],
    ["dataProvider", identity.dataProvider],
  ] as const) {
    if (!nonEmpty(value)) errors.push(`${field} must be non-empty`);
  }

  if (identity.freshnessSeconds !== null && (!Number.isInteger(identity.freshnessSeconds) || identity.freshnessSeconds < 0)) {
    errors.push("freshnessSeconds must be a non-negative integer or null");
  }

  if (identity.instrumentType === "future") {
    if (!identity.venue) errors.push("future must identify venue");
    if (!identity.expiry && !identity.contractMonth && !identity.rollMethodology) {
      errors.push("future must identify expiry/contractMonth or explicit rollMethodology");
    }
  }

  if (identity.instrumentType === "spot" && looksLikeFuture({ ...identity, instrumentType: "spot" })) {
    errors.push("spot identity cannot carry futures contract metadata/provider symbol");
  }

  if (identity.assetClass === "fx" && identity.instrumentType === "spot") {
    if (!identity.baseCurrency || !identity.quoteCurrency) {
      errors.push("FX spot must define baseCurrency and quoteCurrency");
    }
    if (identity.expiry || identity.contractMonth) {
      errors.push("FX spot cannot define futures expiry/contractMonth");
    }
  }

  if (identity.assetClass === "index" && identity.instrumentType !== "index") {
    errors.push("index assetClass must use instrumentType=index");
  }

  if (identity.assetClass === "commodity" && identity.instrumentType === "spot" && identity.contractMonth) {
    errors.push("commodity spot cannot define contractMonth");
  }

  return { valid: errors.length === 0, errors };
}

const IDENTITY_KEYS: Array<keyof CanonicalInstrumentIdentity> = [
  "instrumentId",
  "assetClass",
  "instrumentType",
  "economicExposure",
  "underlying",
  "canonicalSymbol",
  "providerSymbol",
  "venue",
  "mic",
  "baseCurrency",
  "quoteCurrency",
  "contractMonth",
  "expiry",
  "settlementType",
  "priceType",
  "timezone",
  "marketCalendar",
  "jurisdiction",
  "dataProvider",
  "rollMethodology",
];

function normalizedIdentityValue(value: unknown) {
  if (Array.isArray(value)) return [...value].sort().join("|");
  return value ?? null;
}

/**
 * Basic/Pro/Advanced may change analysis depth, but never instrument identity.
 * `asOf` and `freshnessSeconds` are intentionally excluded from identity parity:
 * they describe observation freshness, not what instrument the customer bought.
 */
export function assertTierIndependentInstrumentIdentity(
  views: TieredInstrumentView[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (views.length < 2) return { valid: true, errors };
  const reference = views[0];

  for (const view of views.slice(1)) {
    for (const key of IDENTITY_KEYS) {
      const expected = normalizedIdentityValue(reference.identity[key]);
      const actual = normalizedIdentityValue(view.identity[key]);
      if (expected !== actual) {
        errors.push(`tier identity drift: ${reference.tier} vs ${view.tier} field=${String(key)} expected=${String(expected)} actual=${String(actual)}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function canonicalInstrumentKey(identity: CanonicalInstrumentIdentity) {
  return IDENTITY_KEYS.map((key) => `${String(key)}=${String(normalizedIdentityValue(identity[key]))}`).join("::");
}
