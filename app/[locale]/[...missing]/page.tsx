import { notFound } from "next/navigation";
import LoginPage from "../login/page";

const LOGIN_ALIASES = new Set(["login", "sign-in", "signin", "logowanie"]);

export default async function MissingPage({
  params,
}: {
  params: Promise<{ locale: string; missing?: string[] }>;
}) {
  const resolvedParams = await params;
  const [firstSegment] = resolvedParams.missing ?? [];

  // Vercel/Next fallback safety: if a known auth path is ever routed here
  // because of a stale deployment, locale rewrite edge-case, or copied repo
  // mismatch, render the real login page instead of showing a false 404.
  if (firstSegment && LOGIN_ALIASES.has(firstSegment)) {
    return <LoginPage params={Promise.resolve({ locale: resolvedParams.locale })} />;
  }

  notFound();
}
