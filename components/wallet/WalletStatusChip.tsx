"use client";

import { useRef, useState } from "react";
import { Check, ChevronDown, Copy, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMounted } from "@/lib/hooks/useMounted";
import type { ConnectedWallet } from "@/lib/wallet/types";
import { DropdownRoot } from "@/components/ui/OverlayPrimitives";

type WalletStatusChipProps = {
  connectedWallet: ConnectedWallet | null;
  onDisconnect: () => void;
  showDropdown?: boolean;
};

export default function WalletStatusChip({
  connectedWallet,
  onDisconnect,
  showDropdown = true,
}: WalletStatusChipProps) {
  const t = useTranslations("Wallet");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div
        className="h-10 w-40 animate-pulse rounded-full border border-white/[0.08] bg-white/[0.025]"
        aria-hidden="true"
      />
    );
  }

  if (!connectedWallet) return null;

  const copyToClipboard = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      window.setTimeout(() => setCopiedAddress(false), 1800);
    } catch {
      setCopiedAddress(false);
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={showDropdown ? isDropdownOpen : undefined}
        aria-haspopup={showDropdown ? "menu" : undefined}
        onClick={() => showDropdown && setIsDropdownOpen((value) => !value)}
        className="velmere-command-pill velmere-interaction-pulse flex min-h-11 items-center gap-2 px-3.5 text-[10px] uppercase tracking-[0.13em] text-[#FFFFF0]/[0.78]"
        data-tone="gold"
      >
        <span
          className="grid h-7 w-7 place-items-center rounded-full border border-velmere-gold/[0.20] bg-black/[0.28] text-sm"
          aria-hidden="true"
        >
          {connectedWallet.icon}
        </span>
        <span className="font-mono">{connectedWallet.shortAddress}</span>
        <span className="hidden text-[#d4af37]/[0.64] sm:inline">
          {connectedWallet.chainType.toUpperCase()}
        </span>
        {showDropdown ? (
          <ChevronDown
            className={`h-3.5 w-3.5 text-white/[0.38] transition-transform ${isDropdownOpen ? "rotate-180 text-velmere-gold" : ""}`}
            aria-hidden="true"
          />
        ) : null}
      </button>

      <DropdownRoot
        open={showDropdown && isDropdownOpen}
        onClose={() => setIsDropdownOpen(false)}
        anchorRef={buttonRef}
        ariaLabel={connectedWallet.label}
        width={352}
        align="end"
        surfaceData={{ surface: "wallet-status" }}
      >
        <div className="rounded-[1rem] border border-white/[0.07] bg-black/[0.20] px-3.5 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-xs font-semibold text-[#FFFFF0]">
              {connectedWallet.label}
            </p>
            <span className="rounded-full border border-velmere-gold/[0.18] bg-velmere-gold/[0.06] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.14em] text-velmere-gold">
              {connectedWallet.chainType.toUpperCase()}
            </span>
          </div>
          <p className="mt-2 break-all font-mono text-[10px] leading-5 text-white/[0.46]">
            {connectedWallet.address}
          </p>
          {connectedWallet.chainId ? (
            <p className="mt-2 text-[10px] text-white/[0.34]">
              {t("publicAddress")}: {connectedWallet.chainId}
            </p>
          ) : null}
        </div>

        <div className="mt-2 grid gap-1">
          <button
            type="button"
            role="menuitem"
            onClick={() => void copyToClipboard(connectedWallet.address)}
            className="velmere-menu-action"
          >
            {copiedAddress ? (
              <Check className="h-4 w-4 text-emerald-300" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{copiedAddress ? t("copied") : t("copyAddress")}</span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDisconnect();
              setIsDropdownOpen(false);
            }}
            className="velmere-menu-action text-red-200/[0.82] hover:bg-red-500/[0.08] hover:text-red-100"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span>{t("disconnect")}</span>
          </button>
        </div>

        {connectedWallet.chainType === "solana" ? (
          <p className="mx-1 mt-2 rounded-xl border border-velmere-gold/[0.12] bg-velmere-gold/[0.045] px-3 py-2 text-[10px] leading-5 text-velmere-gold/[0.70]">
            {t("previewOnly")}
          </p>
        ) : null}
      </DropdownRoot>
    </div>
  );
}
