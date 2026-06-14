"use client";

import { useEffect, useMemo, useState } from "react";
import { LockKeyhole, Settings2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

const PRICE_ROWS = [
  { key: "price" },
  { key: "quote" },
  { key: "buyFee" },
  { key: "sellFee" },
  { key: "transferFee" },
] as const;

const SLIPPAGE_PRESETS = ["0.1", "0.5", "1.0"] as const;

function formatUsd(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

export default function VlmTradePreview() {
  const t = useTranslations("VlmTradePreview");
  const locale = useLocale();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [slippage, setSlippage] = useState("0.5");
  const [vlmAmount, setVlmAmount] = useState(12000);
  const [gasTick, setGasTick] = useState({ eth: 0.0042, usd: 12.5 });

  useEffect(() => {
    let frame = 0;
    let last = 0;
    const tick = (time: number) => {
      if (time - last > 900) {
        last = time;
        const wave = Math.sin(time / 2200) * 0.00075;
        const eth = Number((0.0042 + wave).toFixed(5));
        setGasTick({ eth, usd: Number((eth * 2975).toFixed(2)) });
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const priceImpact = useMemo(() => {
    if (vlmAmount <= 0) return 0;
    return Math.min(18, Number(((vlmAmount / 50000) * 0.72).toFixed(2)));
  }, [vlmAmount]);
  const highImpact = vlmAmount > 50000;

  return (
    <div className="velmere-command-shell h-full rounded-[1.5rem] p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-velmere-gold/[0.70]">{t("engineLabel")}</p>
          <h2 className="mt-2 font-serif text-xl tracking-[0.12em] text-[#FFFFF0] md:text-2xl">{t("title")}</h2>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen((value) => !value)}
          className="velmere-command-pill velmere-interaction-pulse flex h-11 w-11 items-center justify-center text-white/[0.58]"
          aria-label={t("settingsAria")}
        >
          <Settings2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {settingsOpen && (
        <div className="velmere-readout-card mt-4 rounded-[1.25rem] p-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/[0.38]">{t("slippageTolerance")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SLIPPAGE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSlippage(preset)}
                className={`velmere-command-pill min-h-10 px-3 font-mono text-[10px] tabular-nums ${
                  slippage === preset ? "border-velmere-gold bg-velmere-gold text-black" : "border-white/[0.10] text-white/[0.58] hover:border-white/[0.25]"
                }`}
              >
                {preset}%
              </button>
            ))}
            <input
              value={slippage}
              onChange={(event) => setSlippage(event.target.value.replace(/[^0-9.]/g, "").slice(0, 5))}
              inputMode="decimal"
              className="min-h-10 w-24 rounded-full border border-white/[0.10] bg-black/[0.55] px-3 font-mono text-[10px] tabular-nums text-white outline-none transition focus:border-velmere-gold/[0.60]"
              aria-label={t("customSlippageAria")}
            />
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/[0.45] sm:grid-cols-2">
        <label className="velmere-readout-card rounded-[1.25rem] p-3">
          <span className="block text-white/[0.35]">{t("inputAmount")}</span>
          <input
            value={vlmAmount}
            onChange={(event) => setVlmAmount(Math.max(0, Number(event.target.value.replace(/[^0-9]/g, "")) || 0))}
            inputMode="numeric"
            className="mt-2 w-full rounded-xl border border-white/[0.10] bg-white/[0.025] px-3 py-3 font-mono text-xs tabular-nums text-white outline-none transition focus:border-velmere-gold/[0.60]"
          />
        </label>
        <div className="velmere-readout-card rounded-[1.25rem] p-3">
          <span className="block text-white/[0.35]">{t("gasFee")}</span>
          <strong className="mt-2 block break-all font-mono text-xs font-normal tabular-nums text-white">
            {gasTick.eth.toFixed(5)} ETH / {formatUsd(gasTick.usd, locale)}
          </strong>
        </div>
      </div>

      <dl className="mt-5 divide-y divide-white/[0.05] text-sm">
        {PRICE_ROWS.map(({ key }) => (
          <div key={key} className="flex justify-between gap-4 py-3">
            <dt className="text-white/[0.45]">{t(`rows.${key}.label`)}</dt>
            <dd className="break-all font-mono tabular-nums text-[#FFFFF0]">{t(`rows.${key}.value`)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 py-3">
          <dt className="text-white/[0.45]">{t("slippage")}</dt>
          <dd className="break-all font-mono tabular-nums text-[#FFFFF0]">{slippage || "0"}%</dd>
        </div>
        <div className="flex justify-between gap-4 py-3">
          <dt className="text-white/[0.45]">{t("priceImpact")}</dt>
          <dd className={`break-all font-mono tabular-nums ${highImpact ? "animate-pulse text-yellow-300" : "text-[#FFFFF0]"}`}>{priceImpact.toFixed(2)}%</dd>
        </div>
      </dl>

      {highImpact && (
        <p className="mt-3 border border-yellow-300/[0.20] bg-yellow-300/[0.06] p-3 font-mono text-[10px] uppercase leading-5 tracking-[0.18em] text-yellow-200">
          {t("highImpactWarning")}
        </p>
      )}

      <button
        type="button"
        disabled
        className="velmere-command-pill mt-5 flex min-h-[44px] w-full cursor-not-allowed items-center justify-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/[0.42]"
      >
        <LockKeyhole className="h-3.5 w-3.5 text-[#d4af37]" aria-hidden="true" />
        {t("disabledCta")}
      </button>

      <p className="mt-4 text-[11px] leading-5 text-white/[0.40]">{t("activationNote")}</p>
    </div>
  );
}
