"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowRight, BadgeCheck, Brain, FileSearch, Loader2, LockKeyhole, MessageSquareText, Sparkles, X } from "lucide-react";
import { getVlmPaidProduct } from "@/lib/commerce/pass2024-vlm-paid-access";
import { readVlmPaidAccessToken, startVlmServiceCheckout } from "@/lib/commerce/pass2024-vlm-paid-access-client";
import type { AuditReviewLevel, AuditReviewPreview } from "@/lib/security/pass1534-audit-review-flow";
import type { VlmAuditAccountMessage, VlmAuditProductPage } from "@/lib/security/pass2023-vlm-audit-product";

const AUDIT_MESSAGES_STORAGE_KEY = "velmere.audit.account.messages.v1";

type AuditWatchResponse = {
  ok?: boolean;
  preview?: AuditReviewPreview;
  accountMessage?: VlmAuditAccountMessage;
  publicReportRoute?: string;
};

type IntakeState = {
  query: string;
  contactEmail: string;
  reviewLevel: AuditReviewLevel;
};

function readMessages(): VlmAuditAccountMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(AUDIT_MESSAGES_STORAGE_KEY) || "[]") as VlmAuditAccountMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMessage(message: VlmAuditAccountMessage) {
  if (typeof window === "undefined") return;
  const existing = readMessages().filter((item) => item.id !== message.id);
  window.localStorage.setItem(AUDIT_MESSAGES_STORAGE_KEY, JSON.stringify([message, ...existing].slice(0, 12)));
  window.dispatchEvent(new CustomEvent("velmere:audit-message", { detail: message }));
}

function splitQuery(query: string) {
  const text = query.trim();
  const isUrl = /^https?:\/\//i.test(text);
  const isContract = /^0x[a-fA-F0-9]{20,64}$/.test(text);
  return {
    projectName: !isUrl && !isContract ? text.slice(0, 80) : undefined,
    contractAddress: isContract ? text : undefined,
    auditUrl: isUrl ? text : undefined,
  };
}

function toneClass(tone: string) {
  if (tone === "good") return "border-emerald-300/[0.16] bg-emerald-300/[0.045] text-emerald-100";
  if (tone === "risk") return "border-rose-300/[0.16] bg-rose-300/[0.045] text-rose-100";
  if (tone === "watch") return "border-amber-300/[0.16] bg-amber-300/[0.045] text-amber-100";
  return "border-white/[0.10] bg-white/[0.025] text-white/[0.62]";
}

type AuditDemoProject = VlmAuditProductPage["demoProjects"][number];

function auditChatLines(project: AuditDemoProject, locale: string) {
  const asset = project.asset || "project";
  if (locale === "pl") {
    return [
      `VLM Brain sprawdza ${asset}: publiczny audyt nie jest traktowany jako koniec analizy.`,
      `Najpierw porównuję scope raportu z widocznym ryzykiem on-chain: ${project.publicAudit}.`,
      `Status VLM: ${project.vlmStatus}. To znaczy, że wynik wymaga spokojnej weryfikacji, bez publikowania instrukcji exploita.`,
      `Główny powód: ${project.summary}`,
      "Shadow Review szuka przeciwnej tezy, a końcowy raport trafia do wiadomości na koncie klienta.",
    ];
  }
  if (locale === "de") {
    return [
      `VLM Brain prüft ${asset}: ein öffentliches Audit ist nicht automatisch das Ende der Analyse.`,
      `Zuerst vergleiche ich den Report-Scope mit sichtbaren On-chain-Risiken: ${project.publicAudit}.`,
      `VLM Status: ${project.vlmStatus}. Details bleiben redacted, bis eine verantwortliche Prüfung möglich ist.`,
      `Hauptgrund: ${project.summary}`,
      "Shadow Review testet die Gegenthese; der Bericht landet als Nachricht im Kundenkonto.",
    ];
  }
  return [
    `VLM Brain is reviewing ${asset}: a public audit badge is not treated as the final answer.`,
    `First I compare audit scope against visible on-chain risk: ${project.publicAudit}.`,
    `VLM status: ${project.vlmStatus}. Sensitive details stay redacted until responsible verification.`,
    `Main reason: ${project.summary}`,
    "Shadow Review tests the opposite thesis; the final report is delivered as an account message.",
  ];
}

