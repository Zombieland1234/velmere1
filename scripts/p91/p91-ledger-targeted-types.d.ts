declare const process: { env: Record<string, string | undefined> };
declare const Buffer: { byteLength(value: string, encoding?: string): number };

declare module "next/server" {
  export const NextResponse: { json(body: unknown, init?: { status?: number; headers?: Record<string, string> }): Response };
}

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
    id: string; symbol: string; name: string; timestamp: string; score: number;
    level: "low" | "medium" | "high" | "critical"; signalCount: number;
    canonicalAssetId?: string; snapshotDigest?: string; customerPublishable?: boolean;
  };
}

declare module "@/lib/market-integrity/risk-history-contract" {
  export type RiskHistoryDurabilityState = "DURABLE_READBACK_VERIFIED" | "CONFIGURED_UNVERIFIED" | "DEGRADED_MEMORY_FALLBACK" | "RUNTIME_MEMORY_ONLY";
  export type RiskHistorySnapshotRecord = import("@/lib/market-integrity/market-memory").MarketRiskSnapshot & {
    schemaVersion: "velmere.risk-history-snapshot.v1"; canonicalAssetId: string; snapshotDigest: string;
  };
  export type RiskHistoryEvent = {
    schemaVersion: "velmere.risk-history-event.v1"; eventId: string; eventDigest: string;
    canonicalAssetId: string; assetId: string; observedAt: string; score: number;
    customerPublishable: boolean; snapshot: RiskHistorySnapshotRecord;
  };
  export type CustomerSafeRiskLedgerStatus = {
    schemaVersion: "velmere.risk-history-ledger.customer-status.v1";
    storageState: "DURABLE_VERIFIED" | "CONFIGURED_UNVERIFIED" | "DEGRADED" | "RUNTIME_ONLY";
    historyCompleteness: "DURABLE_BOUNDED" | "RUNTIME_BOUNDED" | "UNKNOWN";
    blockers: string[];
  };
  export function verifyRiskHistorySnapshot(value: RiskHistorySnapshotRecord): boolean;
  export function verifyRiskHistoryEvent(value: RiskHistoryEvent): boolean;
  export function decideRiskHistoryEvent(snapshot: RiskHistorySnapshotRecord, previous?: RiskHistoryEvent):
    | { decision: "STORE"; event: RiskHistoryEvent; reason: string }
    | { decision: "SKIP"; reason: string }
    | { decision: "CONFLICT"; reason: string };
  export function buildCustomerRiskHistoryProjection(args: {
    requestedId: string; events: RiskHistoryEvent[]; storage: CustomerSafeRiskLedgerStatus; limit?: number;
  }): { status: "AVAILABLE" | "WITHHELD" | "EMPTY"; observations: number };
}

declare module "@/lib/market-integrity/long-term-memory-spine" {
  export function getPass423RetentionPolicy(): { analysisWindowSnapshots: number; maxSnapshotsPerAsset: number };
  export function pass423SelectAnalysisWindow<T>(history: T[], policy: unknown): T[];
}

declare module "@/lib/market-integrity/risk-ledger" {
  import type { CustomerSafeRiskLedgerStatus, RiskHistoryEvent } from "@/lib/market-integrity/risk-history-contract";
  export function getPersistentRiskHistoryEvents(id: string, limit?: number): Promise<RiskHistoryEvent[]>;
  export function getCustomerSafeRiskLedgerStatus(): Promise<CustomerSafeRiskLedgerStatus>;
}
