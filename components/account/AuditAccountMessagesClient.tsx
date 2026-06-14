"use client";

import { useEffect, useMemo, useState } from "react";
import { FileSearch, MessageSquareText, ShieldCheck } from "lucide-react";
import { useLocale } from "next-intl";
import {
  buildDefaultAuditAccountMessages,
  type VlmAuditAccountMessage,
} from "@/lib/security/pass2023-vlm-audit-product";

const AUDIT_MESSAGES_STORAGE_KEY = "velmere.audit.account.messages.v1";

const copy = {
  pl: {
    title: "Wiadomości audytowe",
    body: "Tutaj trafiają zgłoszenia Basic Audit i Advanced Audit. Basic ma status do 24h, a Advanced czeka na ręczną weryfikację Velmère.",
    empty: "Brak nowych wiadomości audytowych. Wyślij zgłoszenie na stronie Velmère Audit.",
    status: "status",
    eta: "termin",
    request: "request id",
    next: "następne kroki",
  },
  en: {
    title: "Audit messages",
    body: "Basic Audit and Advanced Audit requests appear here. Basic targets 24h delivery, while Advanced waits for Velmère human review.",
    empty: "No new audit messages. Submit a request on the Velmère Audit page.",
    status: "status",
    eta: "eta",
    request: "request id",
    next: "next steps",
  },
  de: {
    title: "Audit Nachrichten",
    body: "Basic Audit und Advanced Audit Anfragen erscheinen hier. Basic zielt auf 24h Lieferung, Advanced wartet auf Velmère Human Review.",
    empty: "Keine neuen Audit Nachrichten. Sende eine Anfrage auf der Velmère Audit Seite.",
    status: "status",
    eta: "eta",
    request: "request id",
    next: "nächste Schritte",
  },
} as const;

function resolveLocale(locale: string): keyof typeof copy {
  return locale === "pl" || locale === "de" || locale === "en" ? locale : "en";
}

function readStoredMessages(): VlmAuditAccountMessage[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(AUDIT_MESSAGES_STORAGE_KEY) || "[]") as VlmAuditAccountMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function AuditAccountMessagesClient() {
  const locale = resolveLocale(useLocale());
  const t = copy[locale];
  const fallback = useMemo(() => buildDefaultAuditAccountMessages(locale), [locale]);
  const [messages, setMessages] = useState<VlmAuditAccountMessage[]>(fallback);

  useEffect(() => {
    const refresh = () => {
      const stored = readStoredMessages();
      setMessages(stored.length > 0 ? stored : fallback);
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("velmere:audit-message", refresh as EventListener);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("velmere:audit-message", refresh as EventListener);
    };
  }, [fallback]);

  return (
    <div className="mt-7 grid gap-4" data-pass2023-account-audit-messages="basic-advanced-delivery-inbox">
      <div className="rounded-2xl border border-cyan-200/[0.14] bg-cyan-200/[0.035] p-6">
        <div className="flex items-center gap-2 text-velmere-gold">
          <MessageSquareText className="h-5 w-5" />
          <p className="font-mono text-[10px] uppercase tracking-[0.2em]">Velmère Audit</p>
        </div>
        <h2 className="mt-4 text-3xl tracking-[-0.04em] text-white">{t.title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-velmere-muted">{t.body}</p>
      </div>

      {messages.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.10] bg-black/[0.20] p-6 text-sm text-velmere-muted">{t.empty}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {messages.map((message) => (
            <article key={message.id} className="rounded-2xl border border-white/[0.10] bg-black/[0.20] p-5">
              <div className="flex items-center justify-between gap-3">
                <FileSearch className="h-5 w-5 text-cyan-100" />
                <span className="rounded-full border border-white/[0.10] bg-white/[0.025] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.48]">
                  {message.packageLabel}
                </span>
              </div>
              <h3 className="mt-4 text-xl font-semibold tracking-[-0.03em] text-white">{message.title}</h3>
              <p className="mt-3 text-sm leading-7 text-velmere-muted">{message.body}</p>
              <div className="mt-5 grid gap-2 md:grid-cols-3">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
                  <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/[0.32]">{t.status}</p>
                  <p className="mt-1 text-xs text-white/[0.68]">{message.status}</p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
                  <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/[0.32]">{t.eta}</p>
                  <p className="mt-1 text-xs text-white/[0.68]">{message.eta}</p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3">
                  <p className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/[0.32]">{t.request}</p>
                  <p className="mt-1 truncate font-mono text-xs text-white/[0.68]">{message.requestId}</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-velmere-gold/[0.12] bg-velmere-gold/[0.04] p-3">
                <div className="flex items-center gap-2 text-velmere-gold">
                  <ShieldCheck className="h-4 w-4" />
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em]">{t.next}</p>
                </div>
                <div className="mt-3 grid gap-2">
                  {message.nextSteps.map((step) => (
                    <p key={step} className="text-xs leading-6 text-white/[0.54]">{step}</p>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
