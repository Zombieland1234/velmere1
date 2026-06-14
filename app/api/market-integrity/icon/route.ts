
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { applyApiAbuseShield } from "@/lib/security/api-abuse-shield";
import { sanitizeBoundedParam } from "@/lib/security/api-guard";

const ALLOWED_HOSTS = new Set([
  "assets.coingecko.com",
  "coin-images.coingecko.com",
  "static.coingecko.com",
  "www.coingecko.com",
  "dd.dexscreener.com",
  "cdn.dexscreener.com",
  "cdn.simpleicons.org",
]);

export async function GET(request: Request) {
  const shield = await applyApiAbuseShield(request, "icon", { keyPrefix: "token-icon-proxy", queryParam: "url", allowEmptyQuery: true });
  if (!shield.ok) return shield.response;

  const { searchParams } = new URL(request.url);
  const raw = sanitizeBoundedParam(searchParams.get("url"), { maxLength: 420 });
  if (!raw) return new Response(null, { status: 404 });

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return new Response(null, { status: 400 });
  }

  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    return new Response(null, { status: 403 });
  }

  if (!ALLOWED_HOSTS.has(url.hostname)) return new Response(null, { status: 403 });

  try {
    const response = await fetch(url.toString(), {
      headers: { accept: "image/avif,image/webp,image/apng,image/svg+xml,image/png,image/jpeg,image/*;q=0.8" },
      next: { revalidate: 60 * 60 * 24 },
    } as RequestInit & { next: { revalidate: number } });
    if (!response.ok) return new Response(null, { status: response.status });

    const contentType = response.headers.get("content-type") ?? "image/png";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return new Response(null, { status: 415 });
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > 600_000) {
      return new Response(null, { status: 413 });
    }

    const body = await response.arrayBuffer();
    if (body.byteLength > 600_000) {
      return new Response(null, { status: 413 });
    }

    return new Response(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
        "x-content-type-options": "nosniff",
        "cross-origin-resource-policy": "same-origin",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
