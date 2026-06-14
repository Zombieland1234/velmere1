"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, LogIn, ShieldCheck, Sparkles, UserPlus } from "lucide-react";
import Image from "next/image";
import { Link } from "@/navigation";
import { useLocale } from "next-intl";
import { setVelmereLocalSession } from "@/components/auth/AuthGate";
import { useWalletConnect } from "@/lib/wallet/useWalletConnect";
import { useWalletUiStore } from "@/store/useWalletUiStore";

type AuthFormClientProps = {
  labels?: {
    email?: string;
    password?: string;
    signIn?: string;
    privateAccount?: string;
    title?: string;
    body?: string;
    googlePreview?: string;
    notLive?: string;
    emailAccess?: string;
    createAccount?: string;
    alreadyHave?: string;
    forgotPassword?: string;
    returnHome?: string;
    previewNotice?: string;
    minimumPassword?: string;
    emailError?: string;
    passwordError?: string;
    walletRequired?: string;
    trustLine?: string;
    trustCards?: readonly (readonly [string, string])[];
  };
};

const localCopy = {
  pl: {
    signInTab: "Logowanie",
    createTab: "Nowe konto",
    previewBody: "Zobacz prywatną warstwę bez łączenia portfela.",
    optionalWallet: "Portfel opcjonalny",
    walletBody: "Połącz go tylko wtedy, gdy chcesz korzystać z funkcji Web3.",
    showPassword: "Pokaż hasło",
    hidePassword: "Ukryj hasło",
    resetMessage: "Odzyskiwanie hasła będzie prowadzone bezpieczną wiadomością e-mail. Na tym etapie skontaktuj się z obsługą Velmère.",
    privacy: "Nigdy nie prosimy o seed phrase ani klucz prywatny.",
  },
  de: {
    signInTab: "Anmelden",
    createTab: "Neues Konto",
    previewBody: "Entdecke den privaten Bereich, ohne ein Wallet zu verbinden.",
    optionalWallet: "Wallet optional",
    walletBody: "Verbinde es nur, wenn du Web3-Funktionen nutzen möchtest.",
    showPassword: "Passwort anzeigen",
    hidePassword: "Passwort ausblenden",
    resetMessage: "Die Passwort-Wiederherstellung erfolgt über eine sichere E-Mail. Kontaktiere in dieser Vorschau den Velmère Support.",
    privacy: "Wir fragen niemals nach Seed Phrase oder Private Key.",
  },
  en: {
    signInTab: "Sign in",
    createTab: "New account",
    previewBody: "Explore the private layer without connecting a wallet.",
    optionalWallet: "Wallet optional",
    walletBody: "Connect only when you want to use Web3 features.",
    showPassword: "Show password",
    hidePassword: "Hide password",
    resetMessage: "Password recovery will use a secure email. During this preview, contact Velmère support for account help.",
    privacy: "We never ask for a seed phrase or private key.",
  },
} as const;

function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-2xl border border-velmere-danger/[0.24] bg-velmere-danger/[0.08] px-4 py-3 text-xs leading-6 text-red-100/[0.88]">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-300" aria-hidden="true" />
      {children}
    </p>
  );
}

function displayNameFromEmail(email: string) {
  const localPart = email.split("@")[0]?.trim();
  if (!localPart) return "Velmère Member";
  return localPart
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .slice(0, 32) || "Velmère Member";
}

function WalletButton({ icon, title, body, onClick, disabled }: { icon: string; title: string; body: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="velmere-wallet-choice group flex min-h-[4.75rem] items-center gap-3.5 rounded-[1.25rem] border border-white/[0.08] bg-[#080b0f] px-3.5 text-left transition-all duration-150 hover:-translate-y-px hover:border-cyan-200/[0.22] hover:bg-cyan-300/[0.035] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0" data-pass2005-auth-wallet-choice="solid-cyan-low-lag"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.035] transition duration-150 group-hover:border-cyan-200/[0.20]">
        <Image src={icon} alt="" width={23} height={23} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-white/[0.82]">{title}</span>
        <span className="mt-1 block truncate text-xs text-white/[0.38]">{body}</span>
      </span>
    </button>
  );
}

