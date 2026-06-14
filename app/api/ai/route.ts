import { verifyAdminImportRequest } from "@/lib/admin/auth";
import { generateGeminiAdminText } from "@/lib/ai/gemini";
import {
  applySoftRateLimit,
  assertAllowedMethods,
  rejectLargeContentLength,
  securityJson,
} from "@/lib/security/api-guard";

export const runtime = "nodejs";

type AiRequestBody = {
  task?: "product_description" | "rewrite_copy" | "alt_text" | "import_cleanup";
  locale?: "pl" | "en" | "de";
  input?: string;
};

export async function POST(req: Request) {
  const methodGuard = assertAllowedMethods(req, ["POST"]);
  if (methodGuard) return methodGuard;

  const sizeGuard = rejectLargeContentLength(req, 64 * 1024);
  if (sizeGuard) return sizeGuard;

  const rateLimit = applySoftRateLimit(req, {
    keyPrefix: "admin-ai",
    limit: 20,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) return rateLimit.response;

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return securityJson({ error: "Missing GEMINI_API_KEY on server." }, { status: 500 });
  }

  const auth = verifyAdminImportRequest(req);
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => null)) as AiRequestBody | null;
  const task = body?.task ?? "import_cleanup";
  const locale = body?.locale === "en" || body?.locale === "de" || body?.locale === "pl" ? body.locale : "pl";
  const input = body?.input?.trim();

  if (!input) {
    return securityJson({ error: "Input is required." }, { status: 400 });
  }

  const result = await generateGeminiAdminText({ task, locale, input });
  return securityJson(result.payload, { status: result.status });
}
