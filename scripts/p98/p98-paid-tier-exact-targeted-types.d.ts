declare module "@/lib/market-integrity/top1-risk-foundation" {
  export type VelmereTier = "Basic" | "Pro" | "Advanced";
}
declare module "@/lib/security/canonical-json" {
  export function canonicalJson(value: unknown): string;
}
declare module "@/lib/security/cryptographic-digest" {
  export function sha256Digest(value: string): string;
  export function sha256Token(value: string, length?: number): string;
}
declare module "@/lib/market-integrity/report-asset-family" {
  export type VelmereReportAssetFamily = "native_crypto" | "token" | "defi" | "nft" | "equity" | "etf" | "fx" | "commodity" | "real_estate" | "exchange_health";
}
declare module "@/lib/commerce/vlm-current-sku-truth" {
  export function getVlmCurrentSkuTruth(tier: "basic" | "pro" | "advanced", locale: string): {
    publicPriceLabel: string;
  };
}
declare module "@/lib/market-integrity/top1-entitlement-report-access" {
  import type { VelmereTier } from "@/lib/market-integrity/top1-risk-foundation";
  export type AdvancedDeliveryMode = "manual_review" | "automated";
  export type EntitlementSignal = { id: string; label: string; state: "present" | "missing" | "invalid" | "unverified" | "not_required"; customerSafeCopy: string };
  export type ReportAccessDecision = {
    schemaVersion: "pass2812_report_access_decision_v1"; tier: VelmereTier; paidTierRequested: boolean; paidEvidenceAllowed: boolean;
    status: "public_basic" | "locked_paid_evidence" | "paid_evidence_ready" | "advanced_review_pending";
    requiredSignals: EntitlementSignal[]; blockedReasons: string[]; rendererRule: string; downloadRule: string; auditLogRule: string;
  };
}
