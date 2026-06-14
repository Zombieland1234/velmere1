import {
  applySoftRateLimit,
  assertAllowedMethods,
  assertSameOriginRequest,
  rejectLargeContentLength,
  sanitizeBoundedParam,
  sanitizeEmailAddress,
  securityJson,
} from "@/lib/security/api-guard";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_FORM_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const methodGuard = assertAllowedMethods(request, ["POST"]);
  if (methodGuard) return methodGuard;

  const originGuard = assertSameOriginRequest(request, { allowMissingOrigin: true });
  if (originGuard) return originGuard;

  const sizeGuard = rejectLargeContentLength(request, MAX_FORM_BYTES);
  if (sizeGuard) return sizeGuard;

  const rateLimit = applySoftRateLimit(request, {
    keyPrefix: "contact-message",
    limit: 8,
    windowMs: 60_000,
  });
  if (!rateLimit.ok) return rateLimit.response;

  const form = await request.formData();
  const name = sanitizeBoundedParam(String(form.get("name") ?? "Anonymous"), {
    maxLength: 120,
    fallback: "Anonymous",
  });
  const email = sanitizeEmailAddress(String(form.get("email") ?? ""), 160);
  const subject = sanitizeBoundedParam(String(form.get("subject") ?? "Velmère message"), {
    maxLength: 180,
    fallback: "Velmère message",
  });
  const message = sanitizeBoundedParam(String(form.get("message") ?? ""), {
    maxLength: 6000,
    fallback: "",
  });
  const attachment = form.get("attachment");

  if (!subject.trim() || !message.trim()) {
    return securityJson({ error: "missing_fields" }, { status: 400 });
  }

  const fileInfo = attachment instanceof File && attachment.size > 0
    ? { name: attachment.name, type: attachment.type, size: attachment.size }
    : null;

  if (fileInfo && fileInfo.size > MAX_FILE_BYTES) {
    return securityJson({ error: "file_too_large" }, { status: 413 });
  }

  const to = process.env.CONTACT_TO_EMAIL || "velmere141@gmail.com";
  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL || "Velmère <onboarding@resend.dev>",
        to,
        subject: `[VELMÈRE] ${subject}`,
        text: `Name: ${name}\nEmail: ${email || "not provided"}\nAttachment: ${fileInfo ? `${fileInfo.name} (${fileInfo.size} bytes)` : "none"}\n\n${message}`,
      }),
    });

    if (!response.ok) {
      return securityJson({ error: "mail_provider_failed" }, { status: 502 });
    }
  }

  return securityJson({ ok: true, delivered: Boolean(resendKey), to, file: fileInfo });
}
