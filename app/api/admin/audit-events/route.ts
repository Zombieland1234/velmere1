import { createAdminAuditWritePreview, getAdminAuditServerGate } from "@/lib/launch/admin-audit-write-contract";
import { getAdminSessionPreviewFromEnv } from "@/lib/launch/admin-auth-session-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function GET() {
  const gate = getAdminAuditServerGate();
  const sessionPreview = getAdminSessionPreviewFromEnv();
  return jsonResponse(
    {
      ok: false,
      status: "locked_preview",
      route: "/api/admin/audit-events",
      gate,
      sessionPreview,
      reason: "GET is diagnostic only. Audit write uses POST and remains locked until server auth/storage are ready.",
      missing: [
        ...(!gate.hasAuthContext ? ["server auth context"] : []),
        ...(!gate.hasStorage ? ["audit storage"] : []),
      ],
    },
    423,
  );
}

export async function POST(request: Request) {
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const preview = createAdminAuditWritePreview(body);
  return jsonResponse(
    {
      ...preview,
      route: "/api/admin/audit-events",
      mode: "locked-contract-preview",
      storageWritePerformed: false,
    },
    preview.httpStatus,
  );
}
