import { NextResponse } from "next/server";

export function verifyAdminImportRequest(req: Request) {
  const token = process.env.ADMIN_IMPORT_TOKEN;
  if (!token) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "ADMIN_IMPORT_TOKEN is not configured on the server." },
        { status: 503 },
      ),
    };
  }

  const authorization = req.headers.get("authorization") ?? "";
  const bearer = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
  const headerToken = req.headers.get("x-admin-import-token") ?? "";
  const provided = bearer || headerToken;

  if (provided !== token) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Invalid admin import token." }, { status: 401 }),
    };
  }

  return { ok: true as const };
}
