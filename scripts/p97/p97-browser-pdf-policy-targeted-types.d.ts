declare module "@/lib/security/canonical-json" {
  export function canonicalJson(value: unknown): string;
}
declare module "@/lib/security/cryptographic-digest" {
  export function sha256Digest(value: string): string;
  export function sha256BytesDigest(value: Uint8Array): string;
}
declare module "@/lib/jobs/durable-computation-replay" {
  export type DurableComputationMode = "supabase" | "memory_non_production" | "direct_non_durable";
  export type DurableComputationSubjectBinding = {
    kind: "account" | "entitlement" | "session" | "anonymous";
    value: string;
  };
}
