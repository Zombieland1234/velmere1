"use client";

import { useMemo, useState } from "react";
import { LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";

const PRICE = 0.0004;
const BUY_FEE = 0.01;
const SELL_FEE = 0.025;

export default function VlmSwapSidePanel() {
  const t = useTranslations("VlmSwapSidePanel");
  const [payAmount, setPayAmount] = useState("100");

  const numericPay = useMemo(() => {
    const parsed = Number.parseFloat(payAmount.replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [payAmount]);

  const receive = numericPay > 0 ? (numericPay * (1 - BUY_FEE)) / PRICE : 0;
  const buyFeeEur = numericPay * BUY_FEE;
  const sellFeeEur = numericPay * SELL_FEE;

  return (
    <div className="space-y-6">
      <p className="font-sans text-sm leading-7 text-white/[0.58]">{t("body")}</p>

      <label className="block rounded-2xl border border-white/[0.05] bg-black/[0.24] p-4">
        <span className="text-[10px] uppercase tracking-[0.18em] text-white/[0.40]">{t("payLabel")}</span>
        <div className="mt-2 flex items-center gap-3">
          <input
            value={payAmount}
            onChange={(event) => setPayAmount(event.target.value.replace(/[^\d.,]/g, ""))}
            className="min-h-11 flex-1 bg-transparent font-mono text-lg tabular-nums text-[#FFFFF0] outline-none"
          />
          <span className="text-[10px] uppercase text-white/[0.42]">{t("currency")}</span>
        </div>
      </label>

      <div className="rounded-2xl border border-white/[0.05] bg-white/[0.03] p-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-white/[0.40]">{t("receiveLabel")}</p>
        <p className="mt-2 font-mono text-lg tabular-nums text-[#FFFFF0]">
          {receive > 0 ? `≈ ${receive.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}
        </p>
        <p className="mt-2 text-xs text-white/[0.46]">{t("formulaNote")}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <p className="rounded-xl border border-white/[0.05] p-3 text-xs text-white/[0.56]">{t("buyFeeExample", { fee: buyFeeEur.toFixed(2) })}</p>
        <p className="rounded-xl border border-white/[0.05] p-3 text-xs text-white/[0.56]">{t("sellFeeExample", { fee: sellFeeEur.toFixed(2) })}</p>
      </div>

      <p className="rounded-xl border border-white/[0.05] p-3 text-xs text-white/[0.52]">{t("lpNote")}</p>
      <p className="text-xs leading-6 text-white/[0.46]">{t("impactWarning")}</p>

      <button
        type="button"
        disabled
        className="flex min-h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded-full border border-white/[0.10] px-4 text-[10px] uppercase tracking-[0.16em] text-white/[0.42]"
      >
        <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
        {t("disabledCta")}
      </button>
    </div>
  );
}
