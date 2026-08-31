import { createDraft, detectProvider, normalizeCurrency, parseMoneyAmount } from "./common";
import type { ProductImportDraft } from "@/lib/products/types";

function readMeta(html: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<meta\\s+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>|<meta\\s+content=["']([^"']+)["'][^>]*(?:property|name)=["']${escaped}["'][^>]*>`,
    "i",
  );
  const match = html.match(pattern);
  return match?.[1] ?? match?.[2] ?? "";
}

function readJsonLdProduct(html: string) {
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const script of scripts) {
    const json = script.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
    try {
      const parsed = JSON.parse(json);
      const items = Array.isArray(parsed) ? parsed : parsed["@graph"] ? parsed["@graph"] : [parsed];
      const product = items.find((item: { "@type"?: string | string[] }) => {
        const type = item?.["@type"];
        return Array.isArray(type) ? type.includes("Product") : type === "Product";
      });
      if (product) return product as Record<string, unknown>;
    } catch {
      continue;
    }
  }
  return null;
}

function isPrivateIp(hostname: string): boolean {
  // Block localhost, private ranges, and link-local
  if (hostname === "localhost" || hostname === "0.0.0.0" || hostname === "::1") return true;
  if (hostname === "127.0.0.1" || hostname.startsWith("127.")) return true;
  if (hostname.startsWith("10.")) return true;
  if (hostname.startsWith("192.168.")) return true;
  if (hostname.startsWith("172.")) {
    const second = parseInt(hostname.split(".")[1] ?? "0", 10);
    if (second >= 16 && second <= 31) return true;
  }
  if (hostname.startsWith("169.254.")) return true; // link-local / cloud metadata
  if (hostname === "[::1]" || hostname.startsWith("[fc") || hostname.startsWith("[fd")) return true;
  return false;
}

export async function importProductFromUrl(url: string): Promise<ProductImportDraft> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return createDraft({
      title: "Invalid URL draft",
      sourceType: "url",
      warnings: ["invalid url"],
      externalUrl: url,
    });
  }

  // Block private/internal IPs to prevent SSRF
  if (isPrivateIp(parsed.hostname)) {
    return createDraft({
      title: "Blocked URL draft",
      sourceType: "url",
      warnings: ["private/internal URL blocked"],
      externalUrl: url,
    });
  }

  const warnings: string[] = [];
  const provider = detectProvider(parsed.toString());
  const controller = new AbortController();
  const timeout = windowlessTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "VelmereProductImporter/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });
    windowlessClearTimeout(timeout);

    if (response.status === 401 || response.status === 403) warnings.push("private page/login required");
    if (!response.ok) warnings.push(`public page returned ${response.status}`);

    const html = await response.text();
    const product = readJsonLdProduct(html);
    const offers = product?.offers && typeof product.offers === "object" ? (Array.isArray(product.offers) ? product.offers[0] : product.offers) : null;
    const title =
      String(product?.name ?? "") ||
      readMeta(html, "og:title") ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ||
      parsed.hostname;
    const description = String(product?.description ?? "") || readMeta(html, "og:description");
    const imageValue = product?.image;
    const image = Array.isArray(imageValue) ? String(imageValue[0] ?? "") : String(imageValue ?? readMeta(html, "og:image") ?? "");
    const price =
      parseMoneyAmount((offers as { price?: string | number } | null)?.price) ||
      parseMoneyAmount(readMeta(html, "product:price:amount"));
    const currency = normalizeCurrency(
      (offers as { priceCurrency?: string } | null)?.priceCurrency || readMeta(html, "product:price:currency"),
    );

    if (!product) warnings.push("json-ld product metadata missing");

    return createDraft({
      title,
      description,
      image,
      priceAmount: price,
      currency,
      provider,
      externalUrl: parsed.toString(),
      sourceType: "url",
      warnings,
    });
  } catch {
    windowlessClearTimeout(timeout);
    return createDraft({
      title: parsed.hostname,
      provider,
      externalUrl: parsed.toString(),
      sourceType: "url",
      warnings: [...warnings, "public metadata fetch failed"],
    });
  }
}

function windowlessTimeout(callback: () => void, ms: number) {
  return setTimeout(callback, ms);
}

function windowlessClearTimeout(timeout: ReturnType<typeof setTimeout>) {
  clearTimeout(timeout);
}
