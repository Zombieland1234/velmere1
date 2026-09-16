type ParseResult = { ok: true; body: Record<string, unknown> } | { ok: false; status: number; error: string };

// Bound the actual stream, not only the caller-controlled Content-Length header.
export async function readRequestObject(req: Request): Promise<ParseResult> {
  const maxBytes = 4096;
  const reader = req.body?.getReader();
  if (!reader) return { ok: false, status: 400, error: "invalid_json" };
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, status: 413, error: "payload_too_large" };
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const body: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return { ok: false, status: 400, error: "request_invalid" };
    }
    return { ok: true, body: body as Record<string, unknown> };
  } catch {
    return { ok: false, status: 400, error: "invalid_json" };
  } finally { reader.releaseLock(); }
}
