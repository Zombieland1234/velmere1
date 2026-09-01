declare module "@/config/p90/audit-provider-field-rights-currentness-registry.json" {
  const value: unknown;
  export default value;
}

declare module "@/lib/security/canonical-json" {
  export function canonicalJson(value: unknown): string;
}

declare module "@/lib/security/cryptographic-digest" {
  export function sha256Digest(value: string): string;
}

declare module "@/lib/security/audit-tier-contract" {
  export type AuditTierId = "basic" | "pro" | "advanced";
}

declare module "@/lib/security/audit-provider-evidence-dimensions" {
  export type AuditProviderEvidenceLaneLike = {
    state: string;
    liveExecutionEligible?: boolean;
    providerFamily?: string;
    lineage: {
      providerId: string;
      upstreamRoot: string;
      independenceEligible: boolean;
      transport: string;
    };
    receipt?: {
      observedAt: string;
      statusCode: number;
      bodyBytes: number;
      bodyDigest: string;
      requestUrlDigest: string;
    };
    identity?: {
      verification: string;
      matched: boolean;
    };
  };

  export function isSuccessfulAuditProviderLane(lane: AuditProviderEvidenceLaneLike): boolean;

  export function buildAuditProviderEvidenceDimensions<T extends AuditProviderEvidenceLaneLike>(lanes: T[]): {
    schemaVersion: string;
    strictLanes: T[];
    successfulLiveLanes: T[];
    strictReceiptCount: number;
    successfulLiveLaneCount: number;
    independentProviderFamilies: string[];
    independentUpstreamRoots: string[];
    uniqueContentDigests: string[];
    successfulLiveProviderIds: string[];
    duplicateStrictLanesRejected: number;
    duplicateLiveLanesRejected: number;
    explicitLiveExecutionIneligibleLanesRejected: number;
    truthBoundary: string;
  };
}
