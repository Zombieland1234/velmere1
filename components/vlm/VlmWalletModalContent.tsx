"use client";

import { useState } from "react";
import { Copy, LockKeyhole } from "lucide-react";
import { useTranslations } from "next-intl";
import WalletConnectOptions from "@/components/wallet/WalletConnectOptions";
import { useWalletUiStore } from "@/store/useWalletUiStore";

const evmAddress = /^0x[a-fA-F0-9]{40}$/;

export default function VlmWalletModalContent() {
  const t = useTranslations("Wallet");
  const [manualAddress, setManualAddress] = useState("");
  const [copiedAddress, setCopiedAddress] = useState(false);
  
  const walletUi = useWalletUiStore();

  const manualState = !manualAddress.trim() ? "empty" : evmAddress.test(manualAddress.trim()) ? "valid" : "invalid";

  const copyToClipboard = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="velmere-command-shell rounded-[1.6rem] p-5">
        <h2 className="text-xl font-semibold text-[#FFFFF0]">
          {t("walletPreview")}
        </h2>
        <p className="mt-2 text-sm leading-7 text-[#FFFFF0]/[0.68]">
          {t("walletPrivacy")}
        </p>
      </div>

      {/* Connected State Card */}
      {walletUi.connected && (
        <div className="velmere-readout-card rounded-2xl p-5" data-tone="gold">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-medium text-[#FFFFF0]">{walletUi.walletLabel}</p>
                <p className="break-all font-mono text-xs text-[#FFFFF0]/[0.80] tabular-nums md:text-sm">{walletUi.fullAddress}</p>
                <p className="break-all font-mono text-xs text-white/[0.48] tabular-nums">
                  {t("publicAddress")}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(walletUi.fullAddress)}
            className="velmere-command-pill velmere-interaction-pulse mt-4 flex items-center gap-2 px-3 py-2 text-[10px] text-white/[0.60]"
          >
            {copiedAddress ? (
              <>
                <span className="text-[#d4af37]">{t("copied")}</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                {t("copyAddress")}
              </>
            )}
          </button>
        </div>
      )}

      {/* Wallet Buttons */}
      <WalletConnectOptions />

      {/* Public Address Checker */}
      <div className="velmere-readout-card">
        <label className="text-[10px] uppercase tracking-[0.18em] text-white/[0.40]">
          {t("manualCheck")}
        </label>
        <input
          value={manualAddress}
          onChange={(e) => setManualAddress(e.target.value)}
          placeholder="0x1234...89ab"
          spellCheck={false}
          className="mt-2 min-h-11 w-full min-w-0 rounded-full border border-white/[0.10] bg-[#0a0a0a] px-4 font-mono text-xs text-[#FFFFF0] outline-none transition-colors focus:border-[#d4af37]/[0.30] md:text-sm"
        />
        <p
          className={`mt-2 text-xs ${
            manualState === "valid" ? "text-[#d4af37]" : manualState === "invalid" ? "text-red-200/[0.80]" : "text-white/[0.42]"
          }`}
        >
          {manualState === "empty" && ""}
          {manualState === "valid" && t("validAddress")}
          {manualState === "invalid" && t("invalidAddress")}
        </p>
        {manualState === "valid" && (
          <p className="mt-1 text-xs text-white/[0.48]">
            {t("registryRequired")}
          </p>
        )}
      </div>

      {/* Safety Note */}
      <div className="velmere-readout-card flex items-start gap-3 rounded-2xl p-4" data-tone="gold">
        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#d4af37]" aria-hidden="true" />
        <p className="text-xs leading-6 text-[#FFFFF0]/[0.80]">
          {t("neverSeed")}
        </p>
      </div>
    </div>
  );
}
