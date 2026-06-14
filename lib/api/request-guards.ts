import { NextResponse } from "next/server";

const buckets = new Map<string, { count: number; resetAt: number }>();

export type VelmereSession = {
  id: string;
  displayName: string;
  handle: string;
  source: "preview" | "server";
};

export function getVelmereSession(request: Request): VelmereSession | null {
  const serverSecret = process.env.VELMERE_SERVER_SESSION_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  if (serverSecret && auth === `Bearer ${serverSecret}`) {
    return { id: "server-session", displayName: "Velmère Member", handle: "@member", source: "server" };
  }

  // Preview-only bridge for the current local prototype. Real launch should replace this with Supabase Auth/Auth.js.
  if (request.headers.get("x-velmere-preview-session") === "active") {
    return { id: "preview-session", displayName: "Velmère Preview Member", handle: "@preview-member", source: "preview" };
  }

  return null;
}

export function requireVelmereSession(request: Request): { session: VelmereSession; response: null } | { session: null; response: NextResponse } {
  const session = getVelmereSession(request);
  if (!session) {
    return {
      session: null,
      response: NextResponse.json(
        { error: "AUTH_REQUIRED", message: "Sign in before writing to Velmère Square." },
        { status: 401 },
      ),
    };
  }
  return { session, response: null };
}

export function rateLimit(request: Request, key: string, limit = 12, windowMs = 60_000) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const now = Date.now();
  const bucketKey = `${key}:${ip}`;
  const current = buckets.get(bucketKey);
  if (!current || current.resetAt < now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return null;
  }
  if (current.count >= limit) {
    return NextResponse.json(
      { error: "RATE_LIMITED", message: "Too many actions. Wait before trying again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((current.resetAt - now) / 1000)) } },
    );
  }
  current.count += 1;
  return null;
}
