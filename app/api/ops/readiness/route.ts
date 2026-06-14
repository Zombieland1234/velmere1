import { createProductionDataBackboneSnapshot } from "@/lib/launch/production-data-backbone";
import { createTelemetryEventPreview } from "@/lib/launch/ops-telemetry";

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
  const snapshot = createProductionDataBackboneSnapshot();
  const telemetryPreview = createTelemetryEventPreview("admin_audit_preview_requested", {
    surface: "admin",
    mode: "preview",
    status: snapshot.summary.p0Open > 0 ? "blocked" : "review",
    target: "ops-readiness-route",
    score: snapshot.summary.averageProgress,
  });

  return jsonResponse({
    ok: false,
    mode: "readiness_preview_only",
    route: "/api/ops/readiness",
    snapshot,
    telemetryPreview,
    storageWritePerformed: false,
    productionBoundary: "This route is diagnostic only. It does not store audit events and does not connect a telemetry vendor.",
  }, 423);
}
