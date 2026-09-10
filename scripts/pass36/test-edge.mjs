import { inspectApiEdgeRequest, resolveCanonicalRequestOrigins } from "../../lib/security/api-edge-boundary.ts";

const req = new Request("http://localhost:3000/api/search?q=BTC&locale=en", {
  headers: {
    host: "localhost:3000",
    origin: "http://localhost:3000"
  }
});

console.log("=== TESTING API EDGE BOUNDARY ===");
console.log("process.env.NODE_ENV:", process.env.NODE_ENV);
console.log("process.env.VERCEL_ENV:", process.env.VERCEL_ENV);
console.log("process.env.VELMERE_CANONICAL_ORIGIN:", process.env.VELMERE_CANONICAL_ORIGIN);
console.log("process.env.NEXT_PUBLIC_SITE_URL:", process.env.NEXT_PUBLIC_SITE_URL);
console.log("process.env.VELMERE_ALLOWED_ORIGINS:", process.env.VELMERE_ALLOWED_ORIGINS);

const canonical = resolveCanonicalRequestOrigins(req, process.env);
console.log("resolveCanonicalRequestOrigins result:", {
  productionLike: canonical.productionLike,
  origins: Array.from(canonical.origins),
  invalidConfigured: canonical.invalidConfigured
});

const edge = inspectApiEdgeRequest(req, process.env);
console.log("inspectApiEdgeRequest result:", edge);
