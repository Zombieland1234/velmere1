import { NextResponse } from "next/server";
import { z } from "zod";
import { createSquareComment } from "@/lib/db/square-service";
import { rateLimit, requireVelmereSession } from "@/lib/api/request-guards";

export const dynamic = "force-dynamic";

const commentSchema = z.object({
  postId: z.string().trim().min(1).max(96),
  body: z.string().trim().min(1).max(600),
});

export async function POST(request: Request) {
  try {
    const sessionGate = requireVelmereSession(request);
    if (sessionGate.response) return sessionGate.response;

    const limited = rateLimit(request, "square-comments", 20, 60_000);
    if (limited) return limited;

    const payload = commentSchema.parse(await request.json());
    const result = await createSquareComment({
      postId: payload.postId,
      body: payload.body,
      authorName: sessionGate.session.displayName,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION_FAILED", issues: (error as { flatten: () => unknown }).flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create comment" }, { status: 500 });
  }
}
