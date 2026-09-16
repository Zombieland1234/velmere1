type ParseResult = { ok: true; body: Record<string, unknown> } | { ok: false; status: number; error: string };

// Bound both actual bytes and total read time; Content-Length is not trusted.
// timeoutMs is an internal test seam, never derived from request data.
export async function readRequestObject(req: Request, timeoutMs = 5000): Promise<ParseResult> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 5000) {
    throw new RangeError("invalid_internal_read_timeout");
  }
  if (!req.body) return { ok: false, status: 400, error: "invalid_json" };
  if (req.signal.aborted) return { ok: false, status: 400, error: "request_aborted" };
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try { reader = req.body.getReader(); }
  catch { return { ok: false, status: 400, error: "invalid_json" }; }
  const timedOut = Symbol("read_timeout");
  const aborted = Symbol("read_aborted");
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  let finished = false;
  const stopped = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(timedOut), timeoutMs);
    onAbort = () => reject(aborted);
    req.signal.addEventListener("abort", onAbort, { once: true });
    if (req.signal.aborted) onAbort();
  });
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    for (;;) {
      const { done, value } = await Promise.race([reader.read(), stopped]);
      if (done) { finished = true; break; }
      length += value.byteLength;
      if (length > 4096) return { ok: false, status: 413, error: "payload_too_large" };
      chunks.push(value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const body: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return { ok: false, status: 400, error: "request_invalid" };
    }
    return { ok: true, body: body as Record<string, unknown> };
  } catch (error) {
    if (error === timedOut) return { ok: false, status: 408, error: "request_timeout" };
    if (error === aborted) return { ok: false, status: 400, error: "request_aborted" };
    return { ok: false, status: 400, error: "invalid_json" };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (onAbort) req.signal.removeEventListener("abort", onAbort);
    // Cancellation may itself never settle. Never await a hostile source's cancel().
    if (!finished) void reader.cancel().catch(() => undefined);
    try { reader.releaseLock(); } catch { /* Pending reads are already cancelled. */ }
  }
}
