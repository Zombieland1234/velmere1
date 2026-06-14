import { buildVlmAuditProductPage, PASS2023_VLM_AUDIT_PRODUCT_ID } from "@/lib/security/pass2023-vlm-audit-product";
import VlmAuditCommandClient from "@/components/security/VlmAuditCommandClient";

export default function SecurityAuditWatchPage({ locale }: { locale: string }) {
  const page = buildVlmAuditProductPage(locale);

  return (
    <main
      className="velmere-public-page velmere-audit-watch-page min-h-screen bg-velmere-black px-3 pb-24 pt-28 text-white sm:px-4 md:px-5 md:pt-32"
      data-pass2023-vlm-audit-product={PASS2023_VLM_AUDIT_PRODUCT_ID}
      data-pass2023-task-count={page.taskCount}
      data-audit-boundary="technology-audit-basic-human-reviewed-advanced-no-custody-no-seed-no-investment-advice"
    >
      <VlmAuditCommandClient page={page} />

      <section className="velmere-audit-wide-grid mx-auto mt-8 grid w-full max-w-[calc(100vw-1.5rem)] gap-4 md:grid-cols-3" data-pass2023-audit-scorecard="implementation-percentages" data-pass2027-audit-wide="true">
        {page.scorecard.map((item) => (
          <article key={item.label} className="rounded-[1.45rem] border border-white/[0.10] bg-[#07090c] p-5">
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/[0.38]">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">{item.percent}%</p>
            <p className="mt-2 text-xs leading-6 text-white/[0.52]">{item.note}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
