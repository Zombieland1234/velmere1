declare module "@supabase/supabase-js" { export interface SupabaseClient { rpc(name:string,args:Record<string,unknown>):Promise<{data:unknown;error:{message:string}|null}>; } }
declare module "@/lib/auth/account-session" { export function hashVelmereAccountBinding(accountId:string):string; }
declare module "@/lib/account/audit-account-messages" {
 export type P84AuditCustomerArtifactLinkRecord={schemaVersion:"p84-audit-customer-artifact-link-v1";snapshotId:string;messageId:string;accountId:string;accountIdHash:string;auditSnapshotDigest:string;artifactSnapshotDigest:string;artifactDigest:string;pdfBlobId:string;pdfDigest:string;linkedAt:string;createdAt:string};
 export function parseP84AuditCustomerArtifactLinkRow(row:Record<string,unknown>,expected?:{accountId?:string;snapshotId?:string}):P84AuditCustomerArtifactLinkRecord;
}
declare module "@/lib/reporting/account-customer-artifact-snapshot" {
 export type AccountCustomerArtifactSnapshot={snapshotId:string;snapshotDigest:string;accountIdHash:string;surface:string;payloadKind:string;reportId:string;generatedAt:string;canonicalArtifact:{artifactDigest:string;pdfDigest:string;[key:string]:unknown};[key:string]:unknown};
 export function isPass4824ExactPdfAccountCustomerArtifactSnapshot(value:unknown):value is AccountCustomerArtifactSnapshot;
}
declare module "@/lib/reporting/account-customer-artifact-store" { export function parsePass4822AccountCustomerArtifactSnapshotRow(row:Record<string,unknown>,expectedAccountId?:string):import("@/lib/reporting/account-customer-artifact-snapshot").AccountCustomerArtifactSnapshot; }
