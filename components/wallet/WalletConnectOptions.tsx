"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  QrCode,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import { useLocale } from "next-intl";
import { useWalletConnect } from "@/lib/wallet/useWalletConnect";
import { useWalletUiStore } from "@/store/useWalletUiStore";
import { buildPass634WalletConsentBoundary } from "@/lib/security/pass634-wallet-consent-boundary";

const copy = {
  en: {
    current: "Current wallet",
    empty: "No wallet connected.",
    safety:
      "Read-only connection. Velmère never asks for seed phrases or private keys.",
    oneOnly: "One wallet at a time. Disconnect before switching.",
    disconnect: "Disconnect wallet",
    extension: "Detected in this browser",
    mobile: "Mobile or QR connection",
    hardware: "Hardware wallet",
    other: "Other wallets",
    otherTitle: "Choose another wallet",
    otherBody:
      "Choose the wallet you already use. Available browser wallets connect here; mobile options open their trusted app or website.",
    notInstalled: "Install / open",
    statusReady: "Ready",
    statusPreview: "Open",
    primary: "Recommended",
    openOther: "See all supported wallets",
    closeOther: "Close wallet list",
    installHint:
      "When a wallet is not available in this browser, Velmère opens its official page in a new tab.",
    walletRoutes: "More wallets",
    solanaPreview: "Solana wallet",
    injectedEvm: "Available browser wallet",
    browserWallet: "Browser wallet",
    closeWalletPanel: "Close wallet list",
    readOnlyBadge: "Read-only connection",
    noSignature: "No signature",
    noTransaction: "No transaction",
    noApproval: "No token permission",
  },
  pl: {
    current: "Aktualny portfel",
    empty: "Portfel nie jest połączony.",
    safety:
      "Połączenie read-only. Velmère nigdy nie prosi o seed phrase ani klucz prywatny.",
    oneOnly: "Jeden portfel naraz. Odłącz obecny portfel przed zmianą.",
    disconnect: "Odłącz portfel",
    extension: "Wykryty w tej przeglądarce",
    mobile: "Połączenie mobilne lub QR",
    hardware: "Portfel sprzętowy",
    other: "Inne portfele",
    otherTitle: "Wybierz inny portfel",
    otherBody:
      "Wybierz portfel, którego już używasz. Dostępne portfele przeglądarkowe połączą się tutaj, a opcje mobilne otworzą zaufaną aplikację lub stronę.",
    notInstalled: "Zainstaluj / otwórz",
    statusReady: "Gotowe",
    statusPreview: "Otwórz",
    primary: "Polecane",
    openOther: "Zobacz wszystkie portfele",
    closeOther: "Zamknij listę portfeli",
    installHint:
      "Gdy portfel nie jest dostępny w tej przeglądarce, Velmère otworzy jego oficjalną stronę w nowej karcie.",
    walletRoutes: "Więcej portfeli",
    solanaPreview: "Portfel Solana",
    injectedEvm: "Dostępny portfel przeglądarkowy",
    browserWallet: "Portfel przeglądarkowy",
    closeWalletPanel: "Zamknij listę portfeli",
    readOnlyBadge: "Połączenie tylko do odczytu",
    noSignature: "Bez podpisu",
    noTransaction: "Bez transakcji",
    noApproval: "Bez uprawnień do tokenów",
  },
  de: {
    current: "Aktuelles Wallet",
    empty: "Kein Wallet verbunden.",
    safety:
      "Read-only Verbindung. Velmère fragt nie nach Seed Phrase oder Private Key.",
    oneOnly:
      "Ein Wallet gleichzeitig. Trenne das aktuelle Wallet vor dem Wechsel.",
    disconnect: "Wallet trennen",
    extension: "In diesem Browser erkannt",
    mobile: "Mobile or QR connection",
    hardware: "Hardware-Wallet",
    other: "Weitere Wallets",
    otherTitle: "Weiteres Wallet wählen",
    otherBody:
      "Wähle das Wallet, das du bereits nutzt. Verfügbare Browser-Wallets verbinden sich hier; mobile Optionen öffnen ihre vertrauenswürdige App oder Website.",
    notInstalled: "Installieren / öffnen",
    statusReady: "Bereit",
    statusPreview: "Öffnen",
    primary: "Empfohlen",
    openOther: "Alle Wallets anzeigen",
    closeOther: "Wallet-Liste schließen",
    installHint:
      "Wenn ein Wallet in diesem Browser nicht verfügbar ist, öffnet Velmère dessen offizielle Seite in einem neuen Tab.",
    walletRoutes: "Weitere Wallets",
    solanaPreview: "Solana-Wallet",
    injectedEvm: "Verfügbares Browser-Wallet",
    browserWallet: "Browser-Wallet",
    closeWalletPanel: "Wallet-Liste schließen",
    readOnlyBadge: "Nur-Lese-Verbindung",
    noSignature: "Keine Signatur",
    noTransaction: "Keine Transaktion",
    noApproval: "Keine Token-Berechtigung",
  },
} as const;

