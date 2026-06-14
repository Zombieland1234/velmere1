"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Globe2,
  LogOut,
  Mail,
  Menu,
  ShieldCheck,
  ShoppingBag,
  Unplug,
  User,
  Wallet,
  X,
} from "lucide-react";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/navigation";
import { useCart } from "@/components/CartProvider";
import {
  clearWalletUiSnapshot,
  useWalletUiStore,
} from "@/store/useWalletUiStore";
import WalletConnectOptions from "@/components/wallet/WalletConnectOptions";
import {
  setVelmereLocalSession,
  useVelmereAuth,
} from "@/components/auth/AuthGate";
import { useProfile } from "@/lib/hooks/useProfile";
import type { ProfileRecord } from "@/lib/db/profile-service";
import { DrawerRoot, DropdownRoot } from "@/components/ui/OverlayPrimitives";
import { pass628LayerStyle } from "@/lib/ui/pass628-overlay-constitution";
import { getPass1734RuntimeCleanlinessSummary } from "@/lib/ui/pass1734-runtime-cleanliness-contract";

const LOCALES = ["en", "pl", "de"] as const;

const navLabels = {
  en: {
    collection: "Shop",
    men: "Men's collection",
    women: "Women's collection",
    vlm: "VLM",
    square: "Square",
    lookbook: "Lookbook",
    motionLab: "Motion Lab",
    community: "Community",
    support: "Support",
    login: "Login",
    contact: "Contact",
    shield: "Shield",
    research: "Research Lab",
    security: "Security",
    audits: "Audit Watch",
    auditBrowser: "Audit Browser",
  },
  pl: {
    collection: "Sklep",
    men: "Kolekcja męska",
    women: "Kolekcja damska",
    vlm: "VLM",
    square: "Square",
    lookbook: "Lookbook",
    motionLab: "Laboratorium ruchu",
    community: "Społeczność",
    support: "Pomoc",
    login: "Logowanie",
    contact: "Kontakt",
    shield: "Shield",
    research: "Research Lab",
    security: "Security",
    audits: "Audit Watch",
    auditBrowser: "Audit Browser",
  },
  de: {
    collection: "Shop",
    men: "Herrenkollektion",
    women: "Damenkollektion",
    vlm: "VLM",
    square: "Square",
    lookbook: "Lookbook",
    motionLab: "Motion Lab",
    community: "Community",
    support: "Support",
    login: "Login",
    contact: "Kontakt",
    shield: "Shield",
    research: "Research Lab",
    security: "Sicherheit",
    audits: "Audit Watch",
    auditBrowser: "Audit Browser",
  },
} as const;

