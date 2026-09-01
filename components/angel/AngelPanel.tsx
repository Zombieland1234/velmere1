"use client";

import { readBrowserJsonObject } from "@/lib/security/browser-json-response-boundary";
import { reportBrowserBoundaryFailure } from "@/lib/security/browser-error-redaction";
import { createBrowserSecureId } from "@/lib/runtime/browser-secure-id";
import { useEffect, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { DrawerRoot } from "@/components/ui/OverlayPrimitives";
import { VShieldPulse } from "@/components/motion/VelmereAnalysisMarks";
import type { VlmAngelAnswerContract } from "@/lib/intelligence/vlm-standalone-decision-support";
import type { AngelStructuredResponse } from "@/lib/ai/angel-structured-response";

type AngelPanelProps = {
  open: boolean;
  onClose: () => void;
  handoffMessage?: string | null;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  truth?: VlmAngelAnswerContract;
  structured?: AngelStructuredResponse;
};

type AngelResponsePayload = {
  reply?: string;
  error?: string;
  truth?: VlmAngelAnswerContract;
  structured?: AngelStructuredResponse;
};

const MIN_ANGEL_RESPONSE_DISPLAY_MS = 420;

async function readAngelJson(response: Response) {
  return readBrowserJsonObject<AngelResponsePayload>(response, {
    maxBytes: 512 * 1024,
    maxDepth: 16,
    maxNodes: 20_000,
  });
}

export default function AngelPanel({
  open,
  onClose,
  handoffMessage = null,
}: AngelPanelProps) {
  const t = useTranslations("Angel");
  const locale = useLocale();
  const truthCopy = locale === "pl"
    ? {
        boundary: "Granica dowodów Angela",
        withheld: "Wynik wstrzymany",
        bound: "Odpowiedź oparta na dowodach",
        context: "Kontekst",
        next: "Następny bezpieczny krok",
        evidenceMap: "Mapa dowodów",
        severity: "Waga sygnału",
        confidence: "Stan pewności",
        confirmed: "Potwierdzone",
        conflicts: "Konflikty",
        missing: "Brakujące dowody",
        limits: "Ograniczenia",
        checks: "Bezpieczne sprawdzenia",
        aiDisclosure:
          "Rozmawiasz z systemem AI Velmère. Angel dostarcza informacyjne wsparcie decyzyjne oparte na dostępnych dowodach, może się mylić i nie udziela spersonalizowanej porady inwestycyjnej ani prawnej.",
      }
    : locale === "de"
      ? {
          boundary: "Angel-Evidenzgrenze",
          withheld: "Ergebnis zurückgehalten",
          bound: "Evidenzgebundene Antwort",
          context: "Kontext",
          next: "Nächster sicherer Prüfschritt",
          evidenceMap: "Evidenzübersicht",
          severity: "Signalstärke",
          confidence: "Konfidenzstatus",
          confirmed: "Bestätigt",
          conflicts: "Konflikte",
          missing: "Fehlende Nachweise",
          limits: "Einschränkungen",
          checks: "Sichere nächste Prüfungen",
          aiDisclosure:
            "Du interagierst mit einem KI-System von Velmère. Angel bietet evidenzgebundene, informative Entscheidungsunterstützung, kann Fehler machen und erteilt keine personalisierte Anlage- oder Rechtsberatung.",
        }
      : {
          boundary: "Angel evidence boundary",
          withheld: "Evidence withheld",
          bound: "Evidence-bound answer",
          context: "Context",
          next: "Next safe check",
          evidenceMap: "Evidence map",
          severity: "Signal severity",
          confidence: "Confidence state",
          confirmed: "Confirmed",
          conflicts: "Conflicts",
          missing: "Missing proof",
          limits: "Limitations",
          checks: "Next safe checks",
          aiDisclosure:
            "You are interacting with a Velmère AI system. Angel provides evidence-bound informational decision support, may make mistakes, and does not provide personalized investment or legal advice.",
        };
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: t("welcome") },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastHandoffRef = useRef<string | null>(null);
  const angelRequestSeqRef = useRef(0);
  const angelAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        // A browser-generated Angel correlation ID is ephemeral to this mounted tab surface.
        // It is not restored from storage and cannot act as account/session authority.
        setSessionId(createBrowserSecureId("angel-session-ephemeral"));
      } catch {
        setSessionId("");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);


  useEffect(() => {
    if (open) return;
    angelRequestSeqRef.current += 1;
    angelAbortRef.current?.abort();
    angelAbortRef.current = null;
  }, [open]);

  useEffect(() => () => {
    angelRequestSeqRef.current += 1;
    angelAbortRef.current?.abort();
    angelAbortRef.current = null;
  }, []);

  useEffect(() => {
    if (!open || !handoffMessage || lastHandoffRef.current === handoffMessage)
      return;
    lastHandoffRef.current = handoffMessage;
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: handoffMessage,
      },
    ]);
  }, [handoffMessage, open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");
    angelAbortRef.current?.abort();
    const controller = new AbortController();
    const requestId = angelRequestSeqRef.current + 1;
    angelRequestSeqRef.current = requestId;
    angelAbortRef.current = controller;
    setLoading(true);
    try {
      const response = await fetch("/api/angel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: trimmed,
          locale,
          // This surface currently exposes the free evidence-safe lane only.
          // Paid Angel depth must not be inferred from a client omission.
          depth: "basic",
          history: messages,
          sessionId,
        }),
      });
      const [result] = await Promise.all([
        readAngelJson(response),
        new Promise((resolve) => window.setTimeout(resolve, MIN_ANGEL_RESPONSE_DISPLAY_MS)),
      ]);
      if (controller.signal.aborted || angelRequestSeqRef.current !== requestId) return;
      if (!result.ok || !response.ok || typeof result.value.reply !== "string" || !result.value.reply.trim()) {
        reportBrowserBoundaryFailure({
          event: "angel_response_rejected",
          error: new Error(result.ok ? "angel_response_unavailable" : result.code),
        });
        throw new Error("angel_response_unavailable");
      }
      const assistantReply = result.value.reply;
      const truth = result.value.truth?.productId === "angel" ? result.value.truth : undefined;
      const structured = result.value.structured?.productId === "angel"
        && result.value.structured.schemaVersion === "velmere.angel.structured-response.v1"
        ? result.value.structured
        : undefined;
      setMessages((current) => [
        ...current,
        { role: "assistant", content: assistantReply, truth, structured },
      ]);
    } catch (err) {
      if ((err as Error).name !== "AbortError" && angelRequestSeqRef.current === requestId) {
        reportBrowserBoundaryFailure({ event: "angel_request_failed", error: err });
        setError(t("neuralError"));
      }
    } finally {
      if (angelRequestSeqRef.current === requestId) {
        angelAbortRef.current = null;
        setLoading(false);
      }
    }
  };

  return (
    <DrawerRoot
      open={open}
      onClose={onClose}
      closeLabel={t("close")}
      ariaLabel={t("title")}
      motionDuration={0.44}
      surfaceId="velmere-angel-panel"
      surfaceClassName="velmere-side-drawer-panel velmere-angel-panel fixed bottom-4 right-4 top-4 flex w-[min(30rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[1.35rem] border border-white/[0.11] bg-[#0b0b0c] text-[#FFFFF0] shadow-[0_40px_140px_rgba(0,0,0,0.86)] ring-1 ring-white/[0.06]"
      surfaceData={{ surface: "angel", mode: "evidence-bound-basic", aiInteraction: "disclosed" }}
    >
      <header className="relative flex items-start justify-between gap-4 border-b border-white/[0.08] px-5 py-5 before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_18%_10%,rgba(180,180,180,0.09),transparent_42%)]">
        <div className="relative z-[1]">
          <p className="font-sans text-[10px] font-black uppercase tracking-[0.24em] text-[#d4af37]">
            {t("kicker")}
          </p>
          <h2 className="mt-1 font-serif text-2xl leading-tight">
            {t("title")}
          </h2>
          <p className="mt-2 max-w-sm text-xs leading-6 text-white/[0.42]">
            {t("sidePanelHint")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="relative z-[1] inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.10] bg-white/[0.025] text-white/[0.62] transition-colors hover:border-cyan-200/[0.22] hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{t("close")}</span>
        </button>
      </header>

      <div
        data-modal-scroll-region="true"
        className="flex-1 space-y-4 overflow-y-auto overscroll-contain bg-[#080b0d] p-5 touch-pan-y luxury-scrollbar"
      >
        <section
          className="rounded-[1.2rem] border border-cyan-200/[0.12] bg-cyan-200/[0.035] px-4 py-3"
          data-ai-interaction-disclosure="visible"
          data-angel-product-boundary="informational-decision-support"
          aria-label={truthCopy.boundary}
        >
          <p className="text-xs leading-5 text-white/[0.62]">{truthCopy.aiDisclosure}</p>
        </section>

        <div className="space-y-3">
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className="space-y-2">
              <p
                className={`angel-message rounded-2xl px-4 py-3 text-sm leading-7 ${
                  message.role === "assistant"
                    ? "angel-message--assistant mr-6 border border-white/[0.08] bg-white/[0.052] text-white/[0.80]"
                    : "angel-message--user ml-8 border border-white/[0.13] bg-white/[0.065] text-[#FFFFF0]"
                }`}
              >
                {message.content}
              </p>
              {message.role === "assistant" && message.truth ? (
                <section
                  className="mr-6 rounded-2xl border border-white/[0.08] bg-black/[0.28] px-4 py-3"
                  data-angel-customer-truth="r44p35"
                  aria-label={truthCopy.boundary}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/[0.12] px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white/[0.56]">
                      {message.truth.mustAbstain ? truthCopy.withheld : truthCopy.bound}
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.14em] text-white/[0.38]">
                      {truthCopy.context}: {message.truth.reportContextDepth}
                    </span>
                  </div>
                  {message.truth.abstentionReason ? (
                    <p className="mt-2 text-xs leading-5 text-amber-100/[0.72]">
                      {message.truth.abstentionReason}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs leading-5 text-white/[0.54]">
                    {message.truth.truthBoundary}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-white/[0.74]">
                    <span className="font-semibold text-white/[0.84]">{truthCopy.next}:</span>{" "}
                    {message.truth.nextSafeCheck}
                  </p>
                </section>
              ) : null}
              {message.role === "assistant" && message.structured ? (
                <details
                  className="mr-6 rounded-2xl border border-white/[0.08] bg-black/[0.22] px-4 py-3"
                  data-angel-structured-evidence="r44p35"
                >
                  <summary className="cursor-pointer list-none text-[10px] font-black uppercase tracking-[0.16em] text-white/[0.62] marker:hidden">
                    {truthCopy.evidenceMap}
                  </summary>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/[0.12] px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-white/[0.55]">
                      {truthCopy.severity}: {message.structured.severity}
                    </span>
                    <span className="rounded-full border border-white/[0.12] px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-white/[0.55]">
                      {truthCopy.confidence}: {message.structured.confidence.state.replaceAll("_", " ")}
                    </span>
                  </div>
                  {[
                    { label: truthCopy.confirmed, values: message.structured.evidence.confirmedLanes },
                    { label: truthCopy.conflicts, values: message.structured.contradictions },
                    { label: truthCopy.missing, values: message.structured.missingProof },
                    { label: truthCopy.limits, values: message.structured.limitations },
                    { label: truthCopy.checks, values: [message.structured.nextSafeCheck] },
                  ].map(({ label, values }) => values.length ? (
                    <div key={label} className="mt-3">
                      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/[0.42]">{label}</p>
                      <ul className="mt-1 space-y-1 text-xs leading-5 text-white/[0.68]">
                        {values.slice(0, 6).map((value) => <li key={`${label}-${value}`}>• {value}</li>)}
                      </ul>
                    </div>
                  ) : null)}
                </details>
              ) : null}
            </div>
          ))}
          {loading ? (
            <div
              className="angel-thinking-row flex items-center gap-3 px-1 py-1 font-sans text-[10px] uppercase tracking-[0.14em] text-white/[0.54]"
              aria-live="polite"
              data-angel-thinking="v-shield-pulse"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center" aria-hidden="true">
                <VShieldPulse size={48} />
              </span>
              <span>{t("decrypting")}</span>
            </div>
          ) : null}
          <div ref={messagesEndRef} />
        </div>

        {error ? (
          <div className="rounded-2xl border border-amber-200/[0.16] bg-amber-100/[0.045] px-4 py-3 text-sm leading-6 text-amber-50/[0.76]">
            {error}
          </div>
        ) : null}

        <div
          className="rounded-[1.2rem] border border-white/[0.10] bg-white/[0.035] p-3"
          data-angel-evidence-mode="true"
        >
          <p className="font-sans text-[10px] font-black uppercase tracking-[0.18em] text-white/[0.56]">
            {t("evidenceKicker")}
          </p>
          <p className="mt-1 text-xs leading-5 text-white/[0.50]">
            {t("evidenceHint")}
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {[
            [t("fitAction"), t("fitPrompt")],
            [t("tokenAction"), t("tokenPrompt")],
            [t("marketAction"), t("marketPrompt")],
            [t("pdfAction"), t("pdfPrompt")],
          ].map(([label, prompt]) => (
            <button
              key={label}
              type="button"
              onClick={() => sendMessage(prompt)}
              className="min-h-[44px] rounded-full border border-white/[0.10] px-4 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-white/[0.58] transition-colors hover:border-white/[0.22] hover:text-white"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage(input);
        }}
        className="flex gap-2 border-t border-white/[0.08] bg-black/[0.18] p-4"
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t("placeholder")}
          className="angel-input min-h-[44px] flex-1 rounded-full border border-white/[0.10] bg-black/[0.38] px-5 text-sm text-white outline-none placeholder:text-white/[0.34] focus:border-white/[0.28]"
        />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[#d4af37]/[0.30] bg-[#d4af37]/[0.10] text-[#d4af37] disabled:opacity-40"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{t("openLabel")}</span>
        </button>
      </form>
    </DrawerRoot>
  );
}

