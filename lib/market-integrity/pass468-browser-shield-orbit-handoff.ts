import type { VelmereSearchResult } from "@/lib/search/intelligence-search-contract";

export type Pass468PdfDepth = "basic" | "pro" | "advanced";
export type Pass468HandoffTarget = "shield" | "orbit";

export type Pass468BrowserShieldOrbitHandoff = {
  version: "pass468-browser-shield-orbit-handoff-v1";
  payloadId: string;
  createdAt: string;
  expiresAt: string;
  query: string;
  symbol: string;
  title: string;
  category: VelmereSearchResult["category"];
  depth: Pass468PdfDepth;
  tone: VelmereSearchResult["tone"];
  sourceMode: VelmereSearchResult["sourceMode"];
  sourceConfidence: number;
  sourceLabels: string[];
  missingData: string[];
  snapshot: {
    assetClass?: string;
    currency?: string;
    price?: number;
    marketCap?: number;
    volume24h?: number;
    change24h?: number;
    observedAt?: string;
    venueComparisonState?: string;
    fundamentalState?: string;
  };
  target: Pass468HandoffTarget;
  trustedForDisplayOnly: true;
  requiresFreshTargetScan: true;
  checksum: string;
};

const STORAGE_PREFIX = "velmere:pass468:handoff:";
const MAX_PACKET_AGE_MS = 30 * 60 * 1000;

function clean(value: unknown, max = 120) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}

function finite(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function confidence(value: unknown) {
  const number = finite(value) ?? 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
}

function packetChecksum(packet: Omit<Pass468BrowserShieldOrbitHandoff, "checksum">) {
  return stableHash(
    [
      packet.version,
      packet.payloadId,
      packet.createdAt,
      packet.expiresAt,
      packet.query,
      packet.symbol,
      packet.category,
      packet.depth,
      packet.sourceConfidence,
      packet.target,
      packet.sourceLabels.join("|"),
      packet.missingData.join("|"),
    ].join("::"),
  );
}

export function buildPass468HandoffPacket(
  result: VelmereSearchResult,
  depth: Pass468PdfDepth,
  target: Pass468HandoffTarget,
  now = new Date(),
): Pass468BrowserShieldOrbitHandoff {
  const query = clean(result.symbol || result.title || result.id, 96) || "research";
  const symbol = clean(result.symbol || query, 24).toUpperCase();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + MAX_PACKET_AGE_MS).toISOString();
  const sourceLabels = (Array.isArray(result.sources) ? result.sources : [])
    .map((source) => clean(source?.label, 80))
    .filter(Boolean)
    .slice(0, 8);
  const missingData = (Array.isArray(result.missingData) ? result.missingData : [])
    .map((item) => clean(item, 140))
    .filter(Boolean)
    .slice(0, 12);
  const seed = `${symbol}:${result.id}:${depth}:${target}:${createdAt}`;
  const payloadId = `vlm468-${stableHash(seed)}`;
  const snapshot = result.marketSnapshot || {};
  const base = {
    version: "pass468-browser-shield-orbit-handoff-v1" as const,
    payloadId,
    createdAt,
    expiresAt,
    query,
    symbol,
    title: clean(result.title, 120) || symbol,
    category: result.category,
    depth,
    tone: result.tone,
    sourceMode: result.sourceMode,
    sourceConfidence: confidence(result.sourceConfidence),
    sourceLabels,
    missingData,
    snapshot: {
      assetClass: clean(snapshot.assetClass, 40) || undefined,
      currency: clean(snapshot.currency, 12) || undefined,
      price: finite(snapshot.price),
      marketCap: finite(snapshot.marketCap),
      volume24h: finite(snapshot.volume24h),
      change24h: finite(snapshot.change24h),
      observedAt: clean(snapshot.observedAt, 64) || undefined,
      venueComparisonState: clean(snapshot.venueComparisonState, 40) || undefined,
      fundamentalState: clean(snapshot.fundamentalState, 40) || undefined,
    },
    target,
    trustedForDisplayOnly: true as const,
    requiresFreshTargetScan: true as const,
  };
  return { ...base, checksum: packetChecksum(base) };
}

export function writePass468HandoffPacket(packet: Pass468BrowserShieldOrbitHandoff) {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${packet.payloadId}`, JSON.stringify(packet));
    window.sessionStorage.setItem(`${STORAGE_PREFIX}latest`, packet.payloadId);
    return true;
  } catch {
    return false;
  }
}

function isPacket(value: unknown): value is Pass468BrowserShieldOrbitHandoff {
  if (!value || typeof value !== "object") return false;
  const packet = value as Partial<Pass468BrowserShieldOrbitHandoff>;
  if (packet.version !== "pass468-browser-shield-orbit-handoff-v1") return false;
  if (!clean(packet.payloadId, 80) || !clean(packet.query, 96)) return false;
  if (packet.depth !== "basic" && packet.depth !== "pro" && packet.depth !== "advanced") return false;
  if (packet.target !== "shield" && packet.target !== "orbit") return false;
  if (packet.trustedForDisplayOnly !== true || packet.requiresFreshTargetScan !== true) return false;
  return true;
}

export function readPass468HandoffPacket(payloadId?: string | null) {
  if (typeof window === "undefined") return null;
  try {
    const resolvedId = clean(payloadId, 80) || window.sessionStorage.getItem(`${STORAGE_PREFIX}latest`) || "";
    if (!resolvedId) return null;
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${resolvedId}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPacket(parsed)) return null;
    const expiresAt = Date.parse(parsed.expiresAt);
    const createdAt = Date.parse(parsed.createdAt);
    if (!Number.isFinite(expiresAt) || !Number.isFinite(createdAt)) return null;
    if (Date.now() > expiresAt || Date.now() - createdAt > MAX_PACKET_AGE_MS) {
      window.sessionStorage.removeItem(`${STORAGE_PREFIX}${resolvedId}`);
      return null;
    }
    const { checksum, ...base } = parsed;
    if (packetChecksum(base) !== checksum) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildPass468HandoffHref(
  locale: string,
  packet: Pass468BrowserShieldOrbitHandoff,
) {
  const safeLocale = locale === "de" || locale === "en" ? locale : "pl";
  const path = packet.target === "orbit" ? "shield-map" : "market-integrity";
  const params = new URLSearchParams({
    handoff: "pass468",
    packet: packet.payloadId,
    query: packet.query,
    asset: packet.symbol || packet.query,
    depth: packet.depth,
    from: "velmere-browser",
    source: "lens-pdf",
    view: packet.target === "orbit" ? "orbit" : "full",
  });
  return `/${safeLocale}/${path}?${params.toString()}`;
}
