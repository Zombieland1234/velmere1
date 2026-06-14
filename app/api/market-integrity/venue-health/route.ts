import { NextResponse } from "next/server";
import {
  pass461VenueHealthContract,
  resolvePass461VenueHealthWithFallback,
} from "@/lib/market-integrity/pass461-venue-health-runtime";
import {
  buildPass462CrossVenueComparison,
  pass462CrossVenueConsensusContract,
  preferredPass462SecondaryVenue,
} from "@/lib/market-integrity/pass462-cross-venue-consensus";
import {
  normalizePass463AssetSymbol,
  pass463CanonicalPairCoverageContract,
} from "@/lib/market-integrity/pass463-canonical-pair-coverage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = (url.searchParams.get("venue") || "").toLowerCase();
  const supported = ["binance", "mexc", "coinbase"] as const;
  const compare = (url.searchParams.get("compare") || "").toLowerCase();
  const assetSymbol = normalizePass463AssetSymbol(
    url.searchParams.get("asset") || url.searchParams.get("symbol") || "BTC",
  );
  if (!supported.includes(requested as (typeof supported)[number])) {
    return NextResponse.json(
      {
        ok: false,
        error: "unsupported_venue",
        supported,
        contract: pass461VenueHealthContract,
      },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const defaultComparison = preferredPass462SecondaryVenue(
      requested as (typeof supported)[number],
      assetSymbol,
    );
    const comparisonVenue =
      supported.includes(compare as (typeof supported)[number]) && compare !== requested
        ? compare
        : defaultComparison;
    const [snapshot, secondary] = await Promise.all([
      resolvePass461VenueHealthWithFallback(requested, assetSymbol),
      comparisonVenue
        ? resolvePass461VenueHealthWithFallback(comparisonVenue, assetSymbol)
        : Promise.resolve(null),
    ]);
    const comparison = snapshot
      ? buildPass462CrossVenueComparison(snapshot, secondary)
      : null;
    return NextResponse.json(
      {
        ok: Boolean(snapshot),
        generatedAt: new Date().toISOString(),
        contract: pass461VenueHealthContract,
        crossVenueContract: pass462CrossVenueConsensusContract,
        pairCoverageContract: pass463CanonicalPairCoverageContract,
        assetSymbol,
        snapshot,
        secondary,
        comparison,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        generatedAt: new Date().toISOString(),
        contract: pass461VenueHealthContract,
        pairCoverageContract: pass463CanonicalPairCoverageContract,
        assetSymbol,
        error:
          error instanceof Error
            ? error.message.slice(0, 180)
            : "venue_health_probe_failed",
      },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