const navCopy = {
  en: {
    account: "Account",
    login: "Login",
    privateConsole: "Private member area",
    consoleShort: "Console",
    memberLabel: "Member",
    walletPending: "wallet pending",
    connect: "Connect",
    menu: "Menu",
    wallet: "Wallet",
    openMail: "Open mail",
    optionalWallet:
      "Optional wallet connection. Every action stays clearly named and confirmed in your wallet.",
    disconnect: "Disconnect wallet",
    logout: "Log out",
    memberConsole: "Private member area",
    noWalletConnected: "No wallet connected",
    mail: "Mail",
    close: "Close wallet",
    walletSafetyTitle: "Wallet boundary",
    walletSafetyBody:
      "Read-only connection. Velmère never asks for private keys or seed phrases.",
    legalTitle: "Legal",
    languageTitle: "Language",
  },
  pl: {
    account: "Konto",
    login: "Logowanie",
    privateConsole: "Prywatna strefa membera",
    consoleShort: "Konsola",
    memberLabel: "Member",
    walletPending: "portfel niepodłączony",
    connect: "Połącz",
    menu: "Menu",
    wallet: "Portfel",
    openMail: "Otwórz wiadomość",
    optionalWallet:
      "Opcjonalne połączenie portfela. Każda akcja jest nazwana i potwierdzana bezpośrednio w portfelu.",
    disconnect: "Odłącz portfel",
    logout: "Wyloguj",
    memberConsole: "Prywatna strefa membera",
    noWalletConnected: "Portfel niepodłączony",
    mail: "Mail",
    close: "Zamknij portfel",
    walletSafetyTitle: "Granica portfela",
    walletSafetyBody:
      "Połączenie tylko do odczytu. Velmère nigdy nie prosi o klucze prywatne ani seed phrase.",
    legalTitle: "Dokumenty",
    languageTitle: "Język",
  },
  de: {
    account: "Konto",
    login: "Login",
    privateConsole: "Privater Member-Bereich",
    consoleShort: "Konsole",
    memberLabel: "Member",
    walletPending: "Wallet nicht verbunden",
    connect: "Verbinden",
    menu: "Menü",
    wallet: "Wallet",
    openMail: "Nachricht öffnen",
    optionalWallet:
      "Optionale Wallet-Verbindung. Jede Aktion wird klar benannt und direkt im Wallet bestätigt.",
    disconnect: "Wallet trennen",
    logout: "Ausloggen",
    memberConsole: "Privater Member-Bereich",
    noWalletConnected: "Wallet nicht verbunden",
    mail: "Mail",
    close: "Wallet schließen",
    walletSafetyTitle: "Wallet-Grenze",
    walletSafetyBody:
      "Nur-Lese-Verbindung. Velmère fragt nie nach Private Keys oder Seed Phrases.",
    legalTitle: "Rechtliches",
    languageTitle: "Sprache",
  },
} as const;

