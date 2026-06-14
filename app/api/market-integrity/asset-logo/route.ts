import { applyApiAbuseShield } from "@/lib/security/api-abuse-shield";
import { sanitizeBoundedParam } from "@/lib/security/api-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_LOGO_HOSTS = new Set([
  "api.twelvedata.com",
  "logo.twelvedata.com",
]);

export async function GET(request: Request) {
  const shield = await applyApiAbuseShield(request, "icon", {
    keyPrefix: "real-market-asset-logo",
    queryParam: "symbol",
    allowEmptyQuery: false,
  });
  if (!shield.ok) return shield.response;

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  const symbol = sanitizeBoundedParam(shield.query ?? null, { maxLength: 32 })
    .toUpperCase()
    .replace(/[^A-Z0-9./:_-]/g, "");
  if (!apiKey || !symbol) return new Response(null, { status: 404 });

  const params = new URLSearchParams({ symbol, apikey: apiKey });
  try {
    const metadataResponse = await fetch(
      `https://api.twelvedata.com/logo?${params.toString()}`,
      {
        headers: { accept: "application/json" },
        next: { revalidate: 60 * 60 * 24 * 7 },
      } as RequestInit & { next: { revalidate: number } },
    );
    if (!metadataResponse.ok) {
      return new Response(null, { status: metadataResponse.status });
    }
    const metadata = (await metadataResponse.json()) as {
      url?: string;
      logo_base?: string;
    };
    const rawLogo = metadata.url ?? metadata.logo_base;
    if (!rawLogo) return new Response(null, { status: 404 });
    const logoUrl = new URL(rawLogo);
    if (logoUrl.protocol !== "https:" || !ALLOWED_LOGO_HOSTS.has(logoUrl.hostname)) {
      return new Response(null, { status: 403 });
    }

    const imageResponse = await fetch(logoUrl, {
      headers: { accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8" },
      next: { revalidate: 60 * 60 * 24 * 7 },
    } as RequestInit & { next: { revalidate: number } });
    if (!imageResponse.ok) return new Response(null, { status: imageResponse.status });
    const contentType = imageResponse.headers.get("content-type") ?? "image/png";
    if (!contentType.startsWith("image/")) return new Response(null, { status: 415 });
    const bytes = await imageResponse.arrayBuffer();
    if (bytes.byteLength > 600_000) return new Response(null, { status: 413 });

    return new Response(bytes, {
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
