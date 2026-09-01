declare class Buffer extends Uint8Array {
  static from(value: string | ArrayBuffer | ArrayBufferView, encoding?: string): Buffer;
  static isBuffer(value: unknown): value is Buffer;
  toString(encoding?: string): string;
}

declare module "@/lib/security/cryptographic-digest" {
  export function sha256BytesDigest(value: Uint8Array): string;
  export function sha256Digest(value: string | Uint8Array): string;
}

declare module "@/lib/reporting/pdf-structural-validation" {
  export function inspectPdfStructure(value: Uint8Array): {
    headerValid: boolean;
    valid: boolean;
    blockers: readonly string[];
  };
}

declare module "@/lib/security/pro-audit-pdf/customer-safe-renderer" {
  export const PASS4808_PDF_RENDER_CONTRACT_ID: "pass4808-deterministic-latin-extended-pagination-v1";
}

declare module "@/lib/security/pro-audit-pdf/render-pro-audit-pdf" {
  import { PASS4808_PDF_RENDER_CONTRACT_ID } from "@/lib/security/pro-audit-pdf/customer-safe-renderer";
  export type ProAuditPdfSnapshot = {
    renderContract?: {
      id: typeof PASS4808_PDF_RENDER_CONTRACT_ID;
      pdfDigest: string;
      pdfByteLength: number;
    } | null;
    [key: string]: unknown;
  };
}