export default function VlmAuditCommandClient({ page }: { page: VlmAuditProductPage }) {
  const [form, setForm] = useState<IntakeState>({ query: "", contactEmail: "", reviewLevel: "basic_review" });
  const [status, setStatus] = useState<"idle" | "loading" | "checkout" | "ready" | "error">("idle");
  const [preview, setPreview] = useState<AuditReviewPreview | null>(null);
  const [message, setMessage] = useState<VlmAuditAccountMessage | null>(null);
  const auditTypedPhrases = useMemo(() => {
    if (page.locale === "pl") return ["Weryfikujemy.", "Analizujemy.", "Chronimy."];
    if (page.locale === "de") return ["Wir verifizieren.", "Wir analysieren.", "Wir schuetzen."];
    return ["We verify.", "We analyze.", "We protect."];
  }, [page.locale]);
  const [typedLine, setTypedLine] = useState("");
  const [selectedDemoProject, setSelectedDemoProject] = useState<AuditDemoProject | null>(null);
  const [auditChatText, setAuditChatText] = useState("");
  const [auditChatThinking, setAuditChatThinking] = useState(false);

  useEffect(() => {
    let disposed = false;
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (disposed) return;
      const phrase = auditTypedPhrases[phraseIndex] ?? "";
      setTypedLine(phrase.slice(0, charIndex));

      let delay = deleting ? 34 : 58;
      if (!deleting && charIndex < phrase.length) {
        charIndex += 1;
      } else if (!deleting) {
        deleting = true;
        delay = 1120;
      } else if (charIndex > 0) {
        charIndex -= 1;
      } else {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % Math.max(1, auditTypedPhrases.length);
        delay = 260;
      }
      timer = setTimeout(tick, delay);
    };

    timer = setTimeout(tick, 120);
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [auditTypedPhrases]);

  useEffect(() => {
    if (!selectedDemoProject) {
      setAuditChatText("");
      setAuditChatThinking(false);
      return undefined;
    }
    const lines = auditChatLines(selectedDemoProject, page.locale);
    const fullText = lines.join("\n\n");
    let disposed = false;
    let index = 0;
    setAuditChatText("");
    setAuditChatThinking(true);
    const startTimer = window.setTimeout(() => {
      if (disposed) return;
      const tick = () => {
        if (disposed) return;
        index = Math.min(fullText.length, index + 2);
        setAuditChatText(fullText.slice(0, index));
        if (index < fullText.length) {
          window.setTimeout(tick, 18);
        } else {
          setAuditChatThinking(false);
        }
      };
      tick();
    }, 520);
    return () => {
      disposed = true;
      window.clearTimeout(startTimer);
    };
  }, [page.locale, selectedDemoProject]);

  const selectedPackage = useMemo(() => {
    if (form.reviewLevel === "advanced_review") return page.packages.find((item) => item.id === "advanced_human_review") ?? page.packages[1];
    return page.packages.find((item) => item.id === "basic_audit") ?? page.packages[0];
  }, [form.reviewLevel, page.packages]);
  const advancedAuditProduct = useMemo(() => getVlmPaidProduct("vlm_advanced_audit_human_review", page.locale), [page.locale]);

  async function submit(level: AuditReviewLevel, paidAccessToken = "") {
    setStatus("loading");
    const parts = splitQuery(form.query);
    try {
      const response = await fetch("/api/security/audit-watch", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(paidAccessToken ? { "x-velmere-paid-access": paidAccessToken } : {}),
        },
        body: JSON.stringify({
          ...parts,
          chain: "ethereum",
          contactEmail: form.contactEmail,
          reviewLevel: level,
          locale: page.locale,
        }),
      });
      const payload = (await response.json()) as AuditWatchResponse;
      if (!response.ok || !payload.preview) throw new Error("Audit request failed");
      setPreview(payload.preview);
      if (payload.accountMessage) {
        setMessage(payload.accountMessage);
        writeMessage(payload.accountMessage);
      }
      setForm((current) => ({ ...current, reviewLevel: level }));
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  async function startAdvancedAuditCheckout() {
    setStatus("checkout");
    const parts = splitQuery(form.query);
    const context = {
      surface: "audit" as const,
      locale: page.locale,
      assetId: parts.contractAddress || parts.auditUrl || parts.projectName || "audit-request",
      symbol: parts.projectName,
      depth: "advanced" as const,
      returnPath: `/${page.locale}/security/audits`,
    };
    const paidAccessToken = readVlmPaidAccessToken("vlm_advanced_audit_human_review", context);
    if (paidAccessToken) {
      await submit("advanced_review", paidAccessToken);
      return;
    }
    try {
      await startVlmServiceCheckout({
        productId: "vlm_advanced_audit_human_review",
        locale: page.locale,
        context,
      });
    } catch {
      setStatus("error");
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit(form.reviewLevel);
  }

  return (
    <div className="velmere-audit-watch-wide" data-pass2023-audit-command="clean-browser-style-intake" data-pass2027-audit-watch-wide="true">
      <section id="review-console" className="velmere-audit-hero mx-auto w-full max-w-[calc(100vw-1.5rem)] pt-6 text-center">
        <p
          className="velmere-audit-typing-line mx-auto inline-flex min-h-6 items-center justify-center gap-1 font-mono text-[10px] uppercase tracking-[0.22em] text-velmere-gold/[0.92]"
          aria-label={page.eyebrow}
        >
          <span>{typedLine}</span>
          <span className="velmere-audit-typing-cursor" aria-hidden="true" />
        </p>
        <h1 className="mx-auto mt-5 max-w-5xl font-serif text-[clamp(3rem,7.2vw,6.8rem)] leading-[0.92] tracking-[-0.065em] text-white">
          {page.title}
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-sm leading-7 text-white/[0.58] md:text-base md:leading-8">
          {page.subtitle}
        </p>

        <form onSubmit={onSubmit} className="velmere-audit-command-form mx-auto mt-9 w-full max-w-5xl rounded-[2rem] border border-white/[0.10] bg-[#07090c] p-3 shadow-velmere-card">
          <label className="velmere-audit-search-label flex min-h-16 items-center gap-3 rounded-[1.55rem] border border-white/[0.08] bg-black/[0.28] px-4 text-left focus-within:border-cyan-200/[0.28]">
            <FileSearch className="h-5 w-5 shrink-0 text-cyan-100" aria-hidden="true" />
            <input
              value={form.query}
              onChange={(event) => setForm((current) => ({ ...current, query: event.target.value }))}
              placeholder={page.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/[0.28]"
            />
          </label>
          <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
            <input
              value={form.contactEmail}
              onChange={(event) => setForm((current) => ({ ...current, contactEmail: event.target.value }))}
              placeholder="email for delivery / optional"
              className="min-h-12 rounded-full border border-white/[0.08] bg-black/[0.22] px-4 text-sm text-white outline-none placeholder:text-white/[0.24] focus:border-cyan-200/[0.24]"
            />
            <button
              type="button"
              onClick={() => void submit("basic_review")}
              disabled={!form.query.trim() || status === "loading" || status === "checkout"}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-cyan-200/[0.18] bg-cyan-300/[0.055] px-5 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-200/[0.30] disabled:opacity-45"
            >
              {page.submitBasic}
            </button>
            <button
              type="button"
              onClick={() => void startAdvancedAuditCheckout()}
              disabled={!form.query.trim() || status === "loading" || status === "checkout"}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-velmere-gold/[0.26] bg-velmere-gold/[0.10] px-5 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-velmere-gold transition hover:bg-velmere-gold/[0.16] disabled:opacity-45"
            >
              {advancedAuditProduct.checkoutCta}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <p className="px-3 pb-1 pt-4 text-left text-xs leading-6 text-white/[0.42]">{page.searchHelper}</p>
        </form>
      </section>

      <section className="velmere-audit-offer-grid mx-auto mt-8 grid w-full max-w-[calc(100vw-1.5rem)] gap-4 md:grid-cols-3">
        {page.packages.map((pkg) => (
          <article key={pkg.id} className="rounded-[1.7rem] border border-white/[0.10] bg-[#07090c] p-5">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-velmere-gold">{pkg.price}</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{pkg.label}</h2>
            <p className="mt-2 text-sm leading-6 text-cyan-100/[0.80]">{pkg.headline}</p>
            <p className="mt-4 text-xs leading-6 text-white/[0.54]">{pkg.body}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {pkg.deliverables.slice(0, 4).map((item) => (
                <span key={item} className="rounded-full border border-white/[0.08] bg-black/[0.18] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.45]">
                  {item}
                </span>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="velmere-audit-brain-grid mx-auto mt-8 grid w-full max-w-[calc(100vw-1.5rem)] gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(22rem,.75fr)]">
        <article className="rounded-[1.9rem] border border-white/[0.10] bg-[#07090c] p-6 md:p-8">
          <div className="flex items-center gap-3 text-velmere-gold">
            <Sparkles className="h-5 w-5" />
            <p className="font-mono text-[10px] uppercase tracking-[0.18em]">VLM Brain under the audit</p>
          </div>
          <h2 className="mt-4 font-serif text-4xl tracking-[-0.05em] text-white">{page.tableTitle}</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/[0.56]">{page.tableBody}</p>
          <div className="mt-6 overflow-hidden rounded-[1.35rem] border border-white/[0.09]" data-pass2028-audit-demo-projects="click-opens-brain-chat">
            {page.demoProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => setSelectedDemoProject(project)}
                className="grid w-full gap-3 border-b border-white/[0.07] bg-black/[0.18] p-4 text-left transition last:border-b-0 hover:bg-white/[0.035] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-200/[0.28] md:grid-cols-[6rem_7rem_9rem_9rem_1fr] md:items-center"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-white">{project.asset}</p>
                <p className="text-xs text-white/[0.45]">{project.chain}</p>
                <p className="text-xs text-white/[0.55]">{project.publicAudit}</p>
                <span className={`w-fit rounded-full border px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.12em] ${toneClass(project.tone)}`}>
                  {project.vlmStatus}
                </span>
                <span className="text-xs leading-6 text-white/[0.55]">{project.summary}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-xs leading-6 text-white/[0.42]">{page.safetyBoundary}</p>
        </article>

        <aside className="grid gap-4">
          <div className="rounded-[1.7rem] border border-cyan-200/[0.13] bg-cyan-300/[0.04] p-5">
            <MessageSquareText className="h-5 w-5 text-cyan-100" />
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">{page.accountMessageTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-white/[0.56]">{page.accountMessageBody}</p>
            {message ? (
              <div className="mt-5 rounded-2xl border border-white/[0.10] bg-black/[0.22] p-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-100">{message.status} · {message.eta}</p>
                <h3 className="mt-2 text-base font-semibold text-white">{message.title}</h3>
                <p className="mt-2 text-xs leading-6 text-white/[0.55]">{message.body}</p>
              </div>
            ) : null}
          </div>

          <div className="rounded-[1.7rem] border border-velmere-gold/[0.16] bg-velmere-gold/[0.055] p-5">
            <BadgeCheck className="h-5 w-5 text-velmere-gold" />
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">{page.priceExplanationTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-white/[0.56]">{page.priceExplanationBody} {advancedAuditProduct.description}</p>
          </div>

          <div className="rounded-[1.7rem] border border-white/[0.10] bg-white/[0.025] p-5">
            <LockKeyhole className="h-5 w-5 text-velmere-gold" />
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">{page.humanReviewTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-white/[0.56]">{page.humanReviewBody}</p>
          </div>
        </aside>
      </section>

      {selectedDemoProject ? (
        <>
        <button
          type="button"
          className="fixed inset-0 z-[155] cursor-default bg-transparent"
          aria-label="Close VLM Brain audit chat"
          onClick={() => setSelectedDemoProject(null)}
        />
        <aside
          className="velmere-audit-brain-chat-drawer fixed right-4 top-[5.8rem] z-[160] flex max-h-[calc(100dvh-7rem)] w-[min(30rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[1.6rem] border border-cyan-200/[0.16] bg-[#070b0e]/[0.98] text-left text-white shadow-[0_34px_120px_rgba(0,0,0,0.78)]"
          aria-label="VLM Brain audit chat"
          data-pass2028-audit-brain-chat="gemini-style-side-drawer"
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] p-5">
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-velmere-gold">VLM Brain · {selectedDemoProject.asset}</p>
              <h3 className="mt-2 font-serif text-3xl tracking-[-0.045em] text-white">{selectedDemoProject.vlmStatus}</h3>
              <p className="mt-2 text-xs leading-6 text-white/[0.48]">{selectedDemoProject.chain} · {selectedDemoProject.publicAudit}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDemoProject(null)}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.10] bg-white/[0.035] text-white/[0.58] transition hover:text-white"
              aria-label="Close VLM Brain chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="luxury-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-cyan-200/[0.12] bg-cyan-300/[0.045] p-4">
              <span className="velmere-audit-brain-orb grid h-12 w-12 shrink-0 place-items-center rounded-full border border-cyan-200/[0.20] bg-cyan-300/[0.08] font-serif text-xl text-cyan-50">V</span>
              <span>
                <span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-100">{auditChatThinking ? "thinking" : "review ready"}</span>
                <span className="mt-1 block text-xs leading-5 text-white/[0.52]">Shadow Review · Evidence Check · redacted exploit detail</span>
              </span>
              {auditChatThinking ? <Loader2 className="ml-auto h-4 w-4 animate-spin text-cyan-100" /> : <Brain className="ml-auto h-4 w-4 text-cyan-100" />}
            </div>
            <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/[0.24] p-4">
              <p className="whitespace-pre-line text-sm leading-7 text-white/[0.72]">{auditChatText}</p>
              {auditChatThinking ? <span className="mt-3 inline-block h-4 w-2 animate-pulse rounded-sm bg-velmere-gold/[0.75]" aria-hidden="true" /> : null}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {["Scope", "Evidence", "Disclosure"].map((label) => (
                <span key={label} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3 py-3 text-center font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.42]">
                  {label}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("velmere:angel:open", {
                  detail: {
                    handoffMessage: `Przeniosłem kontekst audytu ${selectedDemoProject.asset}. VLM Brain wskazał: ${selectedDemoProject.vlmStatus}. Mogę pomóc spokojnie przejść przez scope, dowody i disclosure bez publikowania exploita.`,
                  },
                }));
                setSelectedDemoProject(null);
              }}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-velmere-gold/[0.24] bg-velmere-gold/[0.08] px-4 font-mono text-[9px] font-black uppercase tracking-[0.14em] text-velmere-gold transition hover:bg-velmere-gold/[0.13]"
            >
              Kontynuuj w Angel
            </button>
          </div>
        </aside>
        </>
      ) : null}

      {preview || status === "error" ? (
        <section className="mx-auto mt-8 w-full max-w-[calc(100vw-1.5rem)] rounded-[1.9rem] border border-white/[0.10] bg-[#07090c] p-6 md:p-8" data-pass2023-audit-result="account-message-preview">
          {status === "error" ? (
            <p className="text-sm leading-7 text-rose-100">Audit request or checkout failed safely. No data was sent to a wallet and no seed phrase is required.</p>
          ) : preview ? (
            <div className="grid gap-5 md:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-velmere-gold">{selectedPackage.label} · {preview.requestId}</p>
                <h2 className="mt-3 font-serif text-4xl tracking-[-0.05em] text-white">Message saved to account.</h2>
                <p className="mt-4 text-sm leading-7 text-white/[0.56]">{message?.body}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {preview.findings.slice(0, 4).map((finding) => (
                  <div key={finding.id} className="rounded-2xl border border-white/[0.09] bg-black/[0.18] p-4">
                    <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-cyan-100">{finding.severity}</p>
                    <h3 className="mt-2 text-sm font-semibold text-white">{finding.title}</h3>
                    <p className="mt-2 text-xs leading-6 text-white/[0.52]">{finding.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export { AUDIT_MESSAGES_STORAGE_KEY };