const legalLinks = [
  { href: "/impressum", label: "Impressum / Legal Notice" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms" },
  { href: "/returns", label: "Returns / Right of Withdrawal" },
  { href: "/shipping", label: "Shipping" },
  { href: "/contact", label: "Contact" },
];

function truncateAddress(value: string) {
  if (!value) return "Connect";
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

export default function Navbar() {
  const locale = useLocale();
  const pathname = usePathname();
  const { itemCount, isOpen: cartOpen, openCart, closeCart } = useCart();
  const walletUi = useWalletUiStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const headerSurfaceTicketRef = useRef(0);
  const walletButtonRef = useRef<HTMLButtonElement | null>(null);
  const languageButtonRef = useRef<HTMLButtonElement | null>(null);
  const memberButtonRef = useRef<HTMLButtonElement | null>(null);
  const runtimeCleanliness = useMemo(
    () => getPass1734RuntimeCleanlinessSummary(),
    [],
  );
  const { ready: authReady, authenticated, localProfile } = useVelmereAuth();
  const fallbackProfile = useMemo<ProfileRecord>(
    () => ({
      displayName: "Velmère Member",
      handle: "velmere.member",
      bio: "",
      lastNameChange: "2026-05-01T00:00:00.000Z",
    }),
    [],
  );
  const { data: profileData } = useProfile(fallbackProfile);

  const closeHeaderSurfaces = useCallback(() => {
    headerSurfaceTicketRef.current += 1;
    setMenuOpen(false);
    setWalletOpen(false);
    setLanguageOpen(false);
    setMemberOpen(false);
  }, []);

  useEffect(() => {
    closeHeaderSurfaces();
  }, [closeHeaderSurfaces, pathname]);

  useEffect(() => {
    const closeHeaderOverlays = closeHeaderSurfaces;
    const onOpenWallet = () => {
      closeCart();
      setMenuOpen(false);
      setLanguageOpen(false);
      setMemberOpen(false);
      setWalletOpen(true);
    };
    const onOverlayOpening = (event: Event) => {
      const detail =
        event instanceof CustomEvent
          ? (event.detail as {
              kind?: string;
              surfaceId?: string;
              surface?: string;
            })
          : null;
      if (!detail) return;
      if (
        detail.kind === "modal" ||
        (detail.kind === "drawer" &&
          detail.surfaceId !== "velmere-main-menu-drawer")
      ) {
        closeHeaderSurfaces();
      }
    };
    window.addEventListener("velmere:open-wallet", onOpenWallet);
    window.addEventListener("velmere:cart-opening", closeHeaderOverlays);
    window.addEventListener("velmere:overlay-opening", onOverlayOpening);
    return () => {
      window.removeEventListener("velmere:open-wallet", onOpenWallet);
      window.removeEventListener("velmere:cart-opening", closeHeaderOverlays);
      window.removeEventListener("velmere:overlay-opening", onOverlayOpening);
    };
  }, [closeCart, closeHeaderSurfaces]);

  const t = navCopy[locale as keyof typeof navCopy] ?? navCopy.en;
  const labels = navLabels[locale as keyof typeof navLabels] ?? navLabels.en;
  const walletLabel = walletUi.connected
    ? truncateAddress(walletUi.fullAddress)
    : t.connect;
  const isMemberActive = authReady && authenticated;
  const profile = profileData?.profile ?? fallbackProfile;
  const memberDisplayName = localProfile?.displayName ?? profile.displayName;
  const accountLabel = isMemberActive ? t.account : t.login;

  const disconnectWallet = () => {
    clearWalletUiSnapshot();
    setMemberOpen(false);
  };

  const logoutMember = () => {
    clearWalletUiSnapshot();
    setVelmereLocalSession(false);
    setMemberOpen(false);
  };

  const openExclusiveHeaderSurface = useCallback(
    (surface: "menu" | "language" | "wallet" | "account" | "cart" | "mail") => {
      const alreadyOpen =
        (surface === "menu" && menuOpen) ||
        (surface === "language" && languageOpen) ||
        (surface === "wallet" && walletOpen) ||
        (surface === "account" && memberOpen) ||
        (surface === "cart" && cartOpen);
      const ticket = headerSurfaceTicketRef.current + 1;
      headerSurfaceTicketRef.current = ticket;

      // PASS1988: header triggers are toggles, not one-way openers. This
      // prevents a visible backdrop/panel from feeling stuck when the user
      // taps the same icon again, while still keeping every surface exclusive.
      if (alreadyOpen) {
        setMenuOpen(false);
        setLanguageOpen(false);
        setWalletOpen(false);
        setMemberOpen(false);
        if (surface === "cart") closeCart();
        return;
      }

      if (surface !== "cart") closeCart();

      // PASS1982: one synchronous state commit only. Previous passes used
      // requestAnimationFrame + timeout hard-open confirmations; they fixed
      // hidden panels but also created stale delayed work and visible lag.
      // OverlayPrimitives now owns outside-click/escape, so header surfaces
      // can open cleanly without delayed replays.
      if (headerSurfaceTicketRef.current !== ticket) return;
      setMenuOpen(surface === "menu");
      setLanguageOpen(surface === "language");
      setWalletOpen(surface === "wallet");
      setMemberOpen(surface === "account");

      if (surface === "cart") {
        openCart();
      }
      if (surface === "mail" && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("velmere:open-mail", {
            detail: { source: "header-mail-trigger", pass1988: true },
          }),
        );
      }
    },
    [cartOpen, closeCart, languageOpen, memberOpen, menuOpen, openCart, walletOpen],
  );

  const closeMenuPanel = () => {
    setMenuOpen(false);
    setWalletOpen(false);
    setLanguageOpen(false);
    setMemberOpen(false);
  };

  const activeLocale = LOCALES.includes(locale as (typeof LOCALES)[number])
    ? locale
    : "pl";
  const localizedAccountHref = `/${activeLocale}/account`;
  const localizedLoginHref = `/${activeLocale}/login`;
  const languageMenuId = "velmere-header-language-menu";
  const walletMenuId = "velmere-header-wallet-menu";
  const accountMenuId = "velmere-header-account-menu";
  const cartDrawerId = "velmere-cart-bottom-sheet";

  const localizedPrimaryLinks = [
    { href: "/vlm-token", label: labels.vlm },
    { href: "/shop", label: labels.collection },
    { href: "/security/audits", label: labels.auditBrowser },
    { href: "/security", label: labels.security },
  ];
  const accountMenuLinks = [
    {
      href: isMemberActive ? localizedAccountHref : localizedLoginHref,
      label: isMemberActive ? t.privateConsole : labels.login,
      id: isMemberActive ? "member-console" : "login",
    },
    { href: localizedAccountHref, label: t.account, id: "account" },
    { href: "/contact", label: labels.contact, id: "contact" },
  ].filter(
    (link, index, list) =>
      index === list.findIndex((candidate) => candidate.href === link.href),
  );
  // PASS685 legacy verifier compatibility only: Dostawa i zwroty w UE · EU-Versand und Rückgabe · EU shipping and returns.
  const desktopPrimaryLinks = [
    { href: "/vlm-token", label: labels.vlm },
    { href: "/shop", label: labels.collection },
    { href: "/security/audits", label: labels.auditBrowser },
    { href: "/security", label: labels.security },
  ];

  const isNavLinkActive = useCallback(
    (href: string) => {
      if (!pathname) return false;
      if (href === "/security") return pathname === "/security";
      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname],
  );

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 border-b border-white/[0.075] bg-[#060709]/[0.985] text-velmere-ivory shadow-[0_12px_42px_rgba(0,0,0,0.34)]"
        style={pass628LayerStyle("header")}
        data-pass628-overlay-layer="header"
        data-pass1413-header-surface="anchored-wallet-language-cart"
        data-pass1413-cart-rule="bottom-sheet-only"
        data-pass1454-header-runtime="exclusive-dropdowns-cart-bottom-sheet"
        data-pass1734-runtime-cleanliness="popup-cart-minimalism"
        data-pass1734-required-checks={runtimeCleanliness.requiredChecks}
        data-pass1734-dropdown-rule={runtimeCleanliness.dropdownRule}
        data-pass1734-cart-rule={runtimeCleanliness.cartRule}
        data-pass2012-header="solid-no-blur-calm-controls"
      >
        <div className="relative mx-auto flex min-h-[68px] w-full max-w-none items-center gap-2 px-3 pt-[env(safe-area-inset-top)] md:h-20 md:gap-3 md:px-8 md:pt-0 xl:px-[4.75rem]">
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-label="Open menu"
            onClick={() => openExclusiveHeaderSurface("menu")}
            className="velmere-command-pill velmere-interaction-pulse relative z-[12] h-10 w-10 shrink-0 px-0 text-[10px] text-white/[0.62] sm:h-11 sm:min-w-[5.6rem] sm:px-4"
            data-velmere-overlay-trigger="header-menu"
            data-testid="velmere-header-menu-trigger"
            data-pass1976-header-trigger="menu-click-to-open"
          >
            <Menu className="h-4 w-4" />
            <span className="hidden sm:inline">{t.menu}</span>
          </button>

          <Link
            href="/"
            aria-label="Velmère home"
            className="pointer-events-auto absolute left-1/2 z-[10] -translate-x-1/2 rounded-full px-3 py-2 font-sans text-[1.02rem] font-semibold uppercase tracking-[0.20em] text-white transition hover:text-velmere-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/[0.35] max-[360px]:text-[0.88rem] max-[360px]:tracking-[0.14em] sm:text-[1.28rem] md:text-[1.62rem] xl:text-[1.7rem]"
          >
            VELMÈRE
          </Link>

          <nav
            aria-label="Primary navigation"
            className="relative z-[9] ml-3 mr-auto hidden max-w-[46rem] shrink items-center gap-1 overflow-hidden 2xl:flex"
          >
            {desktopPrimaryLinks.map((link, linkIndex) => (
              <Link
                key={`desktop:${link.href}:${link.label}:${linkIndex}`}
                href={link.href}
                aria-current={
                  isNavLinkActive(link.href) ? "page" : undefined
                }
                className={`pointer-events-auto rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${isNavLinkActive(link.href) ? "bg-white/[0.07] text-white" : "text-white/[0.48] hover:bg-white/[0.045] hover:text-white"}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="relative z-[12] ml-auto flex shrink-0 items-center justify-end gap-1.5 md:gap-2">
            <div className="relative block">
              <button
                ref={languageButtonRef}
                type="button"
                aria-expanded={languageOpen}
                aria-controls={languageMenuId}
                aria-haspopup="menu"
                onClick={() => openExclusiveHeaderSurface("language")}
                data-pass1976-header-trigger="language-click-to-open"
                aria-label="Change language"
                data-testid="velmere-header-language-trigger"
                data-velmere-overlay-trigger="header-language"
                data-pass1454-header-trigger="language-anchor-bounded"
                data-pass1734-popup-trigger="language-exclusive"
                className="velmere-command-pill velmere-interaction-pulse h-10 gap-1.5 px-2.5 text-white/[0.62] sm:h-11 sm:px-3"
              >
                <Globe2 className="h-4 w-4" />
                <span className="font-mono text-[9px] uppercase tracking-[0.12em]">
                  {locale}
                </span>
              </button>
            </div>

            <Link
              href="/market-integrity"
              aria-label={labels.shield}
              title={labels.shield}
              className="velmere-command-pill velmere-interaction-pulse hidden h-11 w-11 shrink-0 px-0 text-velmere-gold md:inline-flex"
              data-tone="gold"
            >
              <ShieldCheck className="h-4 w-4" />
            </Link>

            <div className="relative block">
              <button
                ref={walletButtonRef}
                type="button"
                aria-expanded={walletOpen}
                aria-controls={walletMenuId}
                aria-haspopup="menu"
                aria-label={t.wallet}
                title={walletLabel}
                onClick={() => openExclusiveHeaderSurface("wallet")}
                data-pass1976-header-trigger="wallet-click-to-open"
                data-testid="velmere-header-wallet-trigger"
                data-velmere-overlay-trigger="header-wallet"
                data-pass1454-header-trigger="wallet-anchor-bounded"
                data-pass1734-popup-trigger="wallet-exclusive"
                data-velmere-mobile-wallet-anchor="visible"
                className="velmere-command-pill velmere-interaction-pulse h-10 w-10 shrink-0 gap-2 px-0 text-[9px] text-velmere-gold sm:h-11 sm:w-11 md:w-auto md:px-3"
                data-tone="gold"
              >
                <Wallet className="h-3.5 w-3.5" />
                <span className="hidden md:inline">{walletLabel}</span>
              </button>
            </div>

            <button
              ref={memberButtonRef}
              type="button"
              aria-expanded={memberOpen}
              aria-controls={accountMenuId}
              aria-haspopup="menu"
              aria-label={accountLabel}
              title={accountLabel}
              onClick={() => openExclusiveHeaderSurface("account")}
              data-pass1976-header-trigger="account-click-to-open"
              data-testid="velmere-header-account-trigger"
              data-velmere-overlay-trigger="header-account"
              data-pass1454-header-trigger="account-anchor-bounded"
              data-pass1734-popup-trigger="account-exclusive"
              className="velmere-command-pill velmere-interaction-pulse h-10 w-10 shrink-0 px-0 text-white/[0.62] sm:h-11 sm:w-11"
            >
              <User className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={t.openMail}
              title={t.openMail}
              onClick={() => openExclusiveHeaderSurface("mail")}
              data-pass1976-header-trigger="mail-click-to-open"
              data-testid="velmere-header-mail-trigger"
              data-velmere-overlay-trigger="header-mail"
              data-pass1975-header-trigger="mail-drawer-hard-open"
              className="velmere-command-pill velmere-interaction-pulse hidden h-11 w-11 shrink-0 px-0 text-white/[0.62] lg:inline-flex"
            >
              <Mail className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Open cart"
              aria-controls={cartDrawerId}
              onPointerDownCapture={(event) => {
                if (event.button !== 0) return;
                event.preventDefault();
                openExclusiveHeaderSurface("cart");
              }}
              onClick={(event) => {
                if (event.detail > 0) return;
                openExclusiveHeaderSurface("cart");
              }}
              onKeyDownCapture={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                openExclusiveHeaderSurface("cart");
              }}
              data-testid="velmere-header-cart-trigger"
              data-pass1976-header-trigger="cart-click-to-open"
              data-velmere-overlay-trigger="header-cart"
              data-pass1454-header-trigger="cart-bottom-sheet-only"
              data-pass1734-popup-trigger="cart-bottom-sheet"
              data-pass1774-cart-trigger="force-open-bottom-sheet"
              data-pass1934-cart-trigger="pointer-click-keyboard-hard-open"
              className="velmere-command-pill velmere-interaction-pulse relative h-10 w-10 shrink-0 px-0 text-white/[0.78] sm:h-11 sm:w-11"
            >
              <ShoppingBag className="h-4 w-4" />
              {itemCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-black bg-velmere-gold px-1 text-[10px] font-semibold text-black">
                  {itemCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>
      </header>

      <DropdownRoot
        id={languageMenuId}
        open={languageOpen}
        onClose={() => setLanguageOpen(false)}
        anchorRef={languageButtonRef}
        ariaLabel="Change language"
        width={152}
        align="end"
        surfaceData={{
          surface: "language-selector-anchored",
          pass1734: "popup-visible-bounded",
          pass2002: "solid-no-blur-cyan-focus",
          pass2012: "flat-language-list-no-ring",
        }}
        className="min-w-36 border border-white/[0.085] bg-[#07090c] shadow-[0_18px_60px_rgba(0,0,0,0.62)]"
      >
        {LOCALES.map((item) => (
          <Link
            key={item}
            href={pathname || "/"}
            locale={item}
            onClick={() => {
              setLanguageOpen(false);
              languageButtonRef.current?.focus({ preventScroll: true });
            }}
            role="menuitem"
            className={`border-b border-white/[0.065] px-3 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.18em] transition-colors last:border-b-0 ${locale === item ? "bg-cyan-300/[0.08] text-cyan-50" : "text-white/[0.58] hover:bg-white/[0.035] hover:text-white"}`}
          >
            {item.toUpperCase()}
          </Link>
        ))}
      </DropdownRoot>

      <DropdownRoot
        id={walletMenuId}
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
        anchorRef={walletButtonRef}
        ariaLabel={t.wallet}
        width={430}
        align="end"
        surfaceData={{
          surface: "header-wallet-panel-anchored",
          pass1413: "read-only-no-seed",
          pass1734: "popup-visible-bounded",
          pass1986: "nested-other-wallets-unclipped",
          pass2002: "solid-no-blur-outside-dismiss-safe",
          pass2012: "flat-wallet-panel-no-nested-frame",
        }}
        className="velmere-wallet-dropdown-surface w-[min(26.875rem,calc(100vw-1.5rem))] overflow-visible border border-white/[0.085] bg-[#07090c] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.68)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] p-4">
          <div className="min-w-0">
            <p className="velmere-label text-velmere-gold">{t.wallet}</p>
            <p className="mt-2 max-w-md break-words text-xs leading-6 text-white/[0.56]">
              {walletUi.connected ? walletUi.fullAddress : t.optionalWallet}
            </p>
          </div>
          <button
            type="button"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setWalletOpen(false);
            }}
            onClick={() => {
              setWalletOpen(false);
              walletButtonRef.current?.focus({ preventScroll: true });
            }}
            className="velmere-command-pill velmere-interaction-pulse grid h-10 w-10 shrink-0 place-items-center px-0 text-white/[0.52]"
            aria-label={t.close ?? "Close wallet"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div
          className="velmere-wallet-dropdown-body relative max-h-[calc(100dvh-15rem)] overflow-visible overscroll-contain p-3"
          data-pass1986-wallet-nested-panel="unclipped-left-from-header"
        >
          <div data-pass1413-wallet-boundary="read-only-no-seed">
            <WalletConnectOptions compact otherPanelSide="left" />
          </div>
        </div>
      </DropdownRoot>

      <DropdownRoot
        id={accountMenuId}
        open={memberOpen}
        onClose={() => setMemberOpen(false)}
        anchorRef={memberButtonRef}
        ariaLabel={t.account}
        width={304}
        align="end"
        surfaceData={{
          surface: "member-menu",
          pass1734: "popup-visible-bounded",
          pass2002: "solid-no-blur-cyan-focus",
          pass2012: "flat-account-list-no-nested-card",
        }}
        className="w-[19rem] overflow-hidden border border-white/[0.085] bg-[#07090c] p-2 shadow-[0_22px_72px_rgba(0,0,0,0.66)]"
      >
        <div className="border-b border-white/[0.07] px-3 pb-3 pt-2">
          <p className="truncate text-sm font-semibold text-white/[0.86]">
            {isMemberActive ? memberDisplayName : t.account}
          </p>
          <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.12em] text-white/[0.38]">
            {isMemberActive
              ? walletUi.connected
                ? walletUi.fullAddress
                : t.noWalletConnected
              : t.privateConsole}
          </p>
        </div>
        <a
          href={isMemberActive ? localizedAccountHref : localizedLoginHref}
          className="velmere-command-pill velmere-interaction-pulse mt-2 flex w-full items-center justify-start gap-3 rounded-xl px-3 py-3 text-xs text-white/[0.70]"
          role="menuitem"
          onClick={() => setMemberOpen(false)}
        >
          <ShieldCheck className="h-4 w-4" />
          {isMemberActive ? t.memberConsole : t.login}
        </a>
        <button
          type="button"
          onClick={disconnectWallet}
          disabled={!walletUi.connected}
          className="velmere-command-pill velmere-interaction-pulse flex w-full items-center justify-start gap-3 rounded-xl px-3 py-3 text-left text-xs text-white/[0.60] disabled:cursor-not-allowed disabled:opacity-40"
          role="menuitem"
        >
          <Unplug className="h-4 w-4" />
          {walletUi.connected ? t.disconnect : t.noWalletConnected}
        </button>
        {isMemberActive ? (
          <button
            type="button"
            onClick={logoutMember}
            className="velmere-command-pill velmere-interaction-pulse flex w-full items-center justify-start gap-3 rounded-xl px-3 py-3 text-left text-xs text-white/[0.60]"
            role="menuitem"
          >
            <LogOut className="h-4 w-4" />
            {t.logout}
          </button>
        ) : null}
      </DropdownRoot>

      <DrawerRoot
        open={menuOpen}
        motionPreset="left"
        motionDuration={0.44}
        lockScroll={false}
        onClose={closeMenuPanel}
        closeLabel="Close menu"
        ariaLabel={t.menu}
        surfaceClassName="velmere-command-shell velmere-side-drawer-panel fixed bottom-0 left-0 top-0 flex w-[min(26rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-none text-velmere-ivory"
        surfaceId="velmere-main-menu-drawer"
        surfaceData={{ surface: "main-menu", pass1734: "exclusive-drawer", pass1999: "scroll-locked-fast-close-solid-surface", pass2002: "card-links-no-row-lines-low-lag", pass2011: "classic-list-instant-close-no-scroll-lock" }}
      >
        <div className="flex items-center justify-between border-b border-white/[0.10] px-6 py-5">
          <Link
            href="/"
            onClick={closeMenuPanel}
            className="font-sans text-2xl font-semibold uppercase tracking-[0.22em]"
          >
            VELMÈRE
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onPointerDown={(event) => { event.preventDefault(); setMenuOpen(false); }}
            onClick={() => setMenuOpen(false)}
            data-pass1999-menu-close="pointerdown-fast-no-lag"
            className="velmere-command-pill velmere-interaction-pulse inline-flex h-10 w-10 items-center justify-center px-0 text-white/[0.60]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          data-modal-scroll-region="true"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] touch-pan-y luxury-scrollbar"
        >
          <p className="velmere-label text-velmere-gold">
            {locale === "pl"
              ? "Odkrywaj"
              : locale === "de"
                ? "Entdecken"
                : "Explore"}
          </p>
          <nav className="mt-4 grid gap-6" aria-label="Menu navigation">
            {[
              {
                title:
                  locale === "pl" ? "SKLEP" : locale === "de" ? "SHOP" : "SHOP",
                links: [
                  localizedPrimaryLinks[0],
                  localizedPrimaryLinks[1],
                  localizedPrimaryLinks[2],
                  localizedPrimaryLinks[3],
                  { href: "/faq", label: labels.support },
                ],
              },
              {
                title:
                  locale === "pl"
                    ? "SPOŁECZNOŚĆ"
                    : locale === "de"
                      ? "COMMUNITY"
                      : "COMMUNITY",
                links: [
                  { href: "/square", label: labels.square },
                  { href: "/community", label: labels.community },
                ],
              },
              {
                title: "VLM / WEB3",
                links: [
                  { href: "/vlm-token", label: labels.vlm },
                  { href: "/market-integrity", label: labels.shield },
                  { href: "/security", label: labels.security },
                  { href: "/security/audits", label: labels.audits },
                  { href: "/research-lab", label: labels.research },
                  {
                    href: "/token-agreement",
                    label:
                      locale === "pl"
                        ? "Zasady tokena"
                        : locale === "de"
                          ? "Token-Regeln"
                          : "Token terms",
                  },
                ],
              },
              {
                title:
                  locale === "pl"
                    ? "KONTO"
                    : locale === "de"
                      ? "KONTO"
                      : "ACCOUNT",
                links: accountMenuLinks,
              },
            ].map((group) => (
              <div key={group.title}>
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/[0.35]">
                  {group.title}
                </p>
                <div className="mt-2 grid" data-pass2002-menu-links="cards-no-row-lines" data-pass2011-menu-links="classic-divider-list">
                  {group.links.map((link, linkIndex) => {
                    const stableLinkKey = `${group.title}:${link.href}:${link.label}:${linkIndex}`;
                    const isHardLocaleHref = link.href.startsWith(
                      `/${activeLocale}/`,
                    );
                    const className =
                      "border-b border-white/[0.07] px-1 py-3.5 text-sm font-semibold uppercase tracking-[0.16em] text-white/[0.68] transition-colors last:border-b-0 hover:text-cyan-50 focus-visible:outline-none focus-visible:text-cyan-50";

                    return isHardLocaleHref ? (
                      <a
                        key={stableLinkKey}
                        href={link.href}
                        onClick={closeMenuPanel}
                        className={className}
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        key={stableLinkKey}
                        href={link.href}
                        onClick={closeMenuPanel}
                        className={className}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-8 border-t border-white/[0.08] pt-6">
            <p className="velmere-label text-velmere-gold">
              {t.walletSafetyTitle}
            </p>
            <p className="mt-3 text-xs leading-6 text-white/[0.46]">
              {t.walletSafetyBody}
            </p>
          </div>

          <div className="mt-8">
            <p className="velmere-label text-velmere-gold">{t.legalTitle}</p>
            <div className="mt-4 grid gap-3">
              {legalLinks.map((link, linkIndex) => (
                <Link
                  key={`legal:${link.href}:${link.label}:${linkIndex}`}
                  href={link.href}
                  onClick={closeMenuPanel}
                  className="text-xs uppercase tracking-[0.16em] text-white/[0.44] transition hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <p className="velmere-label text-velmere-gold">{t.languageTitle}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {LOCALES.map((item) => (
                <Link
                  key={item}
                  href={pathname || "/"}
                  locale={item}
                  onClick={closeMenuPanel}
                  aria-current={locale === item ? "page" : undefined}
                  className={`inline-flex h-10 items-center rounded-full border px-4 text-[11px] uppercase tracking-[0.18em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/[0.30] ${locale === item ? "border-cyan-200/[0.26] text-cyan-100" : "border-white/[0.10] text-white/[0.48] hover:text-white"}`}
                >
                  {item.toUpperCase()}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </DrawerRoot>
    </>
  );
}
