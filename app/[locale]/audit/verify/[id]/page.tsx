import type { Metadata } from "next";
import { notFound } from "next/navigation";
import fs from "fs";
import path from "path";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, CheckCircle2, XCircle, FileText, Database, GitCommit, Layers, Lock, Cpu, ExternalLink } from "lucide-react";
import { setRequestLocale } from "next-intl/server";
import { SUPPORTED_LOCALES } from "@/lib/seo/metadata";
import { computeMerkleRoot } from "@/lib/security/evidence-vault/merkle-tree";

export const dynamic = "force-dynamic";

interface VerifyPageProps {
  params: Promise<{ locale: string; id: string }>;
}

type VerificationManifest = {
  symbol?: string;
  name?: string;
  chain?: string;
  target?: { network?: string; addressOrId?: string };
  contractAddress?: string;
  blockNumber?: number | string;
  commitHash?: string;
  sourceHash?: string;
  evidenceRoot?: string;
  reportSha256?: string;
  engineVersion?: string;
  createdAt?: string;
  leafHashes?: string[];
};

export async function generateMetadata({ params }: VerifyPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Kryptograficzna Weryfikacja Audytu: ${id} — Velmère`,
    description: `Niezależna weryfikacja integralności raportu, korzenia Merkle Tree i łańcucha dowodowego dla identyfikatora ${id}.`,
  };
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export default async function AuditVerifyPage({ params }: VerifyPageProps) {
  const { locale, id } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])) notFound();
  setRequestLocale(locale);

  const auditId = decodeURIComponent(id);
  const manifestPath = path.resolve(process.cwd(), "evidence", auditId, "manifest", "manifest.json");
  let manifest: VerificationManifest | null = null;
  let manifestError: "MISSING" | "INVALID" | null = null;
  let recomputedRoot = "";

  if (!fs.existsSync(manifestPath)) {
    manifestError = "MISSING";
  } else {
    try {
      const parsed = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as VerificationManifest;
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.leafHashes) || !text(parsed.evidenceRoot)) {
        manifestError = "INVALID";
      } else {
        manifest = parsed;
        recomputedRoot = computeMerkleRoot(parsed.leafHashes);
      }
    } catch {
      manifestError = "INVALID";
    }
  }

  const evidenceRoot = text(manifest?.evidenceRoot);
  const isMerkleValid = Boolean(manifest && evidenceRoot && recomputedRoot && recomputedRoot === evidenceRoot);
  const verificationState = !manifest ? "UNAVAILABLE" : isMerkleValid ? "VERIFIED" : "MISMATCH";
  const verified = verificationState === "VERIFIED";

  const symbol = text(manifest?.symbol) ?? auditId;
  const name = text(manifest?.name) ?? `Rekord audytu ${auditId}`;
  const chain = text(manifest?.chain) ?? text(manifest?.target?.network);
  const target = text(manifest?.contractAddress) ?? text(manifest?.target?.addressOrId);
  const blockNumber = manifest?.blockNumber ?? null;
  const commitHash = text(manifest?.commitHash);
  const sourceHash = text(manifest?.sourceHash);
  const reportSha256 = text(manifest?.reportSha256);
  const engineVersion = text(manifest?.engineVersion);
  const createdAt = text(manifest?.createdAt);

  const stateClasses = verified
    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
    : verificationState === "MISMATCH"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
      : "border-amber-500/30 bg-amber-500/10 text-amber-300";
  const stateLabel = verified
    ? "STATUS: INTEGRITY VERIFIED (PASS)"
    : verificationState === "MISMATCH"
      ? "STATUS: INTEGRITY MISMATCH (FAIL)"
      : "STATUS: VERIFICATION UNAVAILABLE";

  return (
    <main className="min-h-screen bg-[#07090e] px-4 py-16 text-white sm:px-8 md:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 flex items-center justify-between gap-4">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-mono text-white/70 transition hover:bg-white/10 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            Powrót do strony głównej
          </Link>
          <div className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-mono font-medium ${stateClasses}`} data-verification-state={verificationState}>
            {verified ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {stateLabel}
          </div>
        </div>

        {!manifest ? (
          <section className="rounded-3xl border border-amber-500/30 bg-amber-500/[0.06] p-8 md:p-12" data-audit-verification="WITHHELD">
            <div className="inline-flex items-center gap-2 rounded-lg bg-amber-400/10 px-3 py-1 font-mono text-xs uppercase tracking-widest text-amber-300">
              <ShieldCheck className="h-4 w-4" />
              Weryfikacja wstrzymana
            </div>
            <h1 className="mt-5 font-serif text-3xl font-light md:text-5xl">Brak wiarygodnego manifestu dowodowego</h1>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/65">
              Nie można potwierdzić integralności audytu <span className="font-mono text-amber-200">{auditId}</span>. {manifestError === "MISSING" ? "Manifest nie istnieje dla tego identyfikatora." : "Manifest istnieje, ale jest niepoprawny lub nie zawiera wymaganych danych."} Velmère nie podstawia przykładowych adresów, bloków, commitów ani hashy i nie przyznaje statusu PASS bez rzeczywistego rekordu dowodowego.
            </p>
            <p className="mt-5 rounded-xl border border-white/10 bg-black/30 p-4 font-mono text-xs text-white/50">
              Truth boundary: UNAVAILABLE oznacza brak dowodu, a nie potwierdzenie integralności.
            </p>
          </section>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-8 shadow-2xl backdrop-blur-xl md:p-12" data-audit-verification={verificationState}>
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-lg bg-amber-400/10 px-3 py-1 font-mono text-xs uppercase tracking-widest text-amber-400">
                  <ShieldCheck className="h-4 w-4" /> Dedykowana Weryfikacja Dowodowa
                </div>
                <h1 className="mt-4 font-serif text-3xl font-light tracking-tight md:text-5xl">{name} <span className="font-mono text-2xl text-white/40">({symbol})</span></h1>
                <p className="mt-2 font-mono text-sm text-white/60">Identyfikator Audytu: <span className="text-amber-200">{auditId}</span></p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-right">
                <span className="text-[11px] font-mono uppercase tracking-wider text-white/50">Pieczęć Integralności</span>
                <p className={`font-mono text-xs font-semibold ${verified ? "text-emerald-400" : "text-rose-400"}`}>SHA-256 / MERKLE VERIFICATION</p>
                <p className="mt-1 text-[10px] font-mono text-white/40">[LOCAL DETERMINISTIC RECOMPUTATION]</p>
              </div>
            </div>

            <hr className="my-8 border-white/10" />
            <h2 className="mb-6 font-mono text-xs uppercase tracking-widest text-white/50">Rejestr Kryteriów Weryfikacyjnych</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Item icon={<FileText className="h-5 w-5 text-amber-400" />} title="1. Report Hash" value={reportSha256} />
              <Item icon={<Database className="h-5 w-5 text-amber-400" />} title="2. Evidence Root" value={evidenceRoot} note={isMerkleValid ? "MERKLE ROOT: EXACT MATCH" : `MERKLE ROOT: MISMATCH · recomputed ${recomputedRoot || "N/A"}`} good={isMerkleValid} />
              <Item icon={<Lock className="h-5 w-5 text-amber-400" />} title="3. Target Contract / Asset" value={target} note="Canonical network address / regulated-market identifier" />
              <Item icon={<Layers className="h-5 w-5 text-amber-400" />} title="4. Chain / Settlement Network" value={chain} />
              <Item icon={<Cpu className="h-5 w-5 text-amber-400" />} title="5. Settlement Block" value={blockNumber == null ? null : `Block #${blockNumber}`} />
              <Item icon={<FileText className="h-5 w-5 text-amber-400" />} title="6. Source Hash" value={sourceHash} />
              <Item icon={<GitCommit className="h-5 w-5 text-amber-400" />} title="7. Repository Commit" value={commitHash} />
              <Item icon={<Cpu className="h-5 w-5 text-amber-400" />} title="8. Engine Version" value={engineVersion ? `Velmère Furnace ${engineVersion}` : null} />
            </div>

            <div className={`mt-6 rounded-2xl border p-6 ${verified ? "border-emerald-500/30 bg-emerald-500/[0.06]" : "border-rose-500/30 bg-rose-500/[0.06]"}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <span className={`font-mono text-xs uppercase tracking-wider ${verified ? "text-emerald-400" : "text-rose-400"}`}>9. Status Końcowy</span>
                  <h3 className="mt-1 font-serif text-xl font-medium">{verified ? "AUTOMATED ASSESSMENT: INTEGRITY VERIFIED" : "AUTOMATED ASSESSMENT: INTEGRITY MISMATCH"}</h3>
                  <p className="mt-1 text-xs text-white/60">Data rekordu: {createdAt ? new Date(createdAt).toLocaleString("pl-PL") : "nie podano"}. Status dotyczy wyłącznie integralności dostarczonego manifestu.</p>
                </div>
                <a href={`/api/audit/verify/${encodeURIComponent(auditId)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 font-mono text-xs font-semibold transition hover:bg-white/20">
                  Surowe API JSON <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-xs leading-relaxed text-white/40">
          <p className="mb-2 font-mono uppercase tracking-wider text-white/60">Zastrzeżenie integralności</p>
          Weryfikacja kryptograficzna może potwierdzić spójność dostarczonego rekordu i drzewa Merkle, ale nie dowodzi kompletności źródeł, poprawności danych zewnętrznych ani braku podatności. Brak manifestu, brak wymaganych pól lub niezgodność korzenia zawsze blokuje status VERIFIED.
        </div>
      </div>
    </main>
  );
}

function Item({ icon, title, value, note, good }: { icon: React.ReactNode; title: string; value: string | null; note?: string; good?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-3">{icon}<span className="font-mono text-xs uppercase text-white/60">{title}</span></div>
      <p className={`mt-3 break-all rounded-xl border border-white/5 bg-black/40 p-2.5 font-mono text-xs ${value ? "text-white/90" : "text-amber-300"}`}>{value ?? "WITHHELD / NOT PROVIDED"}</p>
      {note ? <span className={`mt-2 inline-block text-[10px] font-mono ${good === true ? "text-emerald-400/80" : good === false ? "text-rose-400/80" : "text-white/40"}`}>{note}</span> : null}
    </div>
  );
}
