import { NextResponse } from "next/server";
import { verifyAdminImportRequest } from "@/lib/admin/auth";
import { getStoreCheckoutReadiness } from "@/lib/checkout/readiness";
import type { ProductImportDraft, ProductStatus } from "@/lib/products/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = verifyAdminImportRequest(req);
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as
    | { drafts?: ProductImportDraft[]; status?: ProductStatus }
    | null;

  if (!body?.drafts?.length) {
    return NextResponse.json({ error: "No drafts were provided." }, { status: 400 });
  }

  const requestedStatus = body.status === "active" ? "active" : "coming_soon";
  const results = body.drafts.map((draft) => {
    const readiness = getStoreCheckoutReadiness(draft.product);
    const canPublishActive = draft.validationErrors.length === 0 && readiness.enabled;

    return {
      draftId: draft.draftId,
      status: requestedStatus === "active" && canPublishActive ? "active" : "coming_soon",
      persisted: false,
      warning:
        "No production database is configured. Use scripts/import-products.ts to generate lib/products/catalog.generated.ts locally, then review and commit it.",
      activeBlocked: requestedStatus === "active" && !canPublishActive,
      blockedReasons:
        requestedStatus === "active"
          ? [...draft.validationErrors, ...readiness.reasons.map((reason) => reason.message)]
          : [],
    };
  });

  return NextResponse.json({
    results,
    persisted: false,
    message: "Draft publish was validated but not persisted because this MVP uses a static catalog.",
  });
}
