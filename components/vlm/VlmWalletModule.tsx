"use client";

import { ArrowRight, CheckCircle2, Loader2, LockKeyhole, TriangleAlert, WalletCards } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { CURRENT_VLM_WALLET_STATE, type WalletState } from "@/lib/web3/wallet-state";
import { VLM_CONTRACTS } from "@/lib/web3/contracts";

type WalletView = {
  label: string;
  disabled: boolean;
  tone: "primary" | "muted" | "success" | "warning" | "locked";
};

function getWalletView(state: WalletState, t: (key: string) => string): WalletView {
  switch (state) {
    case "disconnected":
      return { label: t("states.disconnected"), disabled: false, tone: "primary" };
    case "connecting":
      return { label: t("states.connecting"), disabled: true, tone: "muted" };
    case "connected":
      return { label: t("states.connected"), disabled: true, tone: "success" };
    case "wrong_network":
      return { label: t("states.wrong_network"), disabled: true, tone: "warning" };
    case "contract_not_deployed":
      return { label: t("states.contract_not_deployed"), disabled: true, tone: "locked" };
    case "token_not_live":
      return { label: t("states.token_not_live"), disabled: true, tone: "locked" };
    case "eligible":
      return { label: t("states.eligible"), disabled: true, tone: "success" };
    case "not_eligible":
      return { label: t("states.not_eligible"), disabled: true, tone: "muted" };
    case "pending_signature":
      return { label: t("states.pending_signature"), disabled: true, tone: "muted" };
    case "signature_rejected":
      return { label: t("states.signature_rejected"), disabled: true, tone: "warning" };
    case "transaction_pending":
      return { label: t("states.transaction_pending"), disabled: true, tone: "muted" };
    case "transaction_success":
      return { label: t("states.transaction_success"), disabled: true, tone: "success" };
    case "transaction_failed":
      return { label: t("states.transaction_failed"), disabled: true, tone: "warning" };
    default:
      return { label: t("states.disconnected"), disabled: false, tone: "primary" };
  }
}

function WalletStateIcon({ tone }: { tone: WalletView["tone"] }) {
  if (tone === "success") return <CheckCircle2 className="h-4 w-4" aria-hidden="true" />;
  if (tone === "warning") return <TriangleAlert className="h-4 w-4" aria-hidden="true" />;
  if (tone === "muted") return <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />;
  return <LockKeyhole className="h-4 w-4" aria-hidden="true" />;
}

export default function VlmWalletModule({ state = CURRENT_VLM_WALLET_STATE }: { state?: WalletState }) {
  const t = useTranslations("VlmWallet");
  const contractNotDeployed = VLM_CONTRACTS.evm.status === "not_deployed";
  const effectiveState: WalletState = contractNotDeployed ? "contract_not_deployed" : state;
  const view = getWalletView(effectiveState, t);
  const buttonTone =
    view.tone === "primary"
      ? "border-velmere-gold bg-velmere-gold text-black hover:bg-white"
      : view.tone === "success"
        ? "border-emerald-300/[0.30] bg-emerald-300/[0.10] text-emerald-100"
        : view.tone === "warning"
          ? "border-velmere-gold/[0.40] bg-velmere-gold/[0.08] text-velmere-gold"
          : "border-white/[0.10] bg-black/[0.24] text-white/[0.46]";

  const openWalletPanel = () => {
    if (view.disabled) return;
    window.dispatchEvent(
      new CustomEvent("velmere:open-wallet", {
        detail: { source: "vlm-wallet-module", pass1977: true },
      }),
    );
  };

  return (
    <div className="rounded-3xl border border-white/[0.10] bg-white/[0.035] p-6 md:p-7">
      <div className="flex items-start gap-5">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.10] bg-black/[0.24] text-velmere-gold">
          <WalletCards className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-white/[0.45]">
            {t("kicker")}
          </p>
          <h2 className="mt-3 font-serif text-3xl leading-tight text-[#F5F0E8]">{t("title")}</h2>
          <p className="mt-4 font-sans text-sm leading-7 text-white/[0.60]">{t("body")}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {["MetaMask", "Phantom"].map((wallet) => (
          <button
            key={wallet}
            type="button"
            aria-label={`${wallet} ${t("providerUnavailable")}`}
            disabled={contractNotDeployed}
            className="flex min-h-12 cursor-not-allowed items-center justify-between rounded-full border border-white/[0.12] px-5 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-white/[0.40]"
          >
            {wallet}
            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-white/[0.10] bg-black/[0.24] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-white/[0.40]">
              {t("currentState")}
            </p>
            <p className="mt-2 font-sans text-sm leading-6 text-white/[0.70]">{view.label}</p>
          </div>
          <span className="inline-flex min-h-9 items-center rounded-full border border-velmere-gold/[0.30] px-4 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-velmere-gold">
            {t("preLaunchBadge")}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={openWalletPanel}
        disabled={view.disabled}
        data-pass1977-vlm-wallet-cta="opens-header-wallet"
        className={`mt-5 flex min-h-14 w-full items-center justify-center gap-3 rounded-full border px-6 font-sans text-[12px] font-semibold uppercase tracking-[0.2em] transition-colors disabled:cursor-not-allowed ${buttonTone}`}
      >
        <WalletStateIcon tone={view.tone} />
        {view.label}
      </button>
      <p className="mt-4 font-sans text-xs leading-6 text-white/[0.48]">{t("purchaseLocked")}</p>

      <Link
        href="/vlm-token#contract-plan"
        className="mt-5 inline-flex min-h-11 items-center gap-2 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-white/[0.52] transition-colors hover:text-white"
      >
        {t("implementationStatusCta")}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
