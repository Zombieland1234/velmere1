import type { RiskHistoryEventType } from "@/lib/market-integrity/risk-history-contract";
export type RiskHistoryCustomerRoutePayload = {
  schemaVersion: "velmere.risk-history.customer-route.v1";
  mode: "stored";
  publication: { evidenceState: "verified" | "withheld"; liveClaimed: false; currentness: "event_observation_time_bound" | "unavailable" };
  generatedAt: string;
  riskHistory: {
    schemaVersion: "velmere.risk-history.customer.v1";
    productId: "risk-indicator";
    capability: "risk-history";
    status: "AVAILABLE" | "WITHHELD" | "EMPTY";
    asset: { canonicalAssetId: string | null; symbol: string | null; name: string | null };
    trackingStartedAt: string | null;
    observations: number;
    segments: Array<{ comparabilityKey: string; methodologyVersion: string; scoreVersion: string; evidenceVersion: string; comparableWithPreviousSegment: boolean; startedAt: string; endedAt: string }>;
    history: Array<{ eventReference: string; observedAt: string; score: number; level: "low" | "medium" | "high" | "critical"; confidence: number | null; eventTypes: RiskHistoryEventType[]; changeReasons: string[]; methodologyVersion: string; scoreVersion: string; evidenceVersion: string; comparabilityKey: string; comparableToPrevious: boolean; isProbability: false; probabilityPercent: null }>;
    storage: { schemaVersion: string; storageState: "DURABLE_VERIFIED" | "CONFIGURED_UNVERIFIED" | "DEGRADED" | "RUNTIME_ONLY"; historyCompleteness: string; blockers: string[] };
    limitations: string[];
  };
};
export function buildRiskHistoryChartPolyline(history: RiskHistoryCustomerRoutePayload["riskHistory"]["history"], width?: number, height?: number, padding?: number): string;
export function fetchRiskHistoryCustomerPayload(args: { assetId: string; limit?: number; signal?: AbortSignal }): Promise<RiskHistoryCustomerRoutePayload>;
