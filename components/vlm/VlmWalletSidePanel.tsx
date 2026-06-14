"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, LockKeyhole, TriangleAlert, WalletCards } from "lucide-react";
import { useTranslations } from "next-intl";
import type { WalletState } from "@/lib/web3/wallet-state";
import { VLM_CONTRACTS } from "@/lib/web3/contracts";

const evmAddress = /^0x[a-fA-F0-9]{40}$/;

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function VlmWalletSidePanel() {
  const t = useTranslations("VlmWalletSidePanel");
  const contractPending = VLM_CONTRACTS.evm.status === "not_deployed";
  const [hasProvider, setHasProvider] = useState(false);
  const [state, setState] = useState<WalletState>("disconnected");
  const [address, setAddress] = useState("");
  const [manualAddress, setManualAddress] = useState("");

  useEffect(() => {
    setHasProvider(Boolean(window.ethereum));
  }, []);

  const effectiveState = contractPending && state !== "connected" ? "contract_not_deployed" : state;
  const manualAddressState = !manualAddress.trim() ? "empty" : evmAddress.test(manualAddress.trim()) ? "valid" : "invalid";

  const helper = useMemo(() => {
    if (state === "connected") return t("connectedHelper", { address: shortenAddress(address) });
    if (!hasProvider) return t("noProvider");
    return t("body");
  }, [address, hasProvider, state, t]);

  async function connectMetaMask() {
    if (!window.ethereum) {
      setState("wrong_network");
      return;
    }
    try {
      setState("connecting");
      const accounts = (await (window.ethereum as any).request({ method: "eth_requestAccounts" })) as string[];
      setAddress(accounts[0] ?? "");
      setState("connected");
    } catch {
      setState("signature_rejected");
    }
  }

  return (
    <div className="space-y-6">
      <p className="font-sans text-sm leading-7 text-white/[0.58]">{t("safetyNote")}</p>

      <div className="rounded-2xl border border-white/[0.05] bg-black/[0.24] p-5">
        <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-white/[0.40]">{t("statusLabel")}</p>
        <p className="mt-2 font-sans text-sm text-white/[0.72]">{t(`states.${effectiveState}`)}</p>
        <p className="mt-3 font-sans text-xs leading-6 text-white/[0.48]">{helper}</p>
        <span className="mt-4 inline-flex min-h-8 items-center rounded-full border border-[#d4af37]/[0.25] px-3 text-[10px] uppercase tracking-[0.14em] text-[#d4af37]">
          {t("registryBadge")}
        </span>
      </div>

      <button
        type="button"
        onClick={connectMetaMask}
        disabled={!hasProvider || state === "connecting"}
        className="flex min-h-11 w-full items-center justify-between rounded-full border border-white/[0.10] px-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/[0.62] disabled:opacity-40"
      >
        MetaMask
        <WalletCards className="h-4 w-4" aria-hidden="true" />
      </button>

      <div>
        <label className="font-sans text-[10px] uppercase tracking-[0.18em] text-white/[0.40]">{t("addressLabel")}</label>
        <input
          value={manualAddress}
          onChange={(event) => setManualAddress(event.target.value)}
          placeholder={t("addressPlaceholder")}
          spellCheck={false}
          className="mt-2 min-h-11 w-full rounded-full border border-white/[0.10] bg-black/[0.24] px-4 font-mono text-sm text-white outline-none"
        />
        <p
          className={`mt-2 text-xs leading-6 ${
            manualAddressState === "valid" ? "text-[#d4af37]" : manualAddressState === "invalid" ? "text-red-200/[0.80]" : "text-white/[0.42]"
          }`}
        >
          {t(`addressCheck.${manualAddressState}`)}
        </p>
      </div>

      <p className="flex items-start gap-2 text-xs leading-6 text-white/[0.44]">
        {state === "connecting" ? (
          <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
        ) : state === "connected" ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#d4af37]" aria-hidden="true" />
        ) : state === "signature_rejected" || state === "wrong_network" ? (
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        {t("footer")}
      </p>
    </div>
  );
}
