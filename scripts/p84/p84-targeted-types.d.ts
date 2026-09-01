/** Minimal declarations used only for the P84 strict targeted TypeScript diagnostic.
 * They model the imported production contracts exercised by the P84 runtime harness.
 * Whole-project dependency/type closure remains a separate exact-environment gate.
 */
declare module "@supabase/supabase-js" {
  export interface SupabaseClient {
    rpc(name: string, args: Record<string, unknown>): Promise<{
      data: unknown;
      error: { message: string } | null;
    }>;
  }
}

declare module "@/lib/db/supabase" {
  import type { SupabaseClient } from "@supabase/supabase-js";
  export function getSupabaseServiceRoleClient(): SupabaseClient | null;
}

declare module "@/lib/security/canonical-json" {
  export function canonicalJson(value: unknown): string;
}

declare module "@/lib/account/audit-account-messages" {
  export type AuditAccountMessageRecord = {
    id: string;
    title: string;
    body: string;
    status: string;
    packageLabel: string;
    requestId: string;
    createdAt: string;
    eta: string;
    accountRoute: string;
    nextSteps: string[];
    accountId: string;
    contactEmail?: string;
    locale: "pl" | "en" | "de";
    reviewLevel?: string;
    projectName?: string;
    contractAddress?: string;
    publicReportRoute?: string;
    adminRoute?: string;
    exportRoute?: string;
    pdfRoute?: string;
    deliveryChannel: "account" | "account_and_email_pending";
    deliveryStatus: string;
    operatorStatus: string;
    operatorNote?: string;
    customerSafeReport?: unknown;
    canonicalCustomerSnapshot?: import("@/lib/security/audit-account-customer-snapshot").AuditAccountCustomerSnapshot;
    actionLog: unknown[];
    source: "supabase" | "memory";
    updatedAt: string;
    deliveredAt?: string;
    auditQueueId?: string;
    auditCaseRef?: string;
    paymentEvidenceRefs?: string[];
  };
  export type StoreAuditAccountMessageInput = {
    message: Record<string, unknown>;
    accountId?: string;
    canonicalCustomerSnapshot?: import("@/lib/security/audit-account-customer-snapshot").AuditAccountCustomerSnapshot;
    [key: string]: unknown;
  };
  export function buildAuditAccountMessageRecord(
    input: StoreAuditAccountMessageInput,
    source?: "supabase" | "memory",
  ): AuditAccountMessageRecord;
  export function buildAuditAccountMessageSupabaseRow(record: AuditAccountMessageRecord): Record<string, unknown>;
  export function parseAuditAccountMessageSupabaseRow(row: Record<string, unknown>): AuditAccountMessageRecord;
  export type P84AuditCustomerArtifactLinkRecord = {
    schemaVersion: "p84-audit-customer-artifact-link-v1";
    snapshotId: string;
    messageId: string;
    accountId: string;
    accountIdHash: string;
    auditSnapshotDigest: string;
    artifactSnapshotDigest: string;
    artifactDigest: string;
    pdfBlobId: string;
    pdfDigest: string;
    linkedAt: string;
    createdAt: string;
  };
  export function parseP84AuditCustomerArtifactLinkRow(
    row: Record<string, unknown>,
    expected?: { accountId?: string; snapshotId?: string },
  ): P84AuditCustomerArtifactLinkRecord;
}

declare module "@/lib/security/audit-account-customer-snapshot" {
  export type ExactAuditArtifactBinding = {
    snapshotId: string;
    pdfBlobId: string;
    artifactDigest: string;
    pdfDigest: string;
    [key: string]: unknown;
  };
  export type AuditAccountCustomerSnapshot = {
    snapshotDigest: string;
    exactAccountArtifact?: ExactAuditArtifactBinding;
    [key: string]: unknown;
  };
  export function verifyAuditAccountCustomerSnapshot(value: unknown): value is AuditAccountCustomerSnapshot;
  export function hasExactAuditAccountArtifactBinding(
    value: AuditAccountCustomerSnapshot,
  ): value is AuditAccountCustomerSnapshot & { exactAccountArtifact: ExactAuditArtifactBinding };
  export function bindAuditAccountCustomerSnapshotToExactArtifact(args: {
    snapshot: AuditAccountCustomerSnapshot;
    accountArtifactSnapshot: import("@/lib/reporting/account-customer-artifact-snapshot").AccountCustomerArtifactSnapshot;
    pdfBlob: import("@/lib/reporting/account-customer-artifact-pdf-blob").AccountCustomerArtifactPdfBlob;
    accountId: string;
  }): AuditAccountCustomerSnapshot & { exactAccountArtifact: ExactAuditArtifactBinding };
}

declare module "@/lib/reporting/account-customer-artifact-snapshot" {
  export type AccountCustomerArtifactSnapshot = {
    snapshotId: string;
    snapshotDigest: string;
    surface: string;
    payloadKind: string;
    payload: unknown;
    canonicalArtifact: { artifactDigest: string; [key: string]: unknown };
    [key: string]: unknown;
  };
  export function isPass4824ExactPdfAccountCustomerArtifactSnapshot(
    value: unknown,
  ): value is AccountCustomerArtifactSnapshot;
  export function verifyPass4822AccountCustomerArtifactOwner(
    value: AccountCustomerArtifactSnapshot,
    accountId: string,
  ): boolean;
}

declare module "@/lib/reporting/account-customer-artifact-pdf-blob" {
  export type AccountCustomerArtifactPdfBlob = {
    schemaVersion: string;
    blobId: string;
    snapshotId: string;
    accountIdHash: string;
    surface: string;
    reportId: string;
    artifactDigest: string;
    pdfDigest: string;
    pdfByteLength: number;
    mimeType: string;
    pdfBytes: Uint8Array;
    createdAt: string;
    recordDigest: string;
  };
  export function buildPass4824AccountCustomerArtifactPdfBlob(args: {
    accountId: string;
    snapshot: import("@/lib/reporting/account-customer-artifact-snapshot").AccountCustomerArtifactSnapshot;
    pdfBytes: Uint8Array;
  }): AccountCustomerArtifactPdfBlob;
}

declare module "@/lib/reporting/account-customer-artifact-store" {
  export function parsePass4824AccountCustomerArtifactPdfBundleRpcResponse(args: {
    payload: unknown;
    accountId: string;
    expectedSnapshot: import("@/lib/reporting/account-customer-artifact-snapshot").AccountCustomerArtifactSnapshot;
    proposedBlob: import("@/lib/reporting/account-customer-artifact-pdf-blob").AccountCustomerArtifactPdfBlob;
  }): {
    snapshot: import("@/lib/reporting/account-customer-artifact-snapshot").AccountCustomerArtifactSnapshot;
    blob: import("@/lib/reporting/account-customer-artifact-pdf-blob").AccountCustomerArtifactPdfBlob;
    created: boolean;
  };
}

declare const Buffer: {
  from(value: Uint8Array): { toString(encoding: "base64"): string };
};
