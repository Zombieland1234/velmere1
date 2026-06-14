import { createStorageWritePreview, type StorageRecordKind } from "@/lib/launch/server-storage-adapter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedKinds = new Set<StorageRecordKind>([
  "audit_event",
  "source_snapshot",
  "order_event",
  "operator_case",
  "telemetry_event",
]);

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
  const preview = createStorageWritePreview({
    kind: "audit_event",
    operatorId: "operator:preview",
    targetId: "diagnostic:storage-preview",
    payload: {
      surface: "admin",
      status: "blocked",
      token: "redacted-by-allowlist",
      email: "operator@example.com",
    },
  });

  return jsonResponse({
    ok: false,
    mode: "storage_preview_only",
    route: "/api/ops/storage-preview",
    preview,
    storageWritePerformed: false,
    productionBoundary: "Diagnostic route only. It never writes durable data.",
  }, 423);
}

export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed as Record<string, unknown>;
  } catch {
    body = {};
  }

  const rawKind = typeof body.kind === "string" ? body.kind : "audit_event";
  const kind = allowedKinds.has(rawKind as StorageRecordKind) ? rawKind as StorageRecordKind : "audit_event";
  const preview = createStorageWritePreview({
    kind,
    operatorId: typeof body.operatorId === "string" ? body.operatorId : undefined,
    targetId: typeof body.targetId === "string" ? body.targetId : undefined,
    idempotencyKey: typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined,
    payload: body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
      ? body.payload as Record<string, unknown>
      : body,
  });

  return jsonResponse({
    ok: false,
    mode: "storage_preview_only",
    route: "/api/ops/storage-preview",
    preview,
    storageWritePerformed: false,
  }, 423);
}
