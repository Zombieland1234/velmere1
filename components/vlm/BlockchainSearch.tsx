"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Search, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { EXPLORERS, buildExplorerUrl, classifyEvmSearch, type ExplorerChain } from "@/lib/web3/explorers";

const hexStream = [
  "0x7A19F0C18B44E9A0",
  "0x93E4A12B77D0C8F2",
  "0xC1B05E44A9D2310E",
  "0x44F8D0A119CE7B60",
  "0xBADA316227766E10",
] as const;

export default function BlockchainSearch() {
  const t = useTranslations("BlockchainSearch");
  const [chain, setChain] = useState<ExplorerChain>("evm");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const target = useMemo(
    () => (chain === "evm" || chain === "base" || chain === "ethereum" ? classifyEvmSearch(query) : null),
    [chain, query],
  );
  const chains = Object.keys(EXPLORERS) as ExplorerChain[];

  function submitSearch() {
    const trimmed = query.trim();
    setError("");
    if (!trimmed) {
      setError(t("errors.empty"));
      return;
    }
    if (chain === "solana" || chain === "sui") {
      setError(t("errors.planned"));
      return;
    }
    const nextTarget = classifyEvmSearch(trimmed);
    if (!nextTarget) {
      setError(t("errors.invalid"));
      return;
    }
    window.open(buildExplorerUrl(chain, nextTarget, trimmed), "_blank", "noopener,noreferrer");
  }

  return (
    <section className="velmere-system-card overflow-hidden rounded-[2rem] p-6 md:p-8">
      <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">{t("kicker")}</p>
          <h2 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">{t("title")}</h2>
          <p className="mt-5 text-sm leading-7 text-white/[0.60]">{t("body")}</p>
          <div className="mt-6 flex gap-3 rounded-2xl border border-[#d4af37]/[0.20] bg-[#d4af37]/[0.06] p-4">
            <ShieldAlert className="mt-1 h-5 w-5 shrink-0 text-[#d4af37]" aria-hidden="true" />
            <p className="text-xs leading-6 text-white/[0.58]">{t("notice")}</p>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-white/[0.10] bg-black/[0.50] p-4 md:p-5">
          <div className="grid gap-3 md:grid-cols-[0.72fr_1fr_auto]">
            <select
              value={chain}
              onChange={(event) => setChain(event.target.value as ExplorerChain)}
              className="velmere-field min-h-12 rounded-full px-4 font-mono text-xs uppercase tracking-[0.14em]"
              aria-label={t("chainLabel")}
            >
              {chains.map((item) => (
                <option key={item} value={item} className="bg-black text-white">
                  {t(`chains.${item}`)}
                </option>
              ))}
            </select>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("placeholder")}
              spellCheck={false}
              className="velmere-field min-h-12 rounded-full px-5 font-mono text-sm"
            />
            <button
              type="button"
              onClick={submitSearch}
              className="velmere-button-secondary inline-flex min-h-12 items-center justify-center gap-2 px-5 text-[11px]"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              {t("submit")}
            </button>
          </div>
          <p className={`mt-3 text-xs leading-6 ${error ? "text-red-200/[0.80]" : "text-white/[0.42]"}`}>
            {error || (target ? t(`valid.${target}`) : t("helper"))}
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.10] bg-white/[0.03] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/[0.42]">{t("streamTitle")}</p>
              <div className="pointer-events-none mt-4 max-h-[250px] overflow-y-scroll scroll-touch pr-1 font-mono text-xs text-white/[0.58] md:h-28 md:overflow-hidden md:pr-0">
                <div className="space-y-2 motion-safe:animate-[ledger-scroll_10s_linear_infinite]">
                  {[...hexStream, ...hexStream].map((item, index) => (
                    <div key={`${item}-${index}`} className="flex items-center justify-between gap-4 border-b border-white/[0.05] py-1">
                      <span className="break-all text-[11px] md:text-xs">{item}</span>
                      <span className="tabular-nums text-[#d4af37]">{(index + 3) * 7}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.10] bg-white/[0.03] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/[0.42]">{t("engineTitle")}</p>
              <div className="mt-4 space-y-3 font-mono text-xs text-white/[0.58]">
                <p className="break-all tabular-nums">AMU = 3162.27766</p>
                <p className="break-all tabular-nums">ρ = 1.324717957244746</p>
                <p>{t("score", { value: query.trim() ? Math.min(97, 42 + query.trim().length).toString() : "42" })}</p>
              </div>
              <a
                href="https://basescan.org"
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-white/[0.44] hover:text-white"
              >
                {t("baseExplorer")}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
