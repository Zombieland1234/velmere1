"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { WalletKind, ConnectedWallet, WalletConnectionState } from "@/lib/wallet/types";
import { useUiSounds } from "@/lib/audio/useUiSounds";

type WalletConnectButtonProps = {
  kind: WalletKind;
  onConnect: () => void;
  state: WalletConnectionState;
  connectedWallet?: ConnectedWallet | null;
};

const WALLET_CONFIG: Record<WalletKind, { label: string; emoji: string; iconPath: string }> = {
  metamask: {
    label: "MetaMask",
    emoji: "MM",
    iconPath: "/wallets/metamask.svg",
  },
  phantom: {
    label: "Phantom",
    emoji: "PH",
    iconPath: "/wallets/phantom.svg",
  },
  walletconnect: {
    label: "WalletConnect",
    emoji: "WC",
    iconPath: "",
  },
};

function StatusDot({ state }: { state: WalletConnectionState }) {
  const getStatusColor = () => {
    switch (state) {
      case "connected":
        return "bg-green-500";
      case "connecting":
        return "bg-yellow-500 animate-pulse";
      case "not_installed":
      case "rejected":
        return "bg-red-500";
      default:
        return "bg-white/[0.30]";
    }
  };

  return (
    <div
      className={`h-2 w-2 rounded-full ${getStatusColor()}`}
      aria-hidden="true"
    />
  );
}

function WalletIcon({ kind, connectedWallet }: { kind: WalletKind; connectedWallet?: ConnectedWallet | null }) {
  const config = WALLET_CONFIG[kind];
  const [iconError, setIconError] = useState(false);
  const [iconLoaded, setIconLoaded] = useState(false);

  // Reset icon states when kind changes
  useEffect(() => {
    setIconError(false);
    setIconLoaded(false);
  }, [kind]);

  // If connected, show the wallet's icon
  if (connectedWallet?.kind === kind) {
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.10]">
        <span className="text-sm">{connectedWallet.icon}</span>
      </div>
    );
  }

  // Try to load the SVG icon, fallback to emoji
  if (!iconError && config.iconPath) {
    return (
      <div className="relative h-8 w-8">
        <Image
          src={config.iconPath}
          alt={config.label}
          fill
          className="rounded-full object-contain"
          onError={() => setIconError(true)}
          onLoad={() => setIconLoaded(true)}
          sizes="32px"
        />
        {!iconLoaded && (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.10]">
            <span className="text-sm">{config.emoji}</span>
          </div>
        )}
      </div>
    );
  }

  // Fallback to emoji in a styled circle
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.10]">
      <span className="text-sm">{config.emoji}</span>
    </div>
  );
}

export default function WalletConnectButton({
  kind,
  onConnect,
  state,
  connectedWallet,
}: WalletConnectButtonProps) {
  const t = useTranslations("WalletButton");
  const config = WALLET_CONFIG[kind];
  const isThisWalletConnected = connectedWallet?.kind === kind;
  const isLoading = state === "connecting" && !isThisWalletConnected;
  const { playClick, playHover } = useUiSounds();

  const getButtonText = () => {
    if (isThisWalletConnected && connectedWallet) {
      return connectedWallet.shortAddress;
    }
    if (connectedWallet && !isThisWalletConnected) {
      return "Already connected";
    }
    
    switch (state) {
      case "connecting":
        return t("connecting", { label: config.label });
      case "not_installed":
        return `Open ${config.label}`;
      case "rejected":
        return t("rejected");
      default:
        return config.label;
    }
  };

  const getButtonDisabled = () => {
    if (connectedWallet) return true;
    if (state === "connecting") return true;
    return false;
  };

  return (
    <button
      type="button"
      data-magnetic
      onMouseEnter={playHover}
      onClick={() => {
        playClick();
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(45);
        onConnect();
      }}
      disabled={getButtonDisabled()}
      className={`
        flex min-h-[44px] w-full items-center justify-between rounded-full
        border border-white/[0.10] bg-white/[0.035] px-5
        font-sans text-[10px] font-semibold uppercase tracking-[0.16em]
        transition-all duration-200 active:scale-95
        hover:bg-white/[0.07] hover:border-[#d4af37]/[0.30]
        active:border-[#d4af37] active:bg-white/[0.08]
        disabled:opacity-40 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-[#d4af37]/[0.20]
        ${isThisWalletConnected ? 'border-[#d4af37]/[0.30] bg-white/[0.06]' : ''}
      `}
    >
      <div className="flex items-center gap-3">
        <WalletIcon kind={kind} connectedWallet={connectedWallet} />
        <span className="text-[#FFFFF0]/[0.80]">
          {getButtonText()}
        </span>
      </div>
      
      <StatusDot state={isThisWalletConnected ? "connected" : state} />
    </button>
  );
}