export default function AuthFormClient({ labels }: AuthFormClientProps) {
  const locale = useLocale() as keyof typeof localCopy;
  const local = localCopy[locale] ?? localCopy.en;
  const accountHref = `/${locale || "pl"}/account`;
  const goToAccount = () => { window.location.assign(accountHref); };
  const wallet = useWalletConnect();
  const walletUi = useWalletUiStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "create">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const emailLabel = labels?.email ?? "Email";
  const passwordLabel = labels?.password ?? "Password";

  const validate = () => {
    if (!email.includes("@") || email.length < 6) return labels?.emailError ?? "Enter a valid email address.";
    if (password.length < 8) return labels?.passwordError ?? "Password must contain at least 8 characters.";
    return null;
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    window.setTimeout(() => {
      setVelmereLocalSession(true, {
        displayName: displayNameFromEmail(email),
        email,
      });
      setLoading(false);
      goToAccount();
    }, 420);
  };

  const continueAsPreview = () => {
    setLoading(true);
    window.setTimeout(() => {
      setVelmereLocalSession(true, { displayName: "Velmère Preview" });
      setLoading(false);
      goToAccount();
    }, 320);
  };

  return (
    <section className="velmere-command-shell relative overflow-hidden rounded-[2rem] border-white/[0.08] bg-[#07090c] p-5 shadow-[0_30px_110px_rgba(0,0,0,0.35)] md:p-8" data-pass2005-auth-form="solid-cyan-focus-no-heavy-blur">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-300/[0.04] blur-2xl" aria-hidden="true" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="velmere-label text-cyan-100/[0.78]">{labels?.privateAccount ?? "Private account"}</p>
            <h2 className="mt-4 font-serif text-[clamp(2.25rem,6vw,4rem)] leading-[0.92] tracking-[-0.045em]">
              {labels?.title ?? "Sign in."}
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-velmere-muted">
              {labels?.body ?? "Account first. Wallet optional. No seed phrases."}
            </p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-200/[0.16] bg-cyan-300/[0.055] text-cyan-100">
            <LockKeyhole className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
          </span>
        </div>

        <div
          className="velmere-segmented-control mt-7 grid grid-cols-2 rounded-full border border-white/[0.08] bg-black/[0.20] p-1"
          role="tablist"
          aria-label={labels?.privateAccount ?? "Account access"}
          onKeyDown={(event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            const nextMode = mode === "signin" ? "create" : "signin";
            setMode(nextMode);
            setError(null);
            window.requestAnimationFrame(() => document.getElementById(`auth-tab-${nextMode}`)?.focus());
          }}
        >
          <button
            type="button"
            id="auth-tab-signin"
            role="tab"
            aria-selected={mode === "signin"}
            aria-controls="auth-access-panel"
            tabIndex={mode === "signin" ? 0 : -1}
            onClick={() => { setMode("signin"); setError(null); }}
            className={`velmere-segmented-control__item min-h-11 rounded-full px-4 text-xs font-semibold transition-all duration-150 ${mode === "signin" ? "bg-white text-black shadow-[0_10px_35px_rgba(0,0,0,0.28)]" : "text-white/[0.44] hover:text-white"}`}
          >
            {local.signInTab}
          </button>
          <button
            type="button"
            id="auth-tab-create"
            role="tab"
            aria-selected={mode === "create"}
            aria-controls="auth-access-panel"
            tabIndex={mode === "create" ? 0 : -1}
            onClick={() => { setMode("create"); setError(null); }}
            className={`velmere-segmented-control__item min-h-11 rounded-full px-4 text-xs font-semibold transition-all duration-150 ${mode === "create" ? "bg-white text-black shadow-[0_10px_35px_rgba(0,0,0,0.28)]" : "text-white/[0.44] hover:text-white"}`}
          >
            {local.createTab}
          </button>
        </div>

        <form
          id="auth-access-panel"
          role="tabpanel"
          aria-labelledby={`auth-tab-${mode}`}
          onSubmit={submit}
          noValidate
          className="mt-6 space-y-4"
        >
          <label className="block">
            <span className="velmere-label text-white/[0.42]">{emailLabel}</span>
            <input
              value={email}
              onChange={(event) => { setEmail(event.target.value); setError(null); }}
              type="email"
              autoComplete="email"
              placeholder="member@velmere.com"
              className="velmere-field mt-2.5"
            />
          </label>

          <label className="block">
            <span className="velmere-label text-white/[0.42]">{passwordLabel}</span>
            <span className="relative mt-2.5 block">
              <input
                value={password}
                onChange={(event) => { setPassword(event.target.value); setError(null); }}
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "create" ? "new-password" : "current-password"}
                placeholder={labels?.minimumPassword ?? "Minimum 8 characters"}
                className="velmere-field pr-14"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-white/[0.34] transition hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/[0.32]"
                aria-label={showPassword ? local.hidePassword : local.showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </span>
          </label>

          <FieldError>{error ?? undefined}</FieldError>

          <button type="submit" disabled={loading} className="velmere-button-primary w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : mode === "create" ? <UserPlus className="h-4 w-4" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
            {mode === "create" ? labels?.createAccount ?? "Create account" : labels?.signIn ?? "Sign in"}
          </button>
        </form>

        <div className="mt-4 flex justify-end">
          <button type="button" onClick={() => setError(local.resetMessage)} className="text-xs text-white/[0.38] transition hover:text-cyan-100">
            {labels?.forgotPassword ?? "Forgot password?"}
          </button>
        </div>

        <div className="my-6 flex items-center gap-3 text-[9px] uppercase tracking-[0.18em] text-white/[0.24]">
          <span className="h-px flex-1 bg-white/[0.08]" />
          {labels?.googlePreview ?? "Member preview"}
          <span className="h-px flex-1 bg-white/[0.08]" />
        </div>

        <button
          type="button"
          onClick={continueAsPreview}
          disabled={loading}
          className="group flex min-h-[4.75rem] w-full items-center justify-between gap-4 rounded-[1.35rem] border border-white/[0.08] bg-white/[0.025] px-4 text-left transition-all duration-150 hover:border-cyan-200/[0.22] hover:bg-cyan-300/[0.035] disabled:opacity-50"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-200/[0.16] bg-cyan-300/[0.055] text-cyan-100">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-white/[0.78]">{labels?.googlePreview ?? "Explore member preview"}</span>
              <span className="mt-1 block truncate text-xs text-white/[0.36]">{local.previewBody}</span>
            </span>
          </span>
          <span className="rounded-full border border-white/[0.08] px-2.5 py-1 font-mono text-[8px] uppercase tracking-[0.12em] text-white/[0.30] group-hover:border-velmere-gold/[0.18] group-hover:text-cyan-100">
            {labels?.notLive ?? "Preview"}
          </span>
        </button>

        {mode === "create" ? (
          <div className="mt-6 rounded-[1.5rem] border border-white/[0.07] bg-[#080b0f] p-4" data-pass2005-auth-wallet-panel="solid-no-blur">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-100" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-white/[0.72]">{local.optionalWallet}</p>
                <p className="mt-1 text-xs leading-6 text-white/[0.38]">{local.walletBody}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <WalletButton
                icon="/wallets/metamask.svg"
                title="MetaMask"
                body={walletUi.connected && walletUi.chainType === "evm" ? walletUi.shortAddress : "EVM"}
                disabled={walletUi.connected && walletUi.chainType === "solana"}
                onClick={() => void wallet.connectMetaMask()}
              />
              <WalletButton
                icon="/wallets/phantom.svg"
                title="Phantom"
                body={walletUi.connected && walletUi.chainType === "solana" ? walletUi.shortAddress : "Solana"}
                disabled={walletUi.connected && walletUi.chainType === "evm"}
                onClick={() => void wallet.connectPhantom()}
              />
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-5 text-xs text-white/[0.36]">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-100" aria-hidden="true" />
            {local.privacy}
          </span>
          <Link href="/" className="transition hover:text-cyan-100">{labels?.returnHome ?? "Return home"}</Link>
        </div>
      </div>
    </section>
  );
}
