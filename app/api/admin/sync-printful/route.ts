import { NextResponse } from "next/server";
import { verifyAdminImportRequest } from "@/lib/admin/auth";
import { syncPrintfulProducts } from "@/lib/importers/printful-importer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = verifyAdminImportRequest(req);
  if (!auth.ok) return auth.response;

  const drafts = await syncPrintfulProducts();
  return NextResponse.json({ drafts, persisted: false });
}
