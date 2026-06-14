import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import AuthFormClient from "@/components/auth/AuthFormClient";
import LoginSecurityVisual from "@/components/auth/LoginSecurityVisual";
import { Link } from "@/navigation";
import { buildVelmereMetadata } from "@/lib/seo/metadata";

const loginCopy = {
  en: {
    returnHome: "Return home",
    email: "Email",
    password: "Password",
    signIn: "Sign in",
    privateAccount: "Private account",
    title: "Sign in.",
    body: "A quiet entrance to your account, orders and member spaces.",
    googlePreview: "Explore member preview",
    notLive: "Preview",
    emailAccess: "email access",
    createAccount: "Create account",
    alreadyHave: "Already have an account?",
    forgotPassword: "Forgot password?",
    previewNotice: "Explore the member area before choosing how you want to sign in.",
    minimumPassword: "Minimum 8 characters",
    emailError: "Enter a valid email address.",
    passwordError: "Password must contain at least 8 characters.",
    walletRequired: "A wallet is optional and can be connected later for selected VLM and Square features.",
    trustLine: "Quiet entry / visible trust",
    trustCards: [
      ["Account", "Your account remains separate from optional wallet actions."],
      ["Wallet", "Connect only when a Web3 feature needs it."],
      ["Support", "Account help and recovery remain clear and human."],
    ],
  },
  pl: {
    returnHome: "Wróć na stronę główną",
    email: "E-mail",
    password: "Hasło",
    signIn: "Zaloguj się",
    privateAccount: "Prywatne konto",
    title: "Zaloguj się.",
    body: "Spokojne wejście do konta, zamówień i stref członkowskich.",
    googlePreview: "Zobacz podgląd strefy member",
    notLive: "Podgląd",
    emailAccess: "dostęp e-mail",
    createAccount: "Utwórz konto",
    alreadyHave: "Masz już konto?",
    forgotPassword: "Nie pamiętasz hasła?",
    previewNotice: "Zobacz strefę member, zanim wybierzesz sposób logowania.",
    minimumPassword: "Minimum 8 znaków",
    emailError: "Wpisz poprawny adres e-mail.",
    passwordError: "Hasło musi mieć minimum 8 znaków.",
    walletRequired: "Portfel jest opcjonalny i możesz połączyć go później dla wybranych funkcji VLM i Square.",
    trustLine: "Spokojne wejście / widoczne zaufanie",
    trustCards: [
      ["Konto", "Konto pozostaje oddzielone od opcjonalnych działań portfela."],
      ["Portfel", "Połącz go tylko wtedy, gdy wymaga tego funkcja Web3."],
      ["Pomoc", "Odzyskiwanie konta i wsparcie pozostają jasne i ludzkie."],
    ],
  },
  de: {
    returnHome: "Zur Startseite",
    email: "E-Mail",
    password: "Passwort",
    signIn: "Einloggen",
    privateAccount: "Privates Konto",
    title: "Einloggen.",
    body: "Ein ruhiger Einstieg in Konto, Bestellungen und Member-Bereiche.",
    googlePreview: "Member-Bereich ansehen",
    notLive: "Vorschau",
    emailAccess: "E-Mail-Zugang",
    createAccount: "Konto erstellen",
    alreadyHave: "Schon ein Konto?",
    forgotPassword: "Passwort vergessen?",
    previewNotice: "Sieh dir den Member-Bereich an, bevor du eine Anmeldeart wählst.",
    minimumPassword: "Mindestens 8 Zeichen",
    emailError: "Gib eine gültige E-Mail-Adresse ein.",
    passwordError: "Das Passwort muss mindestens 8 Zeichen haben.",
    walletRequired: "Ein Wallet ist optional und kann später für ausgewählte VLM- und Square-Funktionen verbunden werden.",
    trustLine: "Ruhiger Einstieg / sichtbares Vertrauen",
    trustCards: [
      ["Konto", "Das Konto bleibt von optionalen Wallet-Aktionen getrennt."],
      ["Wallet", "Nur verbinden, wenn eine Web3-Funktion es benötigt."],
      ["Support", "Kontohilfe und Wiederherstellung bleiben klar und persönlich."],
    ],
  },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildVelmereMetadata({
    locale,
    path: "/login",
    title: "Login — Velmère",
    description: "Enter the private Velmère layer with account access and optional wallet binding.",
  });
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const copy = loginCopy[locale as keyof typeof loginCopy] ?? loginCopy.en;

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-velmere-black text-velmere-ivory">
      <section className="luxury-section pt-28 md:pt-32">
        <div className="grid gap-6 pb-20 lg:grid-cols-[0.82fr_0.92fr] lg:items-stretch">
          <section className="rounded-[2rem] border border-white/[0.10] bg-[#0B0B0D] p-6 shadow-velmere-card md:p-8">
            <Link href="/" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/[0.45] transition hover:text-velmere-gold">
              <ArrowLeft className="h-4 w-4" /> {copy.returnHome}
            </Link>
            <div className="mt-6">
              <LoginSecurityVisual />
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {copy.trustCards.map(([title, body]) => (
                <div key={title} className="rounded-2xl border border-white/[0.10] bg-white/[0.025] p-4">
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-velmere-gold">{title}</p>
                  <p className="mt-2 text-xs leading-6 text-white/[0.54]">{body}</p>
                </div>
              ))}
            </div>
          </section>

          <AuthFormClient labels={copy} />
        </div>
      </section>
    </main>
  );
}
