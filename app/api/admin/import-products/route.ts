import { NextResponse } from "next/server";
import { verifyAdminImportRequest } from "@/lib/admin/auth";
import { importProductsFromProductCsv } from "@/lib/importers/csv-importer";
import { importProductFromUrl } from "@/lib/importers/url-importer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = verifyAdminImportRequest(req);
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as
    | { method?: "links" | "csv"; urls?: string; csv?: string }
    | null;

  if (!body) return NextResponse.json({ error: "Invalid import request." }, { status: 400 });

  if (body.method === "csv") {
    const drafts = importProductsFromProductCsv(body.csv ?? "");
    return NextResponse.json({ drafts, persisted: false });
  }

  const urls = (body.urls ?? "")
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean)
    .slice(0, 25);

  const drafts = await Promise.all(urls.map((url) => importProductFromUrl(url)));
  return NextResponse.json({ drafts, persisted: false });
}
