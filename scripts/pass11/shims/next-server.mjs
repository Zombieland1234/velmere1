/**
 * PASS11 test-only compatibility surface for isolated route-unit execution.
 * It intentionally implements only standards-based Request/Response behavior.
 * It is never imported by production code or the Next build.
 */
class CookieJar {
  constructor(headers) {
    this.headers = headers;
  }
  set(nameOrOptions, value, options = {}) {
    const input = typeof nameOrOptions === "string"
      ? { name: nameOrOptions, value: value ?? "", ...options }
      : nameOrOptions;
    if (!input?.name) return;
    const parts = [`${input.name}=${input.value ?? ""}`];
    if (input.path) parts.push(`Path=${input.path}`);
    if (input.maxAge !== undefined) parts.push(`Max-Age=${input.maxAge}`);
    if (input.expires) parts.push(`Expires=${new Date(input.expires).toUTCString()}`);
    if (input.httpOnly) parts.push("HttpOnly");
    if (input.secure) parts.push("Secure");
    if (input.sameSite) parts.push(`SameSite=${String(input.sameSite)}`);
    this.headers.append("set-cookie", parts.join("; "));
  }
  delete(name) {
    this.set({ name, value: "", maxAge: 0, path: "/" });
  }
  get() {
    return undefined;
  }
  getAll() {
    return [];
  }
}

export class NextResponse extends Response {
  constructor(body = null, init = {}) {
    super(body, init);
    this.cookies = new CookieJar(this.headers);
  }
  static json(body, init = {}) {
    const headers = new Headers(init.headers);
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
    return new NextResponse(JSON.stringify(body), { ...init, headers });
  }
  static redirect(url, init = 307) {
    const status = typeof init === "number" ? init : init.status ?? 307;
    const headers = new Headers(typeof init === "number" ? undefined : init.headers);
    headers.set("location", String(url));
    return new NextResponse(null, { status, headers });
  }
  static rewrite(url, init = {}) {
    const headers = new Headers(init.headers);
    headers.set("x-middleware-rewrite", String(url));
    return new NextResponse(null, { ...init, headers });
  }
  static next(init = {}) {
    const headers = new Headers(init.headers);
    headers.set("x-middleware-next", "1");
    return new NextResponse(null, { ...init, headers });
  }
}

export class NextRequest extends Request {
  constructor(input, init) {
    super(input, init);
    this.nextUrl = new URL(this.url);
    this.cookies = {
      get: () => undefined,
      getAll: () => [],
      has: () => false,
    };
  }
}

export function after(task) {
  if (typeof task === "function") {
    try {
      const result = task();
      if (result && typeof result.then === "function") void Promise.resolve(result).catch(() => undefined);
    } catch {
      // The production helper is best-effort and request-scoped. Route-unit tests
      // deliberately keep background observability failures non-blocking.
    }
    return;
  }
  if (task && typeof task.then === "function") void Promise.resolve(task).catch(() => undefined);
}

export const userAgent = () => ({ isBot: false, ua: "pass11-offline-route-unit" });
