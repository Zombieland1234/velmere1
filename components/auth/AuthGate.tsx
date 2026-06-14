"use client";

import { useEffect, useState, type ReactNode } from "react";
import { LockKeyhole, ShieldCheck, UserPlus, WalletCards } from "lucide-react";
import { useLocale } from "next-intl";
import { useWalletUiStore } from "@/store/useWalletUiStore";
import WalletConnectOptions from "@/components/wallet/WalletConnectOptions";

const AUTH_KEY = "velmere:account-session";
const AUTH_PROFILE_KEY = "velmere:account-profile";

export type VelmereLocalProfile = {
  displayName: string;
  email?: string;
};

type AuthGateProps = {
  children: ReactNode;
  title?: string;
  body?: string;
};

function readLocalSession() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(AUTH_KEY) === "active";
  } catch {
    return false;
  }
}

function readLocalProfile(): VelmereLocalProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(AUTH_PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<VelmereLocalProfile>;
    if (!parsed.displayName) return null;
    return {
      displayName: String(parsed.displayName),
      email: parsed.email ? String(parsed.email) : undefined,
    };
  } catch {
    return null;
  }
}

export function setVelmereLocalSession(active = true, profile?: VelmereLocalProfile) {
  if (typeof window === "undefined") return;
  try {
    if (active) {
      window.localStorage.setItem(AUTH_KEY, "active");
      if (profile?.displayName) {
        window.localStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(profile));
      }
    } else {
      window.localStorage.removeItem(AUTH_KEY);
      window.localStorage.removeItem(AUTH_PROFILE_KEY);
    }
    window.dispatchEvent(new Event("velmere:auth-changed"));
  } catch {}
}

export function useVelmereAuth() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [localProfile, setLocalProfile] = useState<VelmereLocalProfile | null>(null);
  const walletUi = useWalletUiStore();

  useEffect(() => {
    const sync = () => {
      const active = readLocalSession();
      setAuthenticated(active);
      setLocalProfile(active ? readLocalProfile() : null);
      setReady(true);
    };
    sync();
    window.addEventListener("velmere:auth-changed", sync);
    return () => window.removeEventListener("velmere:auth-changed", sync);
  }, [walletUi.connected]);

  return {
    ready,
    authenticated,
    walletConnected: Boolean(walletUi.connected),
    localProfile,
  };
}

export default function AuthGate({ children, title, body }: AuthGateProps) {
  const rawLocale = useLocale();
  const locale = (["en", "pl", "de"].includes(rawLocale) ? rawLocale : "pl") as "en" | "pl" | "de";
  const loginHref = `/${locale}/login`;
  const { ready, authenticated } = useVelmereAuth();
  const local = {
    en: {
      gate: "Private access",
      title: "Enter the private Velmère layer.",
      body: "Account access unlocks orders, addresses, Square publishing and optional wallet binding. Clothing checkout stays separate from the access layer.",
      signin: "Sign in / Register",
      preview: "Enter preview",
      safety: "Wallet safety",
      safetyBody:
        "Wallets are optional and read-only until a clear action is confirmed. Velmère never asks for seed phrases or private keys.",
    },
    pl: {
      gate: "Prywatny dostęp",
      title: "Wejdź do prywatnej warstwy Velmère.",
      body: "Konto odblokowuje zamówienia, adresy, publikowanie w Square i opcjonalne powiązanie portfela. Zakup odzieży pozostaje osobno od warstwy dostępu.",
      signin: "Zaloguj / Zarejestruj",
      preview: "Wejdź do podglądu",
      safety: "Bezpieczeństwo portfela",
      safetyBody:
        "Portfele są opcjonalne i read-only do czasu jasnego potwierdzenia akcji. Velmère nigdy nie prosi o seed phrase ani klucze prywatne.",
    },
    de: {
      gate: "Privater Zugang",
      title: "Betritt die private Velmère-Ebene.",
      body: "Ein Account entsperrt Bestellungen, Adressen, Square-Publishing und optionale Wallet-Bindung. Kleidung-Checkout bleibt von der Access-Ebene getrennt.",
      signin: "Login / Registrieren",
      preview: "Vorschau öffnen",
      safety: "Wallet-Sicherheit",
      safetyBody:
        "Wallets sind optional und read-only, bis eine klare Aktion bestätigt wird. Velmère fragt nie nach Seed Phrase oder Private Keys.",
    },
  }[locale] ?? {
    gate: "Private access",
    title: "Enter the private Velmère layer.",
    body: "Account access unlocks orders, addresses, Square publishing and optional wallet binding. Clothing checkout stays separate from the access layer.",
    signin: "Sign in / Register",
    preview: "Enter preview",
    safety: "Wallet safety",
    safetyBody:
      "Wallets are optional and read-only until a clear action is confirmed. Velmère never asks for seed phrases or private keys.",
  };

  if (!ready) {
    return (
      <main className="min-h-[80dvh] bg-velmere-black px-4 pt-32 text-velmere-ivory">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-white/[0.10] bg-[#111113] p-8 shadow-velmere-card">
          <div className="h-4 w-44 animate-pulse rounded-full bg-white/[0.08]" />
          <div className="mt-6 h-12 w-3/4 animate-pulse rounded-xl bg-white/[0.06]" />
          <div className="mt-4 h-4 w-full animate-pulse rounded-full bg-white/[0.06]" />
        </div>
      </main>
    );
  }

  if (authenticated) return <>{children}</>;

  return (
    <main className="velmere-public-page relative min-h-[100dvh] overflow-hidden bg-velmere-black text-velmere-ivory">
      <section className="luxury-section pt-28 md:pt-32">
        <div className="grid gap-6 pb-20 lg:grid-cols-[0.9fr_0.82fr] lg:items-stretch">
          <section className="velmere-editorial-hero velmere-surface-sheen rounded-[2rem] border border-white/[0.10] bg-[#0B0B0D] p-6 shadow-velmere-card md:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-velmere-gold/[0.25] bg-velmere-gold/[0.10] text-velmere-gold">
              <LockKeyhole className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="mt-8 velmere-label text-velmere-gold">{local.gate}</p>
            <h1 className="mt-5 max-w-2xl font-serif text-[clamp(2.8rem,5.8vw,5.4rem)] leading-[0.9] tracking-[-0.05em]">
              {title ?? local.title}
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-velmere-grey-soft">
              {body ?? local.body}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={loginHref} className="velmere-button-primary">
                <UserPlus className="h-4 w-4" /> {local.signin}
              </a>
              <button
                type="button"
                onClick={() => setVelmereLocalSession(true, { displayName: "Velmère Preview" })}
                className="velmere-button-secondary"
              >
                <ShieldCheck className="h-4 w-4" /> {local.preview}
              </button>
            </div>
          </section>

          <aside className="velmere-surface-sheen rounded-[2rem] border border-white/[0.10] bg-[#111113] p-6 shadow-velmere-card md:p-8">
            <div className="flex items-center gap-3">
              <WalletCards className="h-5 w-5 text-velmere-gold" />
              <p className="velmere-label text-velmere-gold">{local.safety}</p>
            </div>
            <p className="mt-5 text-sm leading-7 text-velmere-muted">
              {local.safetyBody}
            </p>
            <div className="mt-6">
              <WalletConnectOptions />
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
