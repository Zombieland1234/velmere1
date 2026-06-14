"use client";

import { useMemo, useState } from "react";
import { Link } from "@/navigation";
import { ArrowRight, CheckCircle2, Loader2, LockKeyhole, TriangleAlert, WalletCards } from "lucide-react";
import { useTranslations } from "next-intl";
import type { WalletState } from "@/lib/web3/wallet-state";
import { VLM_CONTRACTS } from "@/lib/web3/contracts";
import { useWalletUiStore } from "@/store/useWalletUiStore";
import { useWalletConnect } from "@/lib/wallet/useWalletConnect";

const evmAddress = /^0x[a-fA-F0-9]{40}$/;

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function Icon({ state }: { state: WalletState }) {
  if (state === "connecting") return <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />;
  if (state === "connected") return <CheckCircle2 className="h-4 w-4" aria-hidden="true" />;
  if (state === "wrong_network" || state === "signature_rejected" || state === "transaction_failed") {
    return <TriangleAlert className="h-4 w-4" aria-hidden="true" />;
  }
  return <LockKeyhole className="h-4 w-4" aria-hidden="true" />;
}

export default function VlmWalletPreviewPanel({ compact = false }: { compact?: boolean } = {}) {
  const t = useTranslations("VlmWalletPreview");
  const contractNotDeployed = VLM_CONTRACTS.evm.status === "not_deployed";
  const wallet = useWalletConnect();
  const walletUi = useWalletUiStore();
  const [manualAddress, setManualAddress] = useState("");

  const walletState: WalletState = wallet.state === "connecting" ? "connecting" : wallet.connectedWallet ? "connected" : "disconnected";
  const effectiveState = contractNotDeployed && walletState !== "connected" ? "contract_not_deployed" : walletState;
  const label = t(`states.${effectiveState}`);
  const helper = useMemo(() => {
    if (wallet.connectedWallet) {
      return t("connectedHelper", {
        address: shortenAddress(wallet.connectedWallet.address),
        network: walletUi.network || wallet.connectedWallet.chainId || "EVM",
      });
    }
    if (!wallet.detectedWallets.metamask) return t("noProvider");
    if (contractNotDeployed) return t("readOnly");
    return t("body");
  }, [contractNotDeployed, t, wallet.connectedWallet, wallet.detectedWallets.metamask, walletUi.network]);
  const manualAddressState = !manualAddress.trim() ? "empty" : evmAddress.test(manualAddress.trim()) ? "valid" : "invalid";

  return (
    <div className={`rounded-3xl border border-white/[0.10] bg-white/[0.035] ${compact ? "p-5 md:p-6" : "p-6 md:p-8"}`}>
      <div className="flex items-start gap-5">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.10] bg-black/[0.24] text-velmere-gold">
          <WalletCards className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.24em] text-white/[0.45]">
            {t("kicker")}
          </p>
          <h2 className={`${compact ? "mt-2 text-2xl" : "mt-3 text-3xl"} font-serif leading-tight text-[#F5F0E8]`}>
            {t("title")}
          </h2>
          <p className={`${compact ? "mt-3 text-xs leading-6" : "mt-4 text-sm leading-7"} font-sans text-white/[0.60]`}>
            {t("body")}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void wallet.connectMetaMask()}
          disabled={!wallet.detectedWallets.metamask || wallet.state === "connecting" || Boolean(wallet.connectedWallet)}
          className="flex min-h-12 items-center justify-between rounded-full border border-white/[0.12] px-5 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-white/[0.62] transition-transform duration-200 hover:border-white/[0.25] hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:text-white/[0.34]"
        >
          MetaMask / Injected
          <WalletCards className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          disabled
          className="flex min-h-12 cursor-not-allowed items-center justify-between rounded-full border border-white/[0.12] px-5 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-white/[0.34]"
        >
          Phantom
          <span className="text-[10px] text-white/[0.30]">{t("future")}</span>
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-white/[0.10] bg-black/[0.24] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-white/[0.40]">
              {t("currentState")}
            </p>
            <p className="mt-2 font-sans text-sm leading-6 text-white/[0.70]">{label}</p>
          </div>
          <span className="inline-flex min-h-9 items-center rounded-full border border-velmere-gold/[0.30] px-4 font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-velmere-gold">
            {t("activationBadge")}
          </span>
        </div>
        <p className="mt-4 break-all font-mono text-xs leading-6 text-white/[0.48] tabular-nums">{helper}</p>
      </div>

      <label className="mt-5 block font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-white/[0.40]">
        {t("addressCheck.label")}
      </label>
      <input
        value={manualAddress}
        onChange={(event) => setManualAddress(event.target.value)}
        placeholder={t("addressCheck.placeholder")}
        spellCheck={false}
        className="mt-3 min-h-12 w-full min-w-0 rounded-full border border-white/[0.10] bg-black/[0.24] px-5 font-mono text-xs text-white outline-none placeholder:text-white/[0.26] md:text-sm"
      />
      <p className={`mt-2 font-sans text-xs leading-6 ${manualAddressState === "valid" ? "text-velmere-gold" : manualAddressState === "invalid" ? "text-red-200/[0.80]" : "text-white/[0.42]"}`}>
        {t(`addressCheck.${manualAddressState}`)}
      </p>

      <button
        type="button"
        disabled
        className="mt-5 flex min-h-14 w-full cursor-not-allowed items-center justify-center gap-3 rounded-full border border-white/[0.10] bg-black/[0.24] px-6 font-sans text-[12px] font-semibold uppercase tracking-[0.2em] text-white/[0.44]"
      >
        <Icon state={effectiveState} />
        {t("purchaseDisabled")}
      </button>

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
