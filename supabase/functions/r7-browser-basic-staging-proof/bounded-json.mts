export const R7_BROWSER_BASIC_MAX_REQUEST_BYTES = 8192;
export const R7_BROWSER_BASIC_REQUEST_SCHEMA = "velmere.r7.staging-http-request.v1" as const;
const R7_BACKUP_ID = /^r7-backup-[a-f0-9]{64}$/;

export type R7BoundedJsonRead =
  | { ok: true; body: Record<string, unknown>; byteLength: number }
  | {
      ok: false;
      status: 400 | 413;
      error: "content_length_invalid" | "content_length_mismatch" | "invalid_json" | "request_too_large";
    };

export type R7BrowserBasicRequest =
  | { schemaVersion: typeof R7_BROWSER_BASIC_REQUEST_SCHEMA; action: "receipt" }
  | { schemaVersion: typeof R7_BROWSER_BASIC_REQUEST_SCHEMA; action: "restore"; backupId: string };

export type R7BrowserBasicRequestValidation =
  | { ok: true; request: R7BrowserBasicRequest }
  | { ok: false; error: "request_schema_invalid" | "request_shape_invalid" | "action_invalid" };

export type R7RestorePublicFailure = { status: 404; error: "restore_backup_not_found" };

const CANONICAL_CONTENT_LENGTH = /^(?:0|[1-9][0-9]*)$/;

export async function readR7BoundedJsonRequest(request: Request): Promise<R7BoundedJsonRead> {
  const rawContentLength = request.headers.get("content-length");
  let declaredContentLength: number | null = null;
  if (rawContentLength !== null) {
    if (!CANONICAL_CONTENT_LENGTH.test(rawContentLength)) {
      return { ok: false, status: 400, error: "content_length_invalid" };
    }
    declaredContentLength = Number(rawContentLength);
    if (!Number.isSafeInteger(declaredContentLength)
      || declaredContentLength > R7_BROWSER_BASIC_MAX_REQUEST_BYTES) {
      return { ok: false, status: 413, error: "request_too_large" };
    }
  }

  if (!request.body) return { ok: false, status: 400, error: "invalid_json" };
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > R7_BROWSER_BASIC_MAX_REQUEST_BYTES) {
        try {
          await reader.cancel("request_too_large");
        } catch {
          // Cancellation is best-effort; the request still fails closed.
        }
        return { ok: false, status: 413, error: "request_too_large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, status: 400, error: "invalid_json" };
  } finally {
    reader.releaseLock();
  }

  if (declaredContentLength !== null && declaredContentLength !== byteLength) {
    return { ok: false, status: 400, error: "content_length_mismatch" };
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const body: unknown = JSON.parse(decoded);
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return { ok: false, status: 400, error: "invalid_json" };
    }
    return { ok: true, body: body as Record<string, unknown>, byteLength };
  } catch {
    return { ok: false, status: 400, error: "invalid_json" };
  }
}

export function validateR7BrowserBasicRequest(body: Record<string, unknown>): R7BrowserBasicRequestValidation {
  if (body.schemaVersion !== R7_BROWSER_BASIC_REQUEST_SCHEMA) {
    return { ok: false, error: "request_schema_invalid" };
  }
  if (body.action === "receipt") {
    const keys = Object.keys(body).sort();
    if (keys.length !== 2 || keys[0] !== "action" || keys[1] !== "schemaVersion") {
      return { ok: false, error: "request_shape_invalid" };
    }
    return {
      ok: true,
      request: { schemaVersion: R7_BROWSER_BASIC_REQUEST_SCHEMA, action: "receipt" },
    };
  }
  if (body.action === "restore") {
    const keys = Object.keys(body).sort();
    if (keys.length !== 3 || keys[0] !== "action" || keys[1] !== "backupId" || keys[2] !== "schemaVersion"
      || typeof body.backupId !== "string" || !R7_BACKUP_ID.test(body.backupId)) {
      return { ok: false, error: "request_shape_invalid" };
    }
    return {
      ok: true,
      request: {
        schemaVersion: R7_BROWSER_BASIC_REQUEST_SCHEMA,
        action: "restore",
        backupId: body.backupId,
      },
    };
  }
  return { ok: false, error: "action_invalid" };
}

export function mapR7RestoreFailure(errorCode: string | null | undefined): R7RestorePublicFailure | null {
  if (errorCode === "42501" || errorCode === "P0002") {
    return { status: 404, error: "restore_backup_not_found" };
  }
  return null;
}