type WalletConnectOptionsProps = {
  compact?: boolean;
  showStatus?: boolean;
  otherPanelSide?: "left" | "right" | "inline";
};

type WalletOption = {
  key: string;
  label: string;
  icon: string;
  description: string;
  action: () => Promise<void> | void;
  fallbackHref?: string;
  available?: boolean;
  featured?: boolean;
};

function WalletMark({ icon }: { icon: string }) {
  const common = "h-7 w-7";
  if (icon === "metamask") {
    return (
      <Image
        src="/wallets/metamask.svg"
        alt=""
        width={28}
        height={28}
        className={`${common} object-contain`}
        aria-hidden="true"
        data-pass2028-wallet-real-icon="metamask"
      />
    );
  }
  if (icon === "walletconnect") {
    return (
      <svg viewBox="0 0 48 48" className={common} aria-hidden="true">
        <path d="M9 21c8-8 22-8 30 0l-5 5c-5-5-15-5-20 0l-5-5Z" fill="#38bdf8" />
        <path d="M16 28c4-4 12-4 16 0l-4 4c-2-2-6-2-8 0l-4-4Z" fill="#67e8f9" />
      </svg>
    );
  }
  if (icon === "coinbase") {
    return (
      <svg viewBox="0 0 48 48" className={common} aria-hidden="true">
        <circle cx="24" cy="24" r="18" fill="#2563eb" />
        <rect x="17" y="17" width="14" height="14" rx="3" fill="white" />
      </svg>
    );
  }
  if (icon === "rabby") {
    return (
      <svg viewBox="0 0 48 48" className={common} aria-hidden="true">
        <rect x="9" y="13" width="30" height="23" rx="9" fill="#94a3b8" />
        <circle cx="18" cy="25" r="3" fill="#0f172a" />
        <circle cx="30" cy="25" r="3" fill="#0f172a" />
        <path d="M18 33c4 2 8 2 12 0" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (icon === "trust") {
    return (
      <svg viewBox="0 0 48 48" className={common} aria-hidden="true">
        <path d="M24 6l15 6v10c0 10-6 16-15 20C15 38 9 32 9 22V12l15-6Z" fill="#38bdf8" />
        <path d="M24 12v23c6-3 9-7 9-13v-6l-9-4Z" fill="#0ea5e9" />
      </svg>
    );
  }
  if (icon === "phantom") {
    return (
      <Image
        src="/wallets/phantom.svg"
        alt=""
        width={28}
        height={28}
        className={`${common} object-contain`}
        aria-hidden="true"
        data-pass2028-wallet-real-icon="phantom"
      />
    );
  }
  if (icon === "ledger") {
    return (
      <svg viewBox="0 0 48 48" className={common} aria-hidden="true">
        <path d="M10 10h11v5h-6v6h-5V10Zm17 0h11v11h-5v-6h-6v-5ZM10 27h5v6h6v5H10V27Zm23 0h5v11H27v-5h6v-6Z" fill="#e5e7eb" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" className={common} aria-hidden="true">
      <rect x="9" y="13" width="30" height="22" rx="8" fill="currentColor" opacity="0.82" />
      <circle cx="33" cy="24" r="3" fill="#08080a" />
    </svg>
  );
}

function WalletBadge({
  icon,
  label,
  featured = false,
}: {
  icon: string;
  label: string;
  featured?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ${
        featured
          ? "border-velmere-gold/[0.35] bg-velmere-gold/[0.14] text-velmere-gold"
          : "border-white/[0.10] bg-white/[0.055] text-white/[0.82]"
      }`}
      title={label}
    >
      <WalletMark icon={icon} />
    </span>
  );
}

function WalletRow({
  option,
  readyLabel,
  previewLabel,
}: {
  option: WalletOption;
  readyLabel: string;
  previewLabel: string;
}) {
  const runAction = () => {
    if (
      !option.available &&
      option.fallbackHref &&
      typeof window !== "undefined"
    ) {
      window.open(option.fallbackHref, "_blank", "noopener,noreferrer");
      return;
    }
    void option.action();
  };

  return (
    <button
      type="button"
      onClick={runAction}
      className={`velmere-interaction-pulse group grid min-h-[5rem] w-full grid-cols-[3rem_minmax(0,1fr)] items-center gap-3 rounded-3xl border p-3 text-left transition hover:-translate-y-0.5 ${
        option.featured
          ? "border-velmere-gold/[0.30] bg-[linear-gradient(135deg,rgba(200,169,106,0.18),rgba(255,255,255,0.045))] hover:border-velmere-gold/[0.45]"
          : "border-white/[0.10] bg-white/[0.034] hover:border-white/[0.20] hover:bg-white/[0.055]"
      }`}
    >
      <WalletBadge
        icon={option.icon}
        label={option.label}
        featured={option.featured}
      />
      <span className="min-w-0 flex-1">
        <span className="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-sans text-[0.92rem] font-semibold leading-5 text-white/[0.86] sm:text-[0.98rem]">
          {option.label}
        </span>
        <span className="mt-1 block font-mono text-[9px] uppercase leading-4 tracking-[0.14em] text-white/[0.38]">
          {option.description}
        </span>
      </span>
      <span className="velmere-command-pill col-span-2 ml-[3.75rem] w-fit shrink-0 px-2.5 py-1 text-[8px] text-white/[0.42] group-hover:text-velmere-gold">
        {option.available ? (
          <CheckCircle2 className="h-3 w-3 text-velmere-gold" />
        ) : (
          <ExternalLink className="h-3 w-3" />
        )}
        {option.available ? readyLabel : previewLabel}
      </span>
    </button>
  );
}


function WalletConsentNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`grid gap-2 rounded-[1.35rem] border border-emerald-300/[0.16] bg-emerald-300/[0.055] p-3 text-xs leading-5 text-emerald-50/[0.76] ${compact ? "" : "mt-1"}`}
      data-wallet-read-only-warning="visible-before-wallet-choice"
      role="note"
    >
      <span className="inline-flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-100" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-emerald-50">Read-only.</strong>{" "}
          Velmère never asks for private keys, seed phrases, token approvals or transactions during wallet connection.
        </span>
      </span>
    </div>
  );
}

function OtherWalletPanel({
  open,
  onClose,
  title,
  body,
  hint,
  closeLabel,
  options,
  readyLabel,
  previewLabel,
  side = "right",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
  hint: string;
  closeLabel: string;
  options: WalletOption[];
  readyLabel: string;
  previewLabel: string;
  side?: "left" | "right" | "inline";
}) {
  if (!open) return null;
  return (
    <section
      id="velmere-other-wallets-panel"
      aria-label={title}
      className={`wallet-other-panel wallet-other-panel-side-${side} absolute top-0 z-20 overflow-hidden rounded-[1.45rem] border border-velmere-gold/[0.18] bg-[#09090b]/[0.99] text-white shadow-[0_24px_90px_rgba(0,0,0,0.68)] ring-1 ring-white/[0.055]`}
      data-surface="wallet-other-list-nested"
      data-wallet-other-side={side}
      data-pass1986-wallet-other-panel="unclipped-nested-directional"
      data-pass2000-wallet-other="left-attached-no-viewport-clipping"
      data-pass2002-wallet-other-dismiss="outside-click-escape"
    >
      <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] p-4">
        <div>
          <h3 className="font-serif text-2xl leading-none tracking-[-0.035em] text-white">
            {title}
          </h3>
          <p className="mt-2 max-w-md text-xs leading-6 text-white/[0.52]">
            {body}
          </p>
        </div>
        <button
          type="button"
          onPointerDown={(event) => { event.preventDefault(); onClose(); }}
          onClick={onClose}
          className="velmere-command-pill velmere-interaction-pulse grid h-10 w-10 shrink-0 place-items-center px-0 text-white/[0.50]"
          aria-label={closeLabel}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-[min(26rem,calc(100dvh-18rem))] overflow-y-auto overscroll-contain p-3 luxury-scrollbar">
        <div className="grid gap-2.5">
          {options.map((option) => (
            <WalletRow
              key={option.key}
              option={option}
              readyLabel={readyLabel}
              previewLabel={previewLabel}
            />
          ))}
        </div>
        <div
          className="velmere-readout-card mt-3 rounded-3xl text-xs leading-6 text-white/[0.55]"
          data-tone="gold"
        >
          <QrCode className="mb-2 h-4 w-4 text-velmere-gold" />
          {hint}
        </div>
      </div>
    </section>
  );
}

export default function WalletConnectOptions({
  compact = false,
  showStatus = true,
  otherPanelSide = "right",
}: WalletConnectOptionsProps) {
  const locale = useLocale() as keyof typeof copy;
  const t = copy[locale] ?? copy.en;
  const wallet = useWalletConnect();
  const walletUi = useWalletUiStore();
  const [otherOpen, setOtherOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const otherButtonRef = useRef<HTMLButtonElement | null>(null);
  const consentBoundary = buildPass634WalletConsentBoundary({
    action: "connect_read_only",
  });

  const openOtherWallets = () => setOtherOpen((current) => !current);

  useEffect(() => {
    if (!otherOpen) return undefined;
    const closeFromPointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (rootRef.current?.contains(target)) return;
      setOtherOpen(false);
    };
    const closeFromKeyboard = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOtherOpen(false);
      otherButtonRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", closeFromPointer, true);
    document.addEventListener("keydown", closeFromKeyboard, true);
    return () => {
      document.removeEventListener("pointerdown", closeFromPointer, true);
      document.removeEventListener("keydown", closeFromKeyboard, true);
    };
  }, [otherOpen]);

  const primaryOptions: WalletOption[] = [
    {
      key: "metamask",
      label: "MetaMask",
      icon: "metamask",
      description: t.extension,
      action: wallet.connectMetaMask,
      available: wallet.detectedWallets.metamask,
      featured: true,
    },
    {
      key: "phantom",
      label: "Phantom",
      icon: "phantom",
      description: t.solanaPreview,
      action: wallet.connectPhantom,
      available: wallet.detectedWallets.phantom,
      featured: true,
    },
  ];

  const otherOptions: WalletOption[] = [
    {
      key: "walletconnect",
      label: "WalletConnect",
      icon: "walletconnect",
      description: t.mobile,
      action: wallet.connectWalletConnect,
      available: wallet.detectedWallets.walletconnect,
      fallbackHref: "https://walletconnect.com/",
    },
    {
      key: "browser",
      label: t.browserWallet,
      icon: "wallet",
      description: t.injectedEvm,
      action: wallet.connectMetaMask,
      available: wallet.detectedWallets.metamask,
    },
    {
      key: "coinbase",
      label: "Coinbase Wallet",
      icon: "coinbase",
      description: t.mobile,
      action: wallet.connectWalletConnect,
      available: wallet.detectedWallets.walletconnect,
      fallbackHref: "https://www.coinbase.com/wallet",
    },
    {
      key: "rabby",
      label: "Rabby",
      icon: "rabby",
      description: t.extension,
      action: wallet.connectMetaMask,
      available: wallet.detectedWallets.metamask,
      fallbackHref: "https://rabby.io/",
    },
    {
      key: "trust",
      label: "Trust Wallet",
      icon: "trust",
      description: t.mobile,
      action: wallet.connectWalletConnect,
      available: wallet.detectedWallets.walletconnect,
      fallbackHref: "https://trustwallet.com/",
    },
    {
      key: "rainbow",
      label: "Rainbow",
      icon: "wallet",
      description: t.mobile,
      action: wallet.connectWalletConnect,
      available: wallet.detectedWallets.walletconnect,
      fallbackHref: "https://rainbow.me/",
    },
    {
      key: "ledger",
      label: "Ledger Live",
      icon: "ledger",
      description: t.hardware,
      action: wallet.connectWalletConnect,
      available: wallet.detectedWallets.walletconnect,
      fallbackHref: "https://www.ledger.com/ledger-live",
    },
  ];

  return (
    <div ref={rootRef} className="wallet-connect-options-root relative min-h-[24rem] space-y-3" data-pass1986-wallet-options-root="safe-nested-other-panel" data-pass2002-wallet-options-root="outside-click-escape-other-wallets">
      {showStatus ? (
        <div className="velmere-command-shell overflow-hidden rounded-[1.65rem] border-velmere-gold/[0.10]">
          <div className="border-b border-white/[0.10] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-velmere-gold">
              {t.current}
            </p>
            <p className="mt-2 break-all text-sm leading-6 text-white/[0.70]">
              {walletUi.connected ? walletUi.fullAddress : t.empty}
            </p>
          </div>
          <div className="flex items-start gap-3 p-4 text-xs leading-6 text-white/[0.50]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-velmere-gold" />
            <span>{walletUi.connected ? t.oneOnly : t.safety}</span>
          </div>
          {!walletUi.connected ? (
            <div
              data-pass634-wallet-consent-boundary={consentBoundary.state}
              className="grid grid-cols-1 gap-2 border-t border-white/[0.08] bg-black/[0.18] p-4 sm:grid-cols-3"
            >
              {[t.noSignature, t.noTransaction, t.noApproval].map((label) => (
                <span
                  key={label}
                  className="velmere-command-pill min-h-9 gap-2 rounded-2xl border-emerald-300/[0.16] bg-emerald-300/[0.055] px-3 text-[9px] text-emerald-100/[0.72]"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  {label}
                </span>
              ))}
              <span className="sr-only">
                {t.readOnlyBadge}: {consentBoundary.humanSummary}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {!walletUi.connected ? (
        <>
          {!showStatus ? <WalletConsentNotice compact={compact} /> : null}
          <p className="px-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/[0.30]">
            {t.primary}
          </p>
          <div className="grid gap-3">
            {primaryOptions.map((option) => (
              <WalletRow
                key={option.key}
                option={option}
                readyLabel={t.statusReady}
                previewLabel={t.notInstalled}
              />
            ))}
          </div>
          <button
            ref={otherButtonRef}
            type="button"
            onClick={openOtherWallets}
            data-pass1986-other-wallet-toggle="true"
            data-pass1983-other-wallet-toggle="true"
            data-pass1983-other-wallet-side={otherPanelSide}
            className={`velmere-command-shell velmere-interaction-pulse group flex min-h-14 w-full items-center justify-between gap-3 rounded-3xl px-4 text-left transition hover:border-velmere-gold/[0.30] hover:bg-white/[0.045] ${compact ? "" : "mt-1"}`}
            aria-label={t.openOther}
            aria-expanded={otherOpen}
            aria-controls="velmere-other-wallets-panel"
          >
            <span className="inline-flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-velmere-gold/[0.20] bg-velmere-gold/[0.08] text-velmere-gold">
                <WalletCards className="h-4 w-4" />
              </span>
              <span>
                <span className="block font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white/[0.62] group-hover:text-white">
                  {t.other}
                </span>
                <span className="mt-1 block text-xs text-white/[0.34]">
                  {t.otherTitle}
                </span>
              </span>
            </span>
            <ExternalLink className="h-4 w-4 shrink-0 text-white/[0.34] group-hover:text-velmere-gold" />
          </button>
          <OtherWalletPanel
            open={otherOpen}
            onClose={() => setOtherOpen(false)}
            title={t.otherTitle}
            body={t.otherBody}
            hint={t.installHint}
            closeLabel={t.closeWalletPanel}
            options={otherOptions}
            readyLabel={t.statusReady}
            previewLabel={t.statusPreview}
            side={otherPanelSide}
          />
        </>
      ) : (
        <button
          type="button"
          onClick={() => wallet.disconnect()}
          className="velmere-command-pill velmere-interaction-pulse inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-4 text-[10px] text-white/[0.70] hover:border-red-300/[0.30] hover:text-red-200"
        >
          {t.disconnect}
        </button>
      )}
    </div>
  );
}
