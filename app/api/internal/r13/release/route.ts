import { createHash, timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
const digest = (value: string) => createHash("sha256").update(value).digest();

// Infrastructure-only identity endpoint. Never creates a session or grants a tier.
export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") return reply(404, { error: "not_found" });
  const expected = process.env.R13_DIAGNOSTICS_TOKEN ?? "";
  if (expected.length < 32 || expected.length > 256) return reply(503, { error: "diagnostics_unavailable" });
  const authorization = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([A-Za-z0-9_-]{32,256})$/.exec(authorization);
  if (!match || !timingSafeEqual(digest(match[1]), digest(expected))) return reply(401, { error: "authentication_required" });
  const commit = process.env.VERCEL_GIT_COMMIT_SHA ?? "";
  const repo = `${process.env.VERCEL_GIT_REPO_OWNER ?? ""}/${process.env.VERCEL_GIT_REPO_SLUG ?? ""}`;
  const branch = process.env.VERCEL_GIT_COMMIT_REF ?? "";
  if (!/^[a-f0-9]{40}$/.test(commit) || repo !== "Zombieland1234/velmere1" || !/^r13\/[A-Za-z0-9_./-]{1,180}$/.test(branch)) {
    return reply(503, { error: "release_identity_unavailable" });
  }
  return reply(200, { schema: "velmere.r13.preview-identity.v1", repo, branch, commit, environment: "preview", releaseDecision: "NO_GO", sourceOfIdentity: "platform_environment_not_independent_attestation" });
}
export async function POST() { return reply(405, { error: "method_not_allowed" }); }
