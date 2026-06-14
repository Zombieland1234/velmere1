import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSafeBrandDomain(value: string) {
  return (
    value.length <= 120 &&
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i.test(value) &&
    !value.endsWith(".local") &&
    !value.endsWith(".internal")
  );
}

export async function GET(request: Request) {
  const domain = new URL(request.url).searchParams.get("domain")?.trim().toLowerCase();
  if (!domain || !isSafeBrandDomain(domain)) {
    return NextResponse.json({ ok: false, error: "unsupported_domain" }, { status: 404 });
  }

  try {
    const response = await fetch(
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
      {
        headers: { accept: "image/png,image/*;q=0.8" },
        next: { revalidate: 60 * 60 * 24 * 7 },
      },
    );
    if (!response.ok) throw new Error("brand_icon_unavailable");
    const contentType = response.headers.get("content-type") || "image/png";
    const body = await response.arrayBuffer();
    if (!contentType.startsWith("image/") || body.byteLength > 300_000) {
      throw new Error("invalid_brand_icon");
    }
    return new NextResponse(body, {
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=86400, s-maxage=604800",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "brand_icon_unavailable" }, { status: 502 });
  }
}
