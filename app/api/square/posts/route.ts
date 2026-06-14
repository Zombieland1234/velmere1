import { NextResponse } from "next/server";
import { z } from "zod";
import { createSquarePost, getSquarePosts } from "@/lib/db/square-service";
import { rateLimit, requireVelmereSession } from "@/lib/api/request-guards";

export const dynamic = "force-dynamic";

const LOCALES = new Set(["en", "pl", "de"]);

const postSchema = z.object({
  locale: z.string().default("en").transform((value: string) => (LOCALES.has(value) ? value : "en")),
  title: z.string().trim().min(2).max(96).default("Velmère Square Signal"),
  body: z.string().trim().min(1).max(1200),
  imageUrl: z.string().url().max(500).optional().or(z.literal("").transform(() => undefined)),
  tags: z.array(z.string().trim().max(32)).max(6).default([]),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") ?? "en";
  const result = await getSquarePosts(locale);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    const sessionGate = requireVelmereSession(request);
    if (sessionGate.response) return sessionGate.response;

    const limited = rateLimit(request, "square-posts", 8, 60_000);
    if (limited) return limited;

    const payload = postSchema.parse(await request.json());
    const result = await createSquarePost({
      locale: payload.locale,
      title: payload.title,
      body: payload.body,
      authorName: sessionGate.session.displayName,
      authorHandle: sessionGate.session.handle,
      imageUrl: payload.imageUrl,
      tags: payload.tags,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION_FAILED", issues: (error as { flatten: () => unknown }).flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create post" }, { status: 500 });
  }
}
