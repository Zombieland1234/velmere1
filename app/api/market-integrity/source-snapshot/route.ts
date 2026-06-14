import {
  createDemoSourceSnapshotBundle,
  createSourceAdapterEnvelope,
  type SourceAdapterPreviewInput,
} from "@/lib/market-integrity/source-adapter-runtime";
import type { MarketIntegritySourceLane } from "@/lib/market-integrity/live-source-adapter-contract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedLanes = new Set<MarketIntegritySourceLane>([
  "market",
  "candles",
  "orderbook",
  "holders",
  "contract",
  "unlocks",
  "osint",
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
  const bundle = createDemoSourceSnapshotBundle();

  return jsonResponse({
    ok: false,
    mode: "source_snapshot_preview_only",
    route: "/api/market-integrity/source-snapshot",
    bundle,
    storageWritePerformed: false,
    productionBoundary:
      "Diagnostic route only. It builds redacted source envelopes and does not write durable snapshots.",
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

  const rawLane = typeof body.lane === "string" ? body.lane : "market";
  const lane = allowedLanes.has(rawLane as MarketIntegritySourceLane) ? rawLane as MarketIntegritySourceLane : "market";
  const previewInput: SourceAdapterPreviewInput = {
    lane,
    adapterId: typeof body.adapterId === "string" ? body.adapterId : undefined,
    receivedAt: typeof body.receivedAt === "string" ? body.receivedAt : undefined,
    mode: typeof body.mode === "string" ? body.mode as SourceAdapterPreviewInput["mode"] : undefined,
    payload: body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
      ? body.payload as Record<string, unknown>
      : body,
  };

  return jsonResponse({
    ok: false,
    mode: "source_snapshot_preview_only",
    route: "/api/market-integrity/source-snapshot",
    snapshot: createSourceAdapterEnvelope(previewInput),
    storageWritePerformed: false,
  }, 423);
}
