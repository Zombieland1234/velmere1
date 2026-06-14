import { Eye, FileText, LockKeyhole, Network, ShieldCheck } from "lucide-react";
import { Link } from "@/navigation";
import { buildAuditAdminInbox } from "@/lib/security/pass1614-audit-report-queue";

const statusClass: Record<string, string> = {
  queued: "border-white/[0.09] bg-white/[0.025] text-white/[0.58]",
  triage: "border-cyan-200/[0.16] bg-cyan-300/[0.045] text-cyan-100",
  lens_ready: "border-emerald-300/[0.16] bg-emerald-300/[0.045] text-emerald-100",
  shield_map_ready: "border-emerald-300/[0.16] bg-emerald-300/[0.045] text-emerald-100",
  waiting_for_evidence: "border-amber-300/[0.16] bg-amber-300/[0.04] text-amber-100",
  private_disclosure: "border-rose-300/[0.18] bg-rose-300/[0.045] text-rose-100",
  published_sample: "border-emerald-300/[0.18] bg-emerald-300/[0.055] text-emerald-100",
};

export default function SecurityAuditAdminInbox({ locale }: { locale: string }) {
  const inbox = buildAuditAdminInbox(locale);

  return (
    <main
      className="min-h-screen bg-velmere-black px-5 pb-24 pt-28 text-white md:px-10 md:pt-36"
      data-pass1614-audit-admin-inbox={inbox.passId}
      data-pass1614-task-count={inbox.taskCount}
      data-pass1614-admin-gate="manual-review-before-paid-badge"
    >
      <section className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_28rem] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-velmere-gold/[0.20] bg-velmere-gold/[0.07] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.17em] text-velmere-gold">
              <LockKeyhole className="h-4 w-4" />
              PASS1614 operator surface
            </p>
            <h1 className="mt-6 max-w-5xl font-serif text-5xl leading-[0.95] tracking-[-0.06em] md:text-7xl">{inbox.title}</h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-white/[0.62]">{inbox.body}</p>
          </div>
          <aside className="rounded-[1.8rem] border border-cyan-200/[0.14] bg-cyan-300/[0.04] p-5 shadow-velmere-card">
            <ShieldCheck className="h-5 w-5 text-cyan-100" />
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">Release gate</h2>
            <div className="mt-4 grid gap-2">
              {Object.entries(inbox.releaseGate).map(([key, value]) => (
                <p key={key} className="rounded-2xl border border-white/[0.10] bg-black/[0.18] px-3 py-2 font-mono text-[9px] uppercase tracking-[0.14em] text-white/[0.56]">
                  {key.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`)} · {String(value)}
                </p>
              ))}
            </div>
          </aside>
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-4" data-pass1614-admin-metrics="queue-ready-redaction-confidence">
          {inbox.metrics.map((metric) => (
            <div key={metric.label} className="rounded-[1.35rem] border border-white/[0.10] bg-white/[0.025] p-5">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.38]">{metric.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{metric.value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-5 xl:grid-cols-5" data-pass1614-admin-lanes="free-basic-pro-advanced-disclosure">
          {inbox.lanes.map((lane) => (
            <article key={lane.id} className="rounded-[1.55rem] border border-white/[0.10] bg-white/[0.025] p-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-velmere-gold">{lane.label}</p>
              <div className="mt-4 grid gap-3">
                {lane.records.length ? lane.records.map((record) => (
                  <div key={record.reportId} className={`rounded-2xl border p-4 ${statusClass[record.status] ?? statusClass.queued}`}>
                    <p className="font-mono text-[9px] uppercase tracking-[0.15em] opacity-70">{record.statusLabel}</p>
                    <h2 className="mt-2 text-sm font-semibold leading-5">{record.projectName}</h2>
                    <p className="mt-2 text-[11px] leading-5 opacity-70">{record.reportId}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={`/security/audits/report/${record.slug}`} className="inline-flex items-center gap-1 rounded-full border border-white/[0.12] bg-black/[0.18] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.12em]">
                        <Eye className="h-3 w-3" /> public
                      </Link>
                      <a href={record.lensExport.route} className="inline-flex items-center gap-1 rounded-full border border-white/[0.12] bg-black/[0.18] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.12em]">
                        <FileText className="h-3 w-3" /> pdf
                      </a>
                      <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.12] bg-black/[0.18] px-2.5 py-1.5 text-[10px] uppercase tracking-[0.12em]">
                        <Network className="h-3 w-3" /> {record.shieldMapExport.enabled ? "map" : "hold"}
                      </span>
                    </div>
                  </div>
                )) : (
                  <p className="rounded-2xl border border-white/[0.08] bg-black/[0.16] p-4 text-xs leading-6 text-white/[0.46]">No records in this lane.</p>
                )}
              </div>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
