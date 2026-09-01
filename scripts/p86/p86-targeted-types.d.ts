declare module "@/lib/reporting/account-customer-artifact-snapshot" {
  export type AccountCustomerArtifactSnapshot = { snapshotId: string; pdfStorage?: "exact_immutable_blob"; [key: string]: unknown };
  export function isPass4824ExactPdfAccountCustomerArtifactSnapshot(snapshot: AccountCustomerArtifactSnapshot): boolean;
}
