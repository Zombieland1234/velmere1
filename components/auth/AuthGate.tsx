"use client";


import { readJsonResponseBounded } from "@/lib/network/fetch-with-deadline";
import { purgeLegacyVelmereClientAuthCache, resolveVelmereClientAuthState, type VelmereClientProfile } from "@/lib/auth/client-auth-state";
import { assertBrowserRedirectUrl } from "@/lib/security/navigation-redirect-boundary";
import { useEffect, useState, type ReactNode } from "react";
import { LockKeyhole, ShieldCheck, UserPlus, WalletCards } from "lucide-react";
import { useLocale } from "next-intl";
import { useWalletUiStore } from "@/store/useWalletUiStore";
import WalletConnectOptions from "@/components/wallet/WalletConnectOptions";

export type VelmereLocalProfile = VelmereClientProfile;

type AuthGateProps = {
  children: ReactNode;
  title?: string;
  body?: string;
};

export function setVelmereLocalSession(_active = true, _profile?: VelmereLocalProfile) {
  if (typeof window === "undefined") return;
  try {
    purgeLegacyVelmereClientAuthCache(window.localStorage);
  } catch (ignoredError) { void ignoredError; }
  window.dispatchEvent(new Event("velmere:auth-changed"));
}

export class VelmereAuthConfirmationRequiredError extends Error {
  constructor() { super("email_confirmation_required"); this.name = "VelmereAuthConfirmationRequiredError"; }
}

type ServerAuthResponse = {
  authenticated?: boolean;
  refreshRequired?: boolean;
  confirmationRequired?: boolean;
  code?: string;
  session?: VelmereLocalProfile | null;
};

export async function createVelmereAccountSession(input: { email?: string; password?: string; mode?: "signin" | "create"; displayName?: string; provider?: "email" | "google_preview" | "preview"; locale?: "en" | "pl" | "de" }) {
  const response = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(input),
  });
  const payload = await readJsonResponseBounded<ServerAuthResponse>(response, 256 * 1024);
  if (payload.confirmationRequired || payload.code === "email_confirmation_required") throw new VelmereAuthConfirmationRequiredError();
  if (!response.ok) throw new Error("Unable to create Velmère account session");
  const session = payload.session;
  if (!session?.displayName) throw new Error("Invalid Velmère account session");
  const profile = { ...session, sessionSource: "server" } satisfies VelmereLocalProfile;
  setVelmereLocalSession(true, profile);
  return profile;
}


export async function startVelmereGoogleOAuth(locale: string) {
  const response = await fetch("/api/auth/oauth/google", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale, returnPath: `/${["en", "pl", "de"].includes(locale) ? locale : "en"}/account` }),
  });
  const payload = await readJsonResponseBounded<{ redirectUrl?: string }>(response, 128 * 1024);
  if (!response.ok || !payload.redirectUrl) throw new Error("google_oauth_start_failed");
  const redirectUrl = assertBrowserRedirectUrl(payload.redirectUrl, {
    profile: "supabase_oauth",
    browserOrigin: window.location.origin,
    supabaseOrigin: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
  window.location.assign(redirectUrl);
}

export async function requestVelmerePasswordRecovery(email: string, locale: string) {
  const response = await fetch("/api/auth/recovery", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, locale }),
  });
  const payload = await readJsonResponseBounded<{ requested?: boolean; message?: string }>(response, 128 * 1024);
  if (!response.ok || !payload.requested) throw new Error("password_recovery_request_failed");
  return payload.message ?? "If the account exists, a recovery email has been requested.";
}

export async function completeVelmerePasswordRecovery(password: string) {
  const response = await fetch("/api/auth/recovery", {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) throw new Error("password_recovery_update_failed");
  return syncVelmereAccountSession();
}

async function refreshVelmereAccountSessionInternal(announceChange: boolean) {
  const response = await fetch("/api/auth/session", {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok) return null;
  const payload = await readJsonResponseBounded<ServerAuthResponse>(response, 256 * 1024);
  if (!payload.authenticated || !payload.session?.displayName) return null;
  const profile = { ...payload.session, sessionSource: "server" } satisfies VelmereLocalProfile;
  if (announceChange) setVelmereLocalSession(true, profile);
  return profile;
}

export async function refreshVelmereAccountSession() {
  return refreshVelmereAccountSessionInternal(true);
}

let serverSessionSyncInFlight: Promise<VelmereLocalProfile | null> | null = null;

async function performVelmereAccountSessionSync() {
  let response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
  let payload = await readJsonResponseBounded<ServerAuthResponse>(response, 256 * 1024);
  if (response.ok && payload.refreshRequired) {
    await refreshVelmereAccountSessionInternal(false);
    response = await fetch("/api/auth/session", { cache: "no-store", credentials: "same-origin" });
    payload = await readJsonResponseBounded<ServerAuthResponse>(response, 256 * 1024);
  }
  if (response.ok && payload.authenticated && payload.session?.displayName) {
    return { ...payload.session, sessionSource: "server" } satisfies VelmereLocalProfile;
  }
  return null;
}

export function syncVelmereAccountSession() {
  if (serverSessionSyncInFlight) return serverSessionSyncInFlight;
  const request = performVelmereAccountSessionSync();
  serverSessionSyncInFlight = request;
  void request.finally(() => {
    if (serverSessionSyncInFlight === request) serverSessionSyncInFlight = null;
  });
  return request;
}

export async function deleteVelmereAccountSession() {
  try {
    await fetch("/api/auth/session", { method: "DELETE", credentials: "same-origin" });
  } finally {
    setVelmereLocalSession(false);
  }
}

export function useVelmereAuth() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [localProfile, setLocalProfile] = useState<VelmereLocalProfile | null>(null);
  const walletUi = useWalletUiStore();

  useEffect(() => {
    let cancelled = false;
    let syncing = false;
    const applyState = (state: ReturnType<typeof resolveVelmereClientAuthState>) => {
      if (cancelled) return;
      setAuthenticated(state.authenticated);
      setLocalProfile(state.profile);
    };
    const syncServer = async () => {
      if (syncing) return;
      syncing = true;
      try {
        const profile = await syncVelmereAccountSession();
        applyState(profile
          ? resolveVelmereClientAuthState({ status: "authenticated", profile })
          : resolveVelmereClientAuthState({ status: "unauthenticated" }));
      } catch {
        applyState(resolveVelmereClientAuthState({ status: "unavailable" }));
      } finally {
        syncing = false;
        if (!cancelled) setReady(true);
      }
    };
    void syncServer();
    const onAuthChanged = () => { void syncServer(); };
    const onVisibility = () => { if (document.visibilityState === "visible") void syncServer(); };
    const refreshTimer = window.setInterval(() => { void syncServer(); }, 10 * 60_000);
    window.addEventListener("velmere:auth-changed", onAuthChanged);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
      window.removeEventListener("velmere:auth-changed", onAuthChanged);
      document.removeEventListener("visibilitychange", onVisibility);
    };
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
  const startPreview = async () => {
    try {
      await createVelmereAccountSession({ provider: "preview", displayName: "Velmère Preview" });
    } catch {
      setVelmereLocalSession(false);
    }
  };
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
                onClick={() => { void startPreview(); }}
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
