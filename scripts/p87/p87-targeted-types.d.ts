declare const process: {
  env: Record<string, string | undefined>;
};

declare class Buffer extends Uint8Array {
  static from(value: string | ArrayBuffer | ArrayBufferView, encoding?: string): Buffer;
  static byteLength(value: string | ArrayBuffer | ArrayBufferView, encoding?: string): number;
  readonly byteLength: number;
  toString(encoding?: string): string;
}

declare module "node:crypto" {
  type Hmac = {
    update(value: string | Uint8Array): Hmac;
    digest(): Buffer;
    digest(encoding: "base64url" | "hex"): string;
  };
  export function createHmac(algorithm: "sha256", key: string | Uint8Array): Hmac;
  export function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean;
}

declare module "@/lib/auth/account-session" {
  export function hashVelmereAccountBinding(accountId: string): string;
}

declare module "@/lib/market-integrity/top1-risk-foundation" {
  export type VelmereTier = "Basic" | "Pro" | "Advanced";
}

declare module "@/lib/reporting/canonical-customer-artifact" {
  export type CanonicalCustomerArtifactSurface = "shield" | "real_markets";
}

declare module "@/lib/market-integrity/customer-tier-pdf-renderer" {
  import type { VelmereTier } from "@/lib/market-integrity/top1-risk-foundation";
  import type { CanonicalCustomerArtifactSurface } from "@/lib/reporting/canonical-customer-artifact";
  export type CustomerReportPayload = {
    schemaVersion: "velmere-customer-report-payload-v1";
    reportId: string;
    locale: "pl" | "en" | "de";
    tier: VelmereTier;
    target: { symbol: string; family: string; [key: string]: unknown };
    deliveryPolicy: {
      visibleTier: VelmereTier;
      status: string;
      paidEvidenceAllowed: boolean;
      manualReviewAppendixAllowed?: boolean;
      [key: string]: unknown;
    };
    commercialEnvelope: {
      surface: CanonicalCustomerArtifactSurface;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

declare module "@/lib/reporting/account-customer-artifact-snapshot" {
  import type { VelmereTier } from "@/lib/market-integrity/top1-risk-foundation";
  import type { CanonicalCustomerArtifactSurface } from "@/lib/reporting/canonical-customer-artifact";
  export type AccountCustomerArtifactSnapshot = {
    snapshotId: string;
    snapshotDigest: string;
    accountIdHash: string;
    payloadDigest: string;
    payloadKind: string;
    surface: CanonicalCustomerArtifactSurface;
    requestedTier: VelmereTier;
    deliveredTier: VelmereTier | null;
    reportId: string;
    locale: "pl" | "en" | "de";
    payload: unknown;
    canonicalArtifact: {
      artifactDigest: string;
      rendererId: string;
      layoutDigest: string;
      renderPlanDigest: string;
      pageCount: number;
      renderedRowCount: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  export function isPass4824ExactPdfAccountCustomerArtifactSnapshot(snapshot: AccountCustomerArtifactSnapshot): boolean;
  export function verifyPass4822AccountCustomerArtifactOwner(snapshot: AccountCustomerArtifactSnapshot, accountId: string): boolean;
  export function verifyPass4822AccountCustomerArtifactSnapshot(snapshot: AccountCustomerArtifactSnapshot): boolean;
}

declare module "@/lib/reporting/account-customer-artifact-pdf-blob" {
  import type { AccountCustomerArtifactSnapshot } from "@/lib/reporting/account-customer-artifact-snapshot";
  export type AccountCustomerArtifactPdfBlob = {
    blobId: string;
    recordDigest: string;
    pdfDigest: string;
    pdfByteLength: number;
    pdfBytes: Uint8Array;
    [key: string]: unknown;
  };
  export function assertPass4824PdfBlobMatchesSnapshot(args: {
    blob: AccountCustomerArtifactPdfBlob;
    snapshot: AccountCustomerArtifactSnapshot;
    accountId: string;
  }): void;
  export function verifyPass4824AccountCustomerArtifactPdfBlob(blob: AccountCustomerArtifactPdfBlob): boolean;
}
