import { NextResponse } from "next/server";
import { z } from "zod";
import { getProfile, updateProfile } from "@/lib/db/profile-service";
import { rateLimit, requireVelmereSession } from "@/lib/api/request-guards";

export const dynamic = "force-dynamic";

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(48).default("Velmère Member"),
  handle: z.string().trim().min(2).max(32).regex(/^[a-zA-Z0-9._-]+$/).default("velmere.member"),
  bio: z.string().trim().max(240).default(""),
  lastNameChange: z.string().datetime().optional(),
});

export async function GET() {
  const result = await getProfile();
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request) {
  try {
    const sessionGate = requireVelmereSession(request);
    if (sessionGate.response) return sessionGate.response;

    const limited = rateLimit(request, "profile", 10, 60_000);
    if (limited) return limited;

    const payload = profileSchema.parse(await request.json());
    const result = await updateProfile(sessionGate.session.id, {
      displayName: payload.displayName,
      handle: payload.handle.replace(/^@/, "") || "velmere.member",
      bio: payload.bio,
      lastNameChange: payload.lastNameChange ?? new Date().toISOString(),
    });
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION_FAILED", issues: (error as { flatten: () => unknown }).flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update profile" }, { status: 500 });
  }
}
