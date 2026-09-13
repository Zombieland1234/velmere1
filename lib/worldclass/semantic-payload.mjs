import { createHash } from "node:crypto";

export const SEMANTIC_PAYLOAD_SCHEMA_VERSION = "velmere.semantic-payload.v1";

export const SEMANTIC_EXCLUDED_KEYS = Object.freeze([
  "semanticDigest",
  "semanticDigestSha256",
  "semanticPayloadSha256",
  "exactPdfSha256",
  "exactBytesSha256",
  "renderedBytesSha256",
  "pdfSha256",
  "pdfDigest",
  "pdfBytes",
  "pdfByteLength",
  "renderedByteLength",
]);

const excludedKeySet = new Set(SEMANTIC_EXCLUDED_KEYS);

function assertJsonValue(value, path) {
  if (value === null) return;
  const type = typeof value;
  if (type === "string" || type === "boolean") return;
  if (type === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`semantic_non_finite_number:${path}`);
    return;
  }
  if (type === "undefined") throw new TypeError(`semantic_undefined:${path}`);
  if (type === "bigint") throw new TypeError(`semantic_bigint:${path}`);
  if (type === "function" || type === "symbol") throw new TypeError(`semantic_unsupported_type:${path}:${type}`);
  if (type !== "object") throw new TypeError(`semantic_unsupported_type:${path}:${type}`);
}

function project(value, path, excludedPaths, seen) {
  assertJsonValue(value, path);
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Object.is(value, -0) ? 0 : value;

  if (seen.has(value)) throw new TypeError(`semantic_cycle:${path}`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((entry, index) => project(entry, `${path}[${index}]`, excludedPaths, seen));
    }
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) throw new TypeError(`semantic_non_plain_object:${path}`);
    const output = {};
    for (const key of Object.keys(value).sort()) {
      const childPath = path ? `${path}.${key}` : key;
      if (excludedKeySet.has(key)) {
        excludedPaths.push(childPath);
        continue;
      }
      output[key] = project(value[key], childPath, excludedPaths, seen);
    }
    return output;
  } finally {
    seen.delete(value);
  }
}

export function canonicalSemanticJson(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(canonicalSemanticJson).join(",")}]`;
  if (typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalSemanticJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function buildSemanticPayload(value) {
  const excludedPaths = [];
  const payload = project(value, "$", excludedPaths, new WeakSet());
  const envelope = {
    schemaVersion: SEMANTIC_PAYLOAD_SCHEMA_VERSION,
    payload,
  };
  const canonicalJson = canonicalSemanticJson(envelope);
  const semanticDigestSha256 = createHash("sha256").update(canonicalJson, "utf8").digest("hex");
  return {
    schemaVersion: SEMANTIC_PAYLOAD_SCHEMA_VERSION,
    payload,
    canonicalJson,
    semanticDigestSha256,
    excludedPaths,
  };
}

export function semanticDigestSha256(value) {
  return buildSemanticPayload(value).semanticDigestSha256;
}
