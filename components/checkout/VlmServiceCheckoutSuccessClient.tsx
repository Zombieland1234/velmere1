"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getVlmPaidProduct,
  normalizePaidContext,
  normalizeVlmPaidProductId,
  type VlmPaidAccessContext,
} from "@/lib/commerce/pass2024-vlm-paid-access";
import { writeVlmPaidAccessToken } from "@/lib/commerce/pass2024-vlm-paid-access-client";

type State = "idle" | "verifying" | "ready" | "error";

type VerifyResponse = {
  ok?: boolean;
  accessToken?: string;
  expiresAt?: string;
  context?: Partial<VlmPaidAccessContext>;
  error?: string;
};

export default function VlmServiceCheckoutSuccessClient({
  locale,
  sessionId,
  productId,
  returnPath,
}: {
  locale: string;
  sessionId?: string;
  productId?: string;
  returnPath?: string;
}) {
  const normalizedProductId = normalizeVlmPaidProductId(productId);
  const product = useMemo(
    () => (normalizedProductId ? getVlmPaidProduct(normalizedProductId, locale) : null),
    [locale, normalizedProductId],
  );
  const [state, setState] = useState<State>(normalizedProductId && sessionId ? "verifying" : "idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!normalizedProductId || !sessionId) return;
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const context = normalizePaidContext({
      surface: product?.accessScope === "audit_advanced_human_review" ? "audit" : product?.accessScope === "vlm_advanced_pdf" ? "browser" : "shield",
      locale: locale === "pl" || locale === "de" || locale === "en" ? locale : "en",
      assetId: params.get("assetId") || undefined,
      symbol: params.get("symbol") || undefined,
      depth: params.get("depth") === "advanced" ? "advanced" : product?.accessScope === "vlm_advanced_pdf" || product?.accessScope === "vlm_advanced_analysis" || product?.accessScope === "audit_advanced_human_review" ? "advanced" : undefined,
      requestId: params.get("requestId") || undefined,
      returnPath,
    }, locale);
    fetch("/api/checkout/vlm-service/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, productId: normalizedProductId, locale, context }),
    })
      .then((response) => response.json() as Promise<VerifyResponse>)
      .then((payload) => {
        if (!active) return;
        if (!payload.ok || !payload.accessToken) throw new Error(payload.error || "verify_failed");
        const storageContext = normalizePaidContext(payload.context || context, locale);
        writeVlmPaidAccessToken(normalizedProductId, storageContext, payload.accessToken);
        window.dispatchEvent(new CustomEvent("velmere:paid-access", { detail: { productId: normalizedProductId, context: storageContext } }));
        setMessage(payload.expiresAt ? `Access saved until ${payload.expiresAt.slice(0, 10)}.` : "Access saved on this device.");
        setState("ready");
      })
      .catch((error) => {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : "Payment verification failed.");
        setState("error");
      });
    return () => {
      active = false;
    };
  }, [locale, normalizedProductId, product?.accessScope, returnPath, sessionId]);

  if (!product) return null;

  const labels = locale === "pl"
    ? {
        title: "Dostęp VLM",
        verifying: "Potwierdzamy płatność i zapisujemy dostęp na tym urządzeniu.",
        ready: "Dostęp zapisany. Możesz wrócić i uruchomić płatną warstwę.",
        error: "Płatność nie została jeszcze potwierdzona albo brakuje konfiguracji dostępu.",
        back: "Wróć do Velmère",
      }
    : locale === "de"
      ? {
          title: "VLM Access",
          verifying: "Zahlung wird geprüft und Access auf diesem Gerät gespeichert.",
          ready: "Access gespeichert. Du kannst zurückgehen und die bezahlte Ebene starten.",
          error: "Zahlung wurde noch nicht bestätigt oder Access-Konfiguration fehlt.",
          back: "Zurück zu Velmère",
        }
      : {
          title: "VLM access",
          verifying: "Verifying payment and saving access on this device.",
          ready: "Access saved. You can return and run the paid layer.",
          error: "Payment is not confirmed yet or access configuration is missing.",
          back: "Return to Velmère",
        };

  return (
    <div className="mt-5 rounded-2xl border border-cyan-200/[0.14] bg-cyan-300/[0.04] p-4 text-left" data-pass2024-vlm-service-access="checkout-success-token-store">
      <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-100/[0.70]">{labels.title} · {product.shortLabel}</p>
      <p className="mt-2 text-xs leading-6 text-white/[0.58]">
        {state === "verifying" ? labels.verifying : state === "ready" ? labels.ready : labels.error}
      </p>
      {message ? <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.38]">{message}</p> : null}
      {returnPath?.startsWith("/") ? (
        <a href={returnPath} className="mt-4 inline-flex rounded-full border border-cyan-200/[0.18] bg-cyan-300/[0.055] px-4 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-cyan-100">
          {labels.back}
        </a>
      ) : null}
    </div>
  );
}
