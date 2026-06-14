import { getReadinessByGroup, type ReadinessItem } from "@/lib/readiness/store-readiness";

const groupLabels: Record<string, string> = {
  seller: "Seller / legal",
  stripe: "Stripe",
  printful: "Printful",
  tapstitch: "Tapstitch",
  shipping: "Shipping / tax",
  legal: "Legal pages",
  auth: "Auth / account",
  angel: "AI Angel",
  vlm: "VLM activation",
  platform: "Platform",
};

export default function ProductionReadinessChecklist() {
  const groups = getReadinessByGroup();

  return (
    <section className="rounded-[2rem] border border-white/[0.10] bg-white/[0.03] p-6 md:p-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">Production readiness</p>
      <h2 className="mt-4 font-serif text-3xl text-white">Environment checklist</h2>
      <p className="mt-4 text-sm leading-7 text-white/[0.58]">
        Presence only — secret values are never displayed. Complete missing items before commercial launch.
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {Array.from(groups.entries()).map(([group, items]: [string, ReadinessItem[]]) => (
          <div key={group} className="rounded-2xl border border-white/[0.10] bg-black/[0.24] p-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/[0.72]">
              {groupLabels[group] ?? group}
            </h3>
            <ul className="mt-4 space-y-2">
              {items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-white/[0.52]">{item.label}</span>
                  <span className={item.present ? "text-[#d4af37]" : "text-white/[0.30]"}>
                    {item.present ? "Present" : "Missing"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
