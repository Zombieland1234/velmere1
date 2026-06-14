"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { getLocalizedString } from "@/lib/products/catalog";
import type { ProductImportDraft } from "@/lib/products/types";

type AiProductCopyButtonProps = {
  token: string;
  drafts: ProductImportDraft[];
};

export default function AiProductCopyButton({ token, drafts }: AiProductCopyButtonProps) {
  const t = useTranslations("Ai");
  const locale = useLocale() as "pl" | "en" | "de";
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const input = useMemo(
    () =>
      drafts
        .slice(0, 5)
        .map((draft) => ({
          title: getLocalizedString(draft.product.title, locale),
          description: getLocalizedString(draft.product.description, locale),
          shortDescription: getLocalizedString(draft.product.shortDescription, locale),
          provider: draft.product.provider,
          status: draft.product.status,
          warnings: draft.warnings,
        })),
    [drafts, locale],
  );

  const run = async () => {
    setStatus("loading");
    setError("");
    setResult("");
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          task: "import_cleanup",
          locale,
          input: JSON.stringify(input, null, 2),
        }),
      });
      const data = (await response.json()) as { text?: string; error?: string; detail?: string };
      if (!response.ok) throw new Error(data.error ?? data.detail ?? t("failed"));
      setResult(data.text ?? "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("failed"));
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className="rounded-lg border border-white/[0.10] bg-black/[0.25] p-4 text-sm leading-7 text-white/[0.58]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p>{t("adminBody")}</p>
        <button
          type="button"
          onClick={run}
          disabled={!token || drafts.length === 0 || status === "loading"}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-velmere-gold/[0.35] px-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-velmere-gold transition-colors hover:bg-velmere-gold hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
          {t("generate")}
        </button>
      </div>
      {error && <p className="mt-3 text-velmere-gold">{error}</p>}
      {result && (
        <textarea
          readOnly
          value={result}
          rows={8}
          className="mt-4 w-full rounded-lg border border-white/[0.10] bg-black/[0.35] p-4 text-sm leading-7 text-white outline-none"
        />
      )}
    </div>
  );
}
