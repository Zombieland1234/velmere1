declare const process: { env: Record<string, string | undefined> };

declare module "@/lib/network/fetch-with-deadline" {
  export function readJsonResponseBounded<T>(response: Response, maxBytes: number): Promise<T>;
  export function readResponseBytesBounded(response: Response, maxBytes: number): Promise<Uint8Array>;
}

declare module "@/lib/network/brokered-egress" {
  export function brokeredConfiguredOriginFetch(
    input: string | URL,
    init: RequestInit,
    options: { configuredProfile: "supabase" | "upstash_rest"; operation: string; timeoutMs?: number },
  ): Promise<Response>;
}

declare module "@/lib/market-integrity/coingecko" {
  export type MarketIntegrityRow = { id: string };
}

declare module "@/lib/market-integrity/market-memory" {
  export type MarketRiskSnapshot = {
    id: string;
    symbol: string;
    name: string;
    timestamp: string;
    score: number;
    level: "low" | "medium" | "high" | "critical";
    signalCount: number;
    canonicalAssetId?: string;
    snapshotDigest?: string;
    customerPublishable?: boolean;
  };
}

declare module "@/lib/market-integrity/risk-history-contract" {
  export type RiskHistoryDurabilityState = "DURABLE_READBACK_VERIFIED" | "CONFIGURED_UNVERIFIED" | "DEGRADED_MEMORY_FALLBACK" | "RUNTIME_MEMORY_ONLY";
  export type RiskHistoryAssetResolutionState = "RESOLVED" | "EMPTY" | "AMBIGUOUS";
  export type RiskHistorySnapshotRecord = import("@/lib/market-integrity/market-memory").MarketRiskSnapshot & {
    schemaVersion: "velmere.risk-history-snapshot.v1";
    canonicalAssetId: string;
    snapshotDigest: string;
  };
  export type RiskHistoryPublicPage = {
    requestedLimit: number;
    before: string | null;
    hasOlder: boolean;
    nextBefore: string | null;
  };
  export type RiskHistoryPublicRequestBinding = {
    schemaVersion: "velmere.risk-history-public-request-binding.v1";
    requestedId: string;
    resolutionKind: "CANONICAL" | "UNIQUE_ALIAS" | null;
  };
  export type RiskHistoryEvent = {
    schemaVersion: "velmere.risk-history-event.v1";
    eventId: string;
    eventDigest: string;
    canonicalAssetId: string;
    assetId: string;
    observedAt: string;
    score: number;
    publicationState: "PUBLIC" | "WITHHELD";
    customerPublishable: boolean;
    snapshot: RiskHistorySnapshotRecord;
  };
  export type CustomerSafeRiskLedgerStatus = {
    schemaVersion: "velmere.risk-history-ledger.customer-status.v1";
    storageState: "DURABLE_VERIFIED" | "CONFIGURED_UNVERIFIED" | "DEGRADED" | "RUNTIME_ONLY";
    historyCompleteness: "DURABLE_BOUNDED" | "RUNTIME_BOUNDED" | "UNKNOWN";
    blockers: string[];
  };

  export type CustomerSafeRiskHistoryPageStorageProof = {
    schemaVersion: "velmere.risk-history-page-storage-proof.v2";
    pageSource: "DATABASE" | "MEMORY";
    pageReadState: "DATABASE_PAGE_RESPONSE_VERIFIED" | "RUNTIME_PAGE_ONLY";
    pageIntegrityVerified: true;
    durableRetentionClaimed: false;
    backupRestoreProven: false;
    pageEvidenceDigest: string;
    blockers: string[];
  };
  export function verifyRiskHistorySnapshot(value: RiskHistorySnapshotRecord): boolean;
  export function verifyRiskHistoryEvent(value: RiskHistoryEvent): boolean;
  export function decideRiskHistoryEvent(snapshot: RiskHistorySnapshotRecord, previous?: RiskHistoryEvent):
    | { decision: "STORE"; event: RiskHistoryEvent; reason: string }
    | { decision: "SKIP"; reason: string }
    | { decision: "CONFLICT"; reason: string };
  export function buildPublicCustomerRiskHistoryProjection(args: {
    requestedId: string;
    resolution: "RESOLVED" | "EMPTY";
    canonicalAssetId: string | null;
    events: RiskHistoryEvent[];
    requestBinding: RiskHistoryPublicRequestBinding;
    page: RiskHistoryPublicPage;
    storage: CustomerSafeRiskHistoryPageStorageProof;
    limit?: number;
  }): { status: "AVAILABLE" | "EMPTY"; observations: number };
  export function buildCustomerSafeRiskHistoryPageStorageProof(args: {
    pageSource: "DATABASE" | "MEMORY";
    resolution: "RESOLVED" | "EMPTY";
    canonicalAssetId: string | null;
    requestBinding: import("@/lib/market-integrity/risk-history-customer-request-binding").RiskHistoryCustomerRequestBinding;
    page: RiskHistoryPublicPage;
    events: Array<{ eventReference: string; observedAt: string }>;
  }): CustomerSafeRiskHistoryPageStorageProof;
}

declare module "@/lib/market-integrity/risk-history-customer-request-binding" {
  export type RiskHistoryCustomerRequestBinding = {
    schemaVersion: "velmere.risk-history-customer-request-binding.v1";
    assetReference: string;
    pageReference: string;
    requestedLimit: number;
    before: string | null;
  };
  export function buildRiskHistoryCustomerRequestBinding(args: {
    assetId: string;
    limit?: number;
    before?: string | null;
  }): RiskHistoryCustomerRequestBinding;
}

declare module "@/lib/market-integrity/long-term-memory-spine" {
  export function getPass423RetentionPolicy(): { analysisWindowSnapshots: number; maxSnapshotsPerAsset: number };
  export function pass423SelectAnalysisWindow<T>(history: T[], policy: unknown): T[];
}

declare module "@/lib/market-integrity/risk-ledger" {
  import type { CustomerSafeRiskLedgerStatus, RiskHistoryAssetResolutionState, RiskHistoryEvent, RiskHistoryPublicPage, RiskHistoryPublicRequestBinding } from "@/lib/market-integrity/risk-history-contract";
  export function getPersistentRiskHistoryEvents(id: string, limit?: number): Promise<RiskHistoryEvent[]>;
  export function getPersistentRiskHistoryResolution(id: string, limit?: number): Promise<{
    schemaVersion: "velmere.risk-history-asset-resolution.v2";
    resolution: RiskHistoryAssetResolutionState;
    canonicalAssetId: string | null;
    events: RiskHistoryEvent[];
    source: "DATABASE" | "MEMORY";
  }>;
  export function getPublicRiskHistoryResolution(id: string, limit?: number, before?: string | null): Promise<{
    schemaVersion: "velmere.risk-history-public-resolution.v1";
    resolution: "RESOLVED" | "EMPTY";
    canonicalAssetId: string | null;
    events: RiskHistoryEvent[];
    requestBinding: RiskHistoryPublicRequestBinding;
    page: RiskHistoryPublicPage;
    source: "DATABASE" | "MEMORY";
  }>;
  export function getCustomerSafeRiskLedgerStatus(): Promise<CustomerSafeRiskLedgerStatus>;
}

declare module "@/lib/security/api-guard" {
  export function applyApiRateLimit(request: Request, options?: { keyPrefix?: string; limit?: number; windowMs?: number }): Promise<
    | { ok: true; headers: Headers }
    | { ok: false; response: Response }
  >;
  export function securityJson(body: unknown, init?: ResponseInit): Response;
}
