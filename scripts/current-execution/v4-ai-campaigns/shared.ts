import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(fileURLToPath(new URL("../../../", import.meta.url)));
export const FIXED_EXECUTION_TIME = "2026-08-21T20:00:00.000Z";
export const CAMPAIGN_SEED = "VELMERE_P101R1_V4_AI_CAMPAIGNS_SEED_20260821_V1";

export const BASE_SOURCE = Object.freeze({
  checkpoint: "P101R1",
  gitCommit: "978fd9c58eee6e4ee6b0affe514c7dadd918b5f8",
  gitTree: "94a269e987ecb629f932d3bb35467432a56dd15b",
  sourceOnlyZipSha256: "c2b7ab7a924fa87265518246a9bbac9da44f674e72c776da21b5ea1b4040ed3d",
});

export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`V4_AI_CAMPAIGN_INVARIANT:${message}`);
}

export function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`)
      .join(",")}}`;
  }
  const encoded = JSON.stringify(value);
  return encoded === undefined ? "null" : encoded;
}

export function sha256Bytes(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function sha256Object(value: unknown): string {
  return sha256Bytes(Buffer.from(stable(value), "utf8"));
}

export function readText(relativePath: string): string {
  return readFileSync(path.join(ROOT, relativePath), "utf8");
}

export function readJson<T>(relativePath: string): T {
  return JSON.parse(readText(relativePath)) as T;
}

export function fileBinding(relativePath: string): { path: string; bytes: number; sha256: string } {
  const bytes = readFileSync(path.join(ROOT, relativePath));
  return { path: relativePath.replaceAll("\\", "/"), bytes: bytes.length, sha256: sha256Bytes(bytes) };
}

export function countBy<T>(rows: readonly T[], keyOf: (row: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const key = keyOf(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

export function receiptWithDigest<T extends Record<string, unknown>>(core: T): T & { evidenceSha256: string } {
  return { ...core, evidenceSha256: sha256Object(core) };
}

export function verifyReceiptDigest(value: Record<string, unknown>): boolean {
  const { evidenceSha256, ...core } = value;
  return typeof evidenceSha256 === "string" && sha256Object(core) === evidenceSha256;
}
