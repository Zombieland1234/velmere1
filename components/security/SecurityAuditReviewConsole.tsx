"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ArrowRight, FileText, Network, ShieldCheck, Sparkles } from "lucide-react";
import type { AuditReviewLevel, AuditReviewPreview } from "@/lib/security/pass1534-audit-review-flow";
import type { AuditReportQueueRecord } from "@/lib/security/pass1614-audit-report-queue";
import type { AuditLeadCapturePacket } from "@/lib/security/pass1694-audit-business-flow";

type FlowCopy = {
  passId: string;
  taskCount: number;
  consoleTitle: string;
  consoleBody: string;
  formLabels: Record<string, string>;
  sampleTitle: string;
  sampleItems: string[];
  emptyResult: string;
  reviewLevels: { id: string; label: string }[];
};

const defaultValues = {
  projectName: "",
  contractAddress: "",
  chain: "ethereum",
  auditUrl: "",
  website: "",
  docsUrl: "",
  bountyScope: "",
  contactEmail: "",
  reviewLevel: "free_scan" as AuditReviewLevel,
};

export default function SecurityAuditReviewConsole({ flow }: { flow: FlowCopy }) {
  const [form, setForm] = useState(defaultValues);
  const [preview, setPreview] = useState<AuditReviewPreview | null>(null);
  const [queueRecord, setQueueRecord] = useState<AuditReportQueueRecord | null>(null);
  const [leadPacket, setLeadPacket] = useState<AuditLeadCapturePacket | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const hasResult = status === "ready" && preview;
  const labels = flow.formLabels;
  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    preview?.findings.forEach((finding) => {
      counts[finding.severity] = (counts[finding.severity] ?? 0) + 1;
    });
    return counts;
  }, [preview]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    try {
      const response = await fetch("/api/security/audit-watch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { preview?: AuditReviewPreview; queueRecord?: AuditReportQueueRecord; leadPacket?: AuditLeadCapturePacket };
      if (!response.ok || !payload.preview) throw new Error("Audit preview failed");
      setPreview(payload.preview);
      setQueueRecord(payload.queueRecord ?? null);
      setLeadPacket(payload.leadPacket ?? null);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section
      id="review-console"
      className="mt-8 grid gap-6 rounded-[1.9rem] border border-velmere-gold/[0.16] bg-[linear-gradient(145deg,rgba(212,175,55,.08),rgba(255,255,255,.025),rgba(0,0,0,.28))] p-5 md:p-8 lg:grid-cols-[minmax(0,.95fr)_minmax(0,1.05fr)]"
      data-pass1534-audit-review-console={flow.passId}
      data-pass1534-task-count={flow.taskCount}
    >
      <div>
        <div className="flex items-center gap-3 text-velmere-gold">
          <ShieldCheck className="h-5 w-5" />
          <p className="font-mono text-[10px] uppercase tracking-[0.18em]">PASS1534 review flow</p>
        </div>
        <h2 className="mt-4 font-serif text-4xl leading-none tracking-[-0.055em] text-white md:text-5xl">
          {flow.consoleTitle}
        </h2>
        <p className="mt-4 text-sm leading-7 text-white/[0.58]">{flow.consoleBody}</p>

        <form onSubmit={onSubmit} className="mt-6 grid gap-3" data-pass1534-intake-form="audit-watch-submit">
          <div className="grid gap-3 md:grid-cols-2">
            {([
              ["projectName", labels.projectName, "Velmère example token"],
              ["contractAddress", labels.contractAddress, "0x..."],
              ["chain", labels.chain, "ethereum"],
              ["auditUrl", labels.auditUrl, "https://.../audit.pdf"],
              ["website", labels.website, "https://project.example"],
              ["docsUrl", labels.docsUrl, "https://docs..."],
              ["bountyScope", labels.bountyScope, "https://hackerone... or scope note"],
              ["contactEmail", labels.contactEmail, "security@project.example"],
            ] as const).map(([name, label, placeholder]) => (
              <label key={name} className="grid gap-2 rounded-2xl border border-white/[0.10] bg-black/[0.20] p-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.42]">{label}</span>
                <input
                  value={form[name]}
                  onChange={(event) => setForm((current) => ({ ...current, [name]: event.target.value }))}
                  placeholder={placeholder}
                  className="min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-white/[0.22]"
                />
              </label>
            ))}
          </div>

          <label className="grid gap-2 rounded-2xl border border-white/[0.10] bg-black/[0.20] p-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.42]">{labels.reviewLevel}</span>
            <select
              value={form.reviewLevel}
              onChange={(event) => setForm((current) => ({ ...current, reviewLevel: event.target.value as AuditReviewLevel }))}
              className="bg-transparent text-sm text-white outline-none"
            >
              {flow.reviewLevels.map((level) => (
                <option key={level.id} value={level.id} className="bg-black text-white">
                  {level.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-velmere-gold/[0.28] bg-velmere-gold/[0.12] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-velmere-gold transition hover:bg-velmere-gold/[0.18] disabled:opacity-50"
            disabled={status === "loading"}
          >
            {status === "loading" ? "Building packet…" : labels.submit}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>

      <aside className="rounded-[1.7rem] border border-cyan-200/[0.12] bg-cyan-300/[0.04] p-5" data-pass1534-preview-panel="lens-shield-map-ready">
        {hasResult ? (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-100">{preview.requestId}</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{preview.reportTitle}</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {preview.badgeLanguage.map((badge) => (
                <span key={badge} className="rounded-full border border-white/[0.10] bg-black/[0.18] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.56]">
                  {badge}
                </span>
              ))}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {Object.entries(severityCounts).map(([severity, count]) => (
                <div key={severity} className="rounded-2xl border border-white/[0.09] bg-black/[0.18] p-3">
                  <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/[0.38]">{severity}</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{count}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3">
              {preview.steps.map((step) => (
                <div key={step.id} className="rounded-2xl border border-white/[0.10] bg-black/[0.18] p-4">
                  <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-velmere-gold">{step.state}</p>
                  <h4 className="mt-2 text-sm font-semibold text-white">{step.label}</h4>
                  <p className="mt-2 text-xs leading-6 text-white/[0.52]">{step.body}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.10] bg-black/[0.18] p-4">
                <FileText className="h-4 w-4 text-velmere-gold" />
                <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.15em] text-white/[0.38]">Lens PDF</p>
                <p className="mt-2 text-xs leading-6 text-white/[0.55]">{preview.lensPdf.sections.slice(0, 4).join(" · ")}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.10] bg-black/[0.18] p-4">
                <Network className="h-4 w-4 text-cyan-100" />
                <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.15em] text-white/[0.38]">Shield Map</p>
                <p className="mt-2 text-xs leading-6 text-white/[0.55]">{preview.shieldMap.nodes.join(" → ")}</p>
              </div>
            </div>

            {queueRecord ? (
              <div className="mt-5 rounded-2xl border border-velmere-gold/[0.16] bg-velmere-gold/[0.055] p-4" data-pass1614-console-queue-record="report-status-links">
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-velmere-gold">PASS1614 queue record · {queueRecord.statusLabel}</p>
                <p className="mt-2 text-xs leading-6 text-white/[0.58]">{queueRecord.reportId} · confidence cap {queueRecord.confidenceCap}% · {queueRecord.boundaries.audience}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={queueRecord.publicRoute} className="rounded-full border border-white/[0.12] bg-black/[0.18] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.13em] text-white/[0.62]">
                    public status
                  </a>
                  <a href={queueRecord.lensExport.route} className="rounded-full border border-white/[0.12] bg-black/[0.18] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.13em] text-white/[0.62]">
                    PDF manifest
                  </a>
                  <a href={`/en/security/audits/export/${queueRecord.slug}`} className="rounded-full border border-velmere-gold/[0.14] bg-velmere-gold/[0.045] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.13em] text-velmere-gold" data-pass1654-console-full-export="lens-pdf-shield-map">
                    full export
                  </a>
                  <a href={queueRecord.adminRoute} className="rounded-full border border-white/[0.12] bg-black/[0.18] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.13em] text-white/[0.62]">
                    admin inbox
                  </a>
                </div>
              </div>
            ) : null}

            {leadPacket ? (
              <div className="mt-4 rounded-2xl border border-emerald-300/[0.16] bg-emerald-300/[0.045] p-4" data-pass1694-console-lead-packet="pricing-routing-disclosure">
                <p className="font-mono text-[9px] uppercase tracking-[0.15em] text-emerald-100">PASS1694 lead packet · {leadPacket.route}</p>
                <p className="mt-2 text-xs leading-6 text-white/[0.58]">{leadPacket.selectedTier} · {leadPacket.priority} · {leadPacket.replyPromise}</p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {leadPacket.safeSalesCopy.slice(0, 4).map((item) => (
                    <span key={item} className="rounded-full border border-white/[0.10] bg-black/[0.18] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.13em] text-white/[0.56]">{item}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid min-h-[32rem] content-center gap-5 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-velmere-gold" />
            <div>
              <h3 className="text-2xl font-semibold tracking-[-0.04em] text-white">{flow.sampleTitle}</h3>
              <p className="mt-3 text-sm leading-7 text-white/[0.52]">{flow.emptyResult}</p>
            </div>
            <div className="grid gap-2 text-left">
              {flow.sampleItems.map((item) => (
                <p key={item} className="rounded-2xl border border-white/[0.09] bg-black/[0.18] p-3 text-xs leading-6 text-white/[0.55]">
                  {item}
                </p>
              ))}
            </div>
          </div>
        )}
      </aside>
    </section>
  );
}
