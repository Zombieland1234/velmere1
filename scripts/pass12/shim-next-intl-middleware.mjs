/**
 * PASS12 test-only next-intl middleware compatibility surface.
 * It preserves the request-header override semantics exercised by proxy unit
 * tests without claiming locale-routing equivalence with the real package.
 */
import { NextResponse } from "next/server";

export default function createMiddleware() {
  return function offlineNextIntlMiddleware(request) {
    const headers = new Headers();
    const overridden = [];
    for (const name of ["content-security-policy", "x-nonce"]) {
      const value = request.headers.get(name);
      if (value === null) continue;
      headers.set(`x-middleware-request-${name}`, value);
      overridden.push(name);
    }
    if (overridden.length > 0) headers.set("x-middleware-override-headers", overridden.join(","));
    headers.set("x-middleware-next", "1");
    return new NextResponse(null, { headers });
  };
}
