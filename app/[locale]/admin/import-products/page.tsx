"use client";

import Image from "next/image";
import { ChangeEvent, use, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, FileUp, LinkIcon, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import AiProductCopyButton from "@/components/admin/AiProductCopyButton";
import ProductLaunchChecklist from "@/components/admin/ProductLaunchChecklist";
import ProductionReadinessChecklist from "@/components/admin/ProductionReadinessChecklist";
import CommerceLaunchControl from "@/components/launch/CommerceLaunchControl";
import ProviderTruthLedgerPanel from "@/components/launch/ProviderTruthLedgerPanel";
import OrderEventLedgerPanel from "@/components/launch/OrderEventLedgerPanel";
import AdminRouteGatePanel from "@/components/launch/AdminRouteGatePanel";
import AdminToolsLockedPanel from "@/components/launch/AdminToolsLockedPanel";
import SecretRedactionPolicyPanel from "@/components/launch/SecretRedactionPolicyPanel";
import PublishPermissionGatePanel from "@/components/launch/PublishPermissionGatePanel";
import AdminServerAuthContractPanel from "@/components/launch/AdminServerAuthContractPanel";
import AdminMutationAuditPanel from "@/components/launch/AdminMutationAuditPanel";
import SupportSafeTimelinePanel from "@/components/launch/SupportSafeTimelinePanel";
import PublishRollbackContextPanel from "@/components/launch/PublishRollbackContextPanel";
import AdminAuditPersistencePanel from "@/components/launch/AdminAuditPersistencePanel";
import CustomerSafeExportBoundaryPanel from "@/components/launch/CustomerSafeExportBoundaryPanel";
import AdminAuditWriteApiPanel from "@/components/launch/AdminAuditWriteApiPanel";
import AdminIdempotencyStorePanel from "@/components/launch/AdminIdempotencyStorePanel";
import AdminAuthSessionGuardPanel from "@/components/launch/AdminAuthSessionGuardPanel";
import OperatorLaunchGateMatrixPanel from "@/components/launch/OperatorLaunchGateMatrixPanel";
import LuxurySection from "@/components/layout/LuxurySection";
import type { ProductImportDraft } from "@/lib/products/types";
import { formatMoney, getLocalizedString } from "@/lib/products/catalog";
import { getClientAdminEnvironmentGate } from "@/lib/launch/admin-environment-gate";

type Tab = "links" | "printful" | "csv";

const TABS: Array<{ id: Tab; icon: typeof LinkIcon }> = [
  { id: "links", icon: LinkIcon },
  { id: "printful", icon: RefreshCw },
  { id: "csv", icon: FileUp },
];


function adminGateCopy(locale: string) {
  if (locale === "pl") {
    return {
      title: "Admin import jest narzędziem prywatnym.",
      body: "Przed publicznym startem ta trasa musi mieć auth, environment gate, audit log i jasny limit publikacji. Nie może wyglądać jak funkcja dla klienta.",
    };
  }
  if (locale === "de") {
    return {
      title: "Admin Import ist ein privates Werkzeug.",
      body: "Vor dem öffentlichen Start braucht diese Route Auth, Environment Gate, Audit Log und klare Publish-Limits. Sie darf nicht wie eine Kundenfunktion wirken.",
    };
  }
  return {
    title: "Admin import is a private tool.",
    body: "Before public launch this route needs auth, environment gate, audit log and clear publish limits. It must not look like a customer feature.",
  };
}

export default function AdminImportProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const t = useTranslations("AdminImport");
  const adminGate = adminGateCopy(locale);
  const adminEnvironmentGate = getClientAdminEnvironmentGate();
  const [token, setToken] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("links");
  const [urls, setUrls] = useState("");
  const [csv, setCsv] = useState("");
  const [drafts, setDrafts] = useState<ProductImportDraft[]>([]);
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "publishing">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const isBusy = status !== "idle";

  const selectedDrafts = useMemo(
    () => drafts.filter((draft) => selectedDraftIds.includes(draft.draftId)),
    [drafts, selectedDraftIds],
  );
  const hasSelectedDraftErrors = selectedDrafts.some((draft) => draft.validationErrors.length > 0);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const runImport = async () => {
    setStatus("loading");
    setMessage(null);
    try {
      const endpoint =
        activeTab === "printful"
          ? "/api/admin/sync-printful"
          : "/api/admin/import-products";
      const body =
        activeTab === "links"
          ? { method: "links", urls }
          : activeTab === "csv"
            ? { method: "csv", csv }
            : {};

      const response = await fetch(endpoint, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? t("importFailed"));
      setDrafts(data.drafts ?? []);
      setSelectedDraftIds((data.drafts ?? []).map((draft: ProductImportDraft) => draft.draftId));
      setMessage(data.persisted ? t("persisted") : t("previewOnly"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("importFailed"));
    } finally {
      setStatus("idle");
    }
  };

  const publish = async (targetStatus: "coming_soon" | "active") => {
    setStatus("publishing");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/products/publish", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ drafts: selectedDrafts, status: targetStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? t("publishFailed"));
      setMessage(data.message ?? t("publishValidated"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("publishFailed"));
    } finally {
      setStatus("idle");
    }
  };

  const handleCsv = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    setCsv(await file.text());
  };

  if (!adminEnvironmentGate.isUnlocked) {
    return (
      <main className="min-h-[100dvh] bg-velmere-black text-white">
        <LuxurySection className="py-28 md:py-36">
          <AdminToolsLockedPanel locale={locale} gate={adminEnvironmentGate} />
        </LuxurySection>
        <CommerceLaunchControl locale={locale} surface="admin" />
        <ProviderTruthLedgerPanel locale={locale} surface="admin" />
        <OrderEventLedgerPanel locale={locale} surface="admin" />
        <AdminRouteGatePanel locale={locale} surface="admin" />
        <OperatorLaunchGateMatrixPanel locale={locale} surface="admin" />
        <AdminServerAuthContractPanel locale={locale} surface="admin" />
        <PublishPermissionGatePanel locale={locale} surface="admin" />
        <SecretRedactionPolicyPanel locale={locale} surface="admin" />
        <AdminMutationAuditPanel locale={locale} surface="admin" />
        <AdminAuditPersistencePanel locale={locale} surface="admin" />
        <AdminAuthSessionGuardPanel locale={locale} surface="admin" />
        <AdminAuditWriteApiPanel locale={locale} surface="admin" />
        <AdminIdempotencyStorePanel locale={locale} surface="admin" />
        <PublishRollbackContextPanel locale={locale} surface="admin" />
        <SupportSafeTimelinePanel locale={locale} surface="admin" />
        <CustomerSafeExportBoundaryPanel locale={locale} surface="admin" />
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-velmere-black text-white">
      <LuxurySection className="py-28 md:py-36">
        <section className="mb-8 rounded-[1.5rem] border border-red-400/[0.18] bg-red-500/[0.045] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-red-100/[0.72]">admin gate / launch control</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{adminGate.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/[0.58]">{adminGate.body}</p>
        </section>
        <div className="mb-10 max-w-4xl">
          <p className="luxury-kicker text-velmere-gold/[0.80]">{t("kicker")}</p>
          <h1 className="mt-6 font-serif text-5xl leading-tight text-white md:text-7xl">{t("title")}</h1>
          <p className="mt-6 max-w-3xl text-sm leading-8 text-white/[0.62]">{t("intro")}</p>
        </div>

        <section className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          <aside className="rounded-lg border border-white/[0.10] bg-white/[0.035] p-5">
            <label htmlFor="admin-token" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/[0.58]">
              {t("token")}
            </label>
            <input
              id="admin-token"
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className="mt-3 h-12 w-full rounded-lg border border-white/[0.10] bg-black/[0.35] px-4 text-sm text-white outline-none focus:border-velmere-gold"
            />

            <div className="mt-6 grid gap-2">
              {TABS.map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`flex min-h-12 items-center justify-between rounded-lg border px-4 text-left text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                    activeTab === id
                      ? "border-velmere-gold bg-velmere-gold text-black"
                      : "border-white/[0.10] text-white/[0.58] hover:border-white/[0.25] hover:text-white"
                  }`}
                >
                  {t(`tabs.${id}`)}
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-lg border border-white/[0.10] bg-white/[0.035] p-5 md:p-6">
            {activeTab === "links" && (
              <div>
                <label htmlFor="product-links" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/[0.58]">
                  {t("linksLabel")}
                </label>
                <textarea
                  id="product-links"
                  value={urls}
                  onChange={(event) => setUrls(event.target.value)}
                  rows={8}
                  placeholder={t("linksPlaceholder")}
                  className="mt-3 w-full rounded-lg border border-white/[0.10] bg-black/[0.35] p-4 text-sm leading-7 text-white outline-none placeholder:text-white/[0.28] focus:border-velmere-gold"
                />
                <div className="mt-4 rounded-lg border border-white/[0.10] bg-black/[0.25] p-4 text-sm leading-7 text-white/[0.58]">
                  {t("tapstitchBody")}
                </div>
              </div>
            )}

            {activeTab === "printful" && (
              <div className="rounded-lg border border-white/[0.10] bg-black/[0.25] p-5 text-sm leading-7 text-white/[0.62]">
                {t("printfulBody")}
              </div>
            )}

            {activeTab === "csv" && (
              <div>
                <label htmlFor="csv-upload" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/[0.58]">
                  {t("csvLabel")}
                </label>
                <input
                  id="csv-upload"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsv}
                  className="mt-3 block w-full rounded-lg border border-white/[0.10] bg-black/[0.35] p-4 text-sm text-white/[0.62]"
                />
                <textarea
                  value={csv}
                  onChange={(event) => setCsv(event.target.value)}
                  rows={8}
                  placeholder={t("csvPlaceholder")}
                  className="mt-4 w-full rounded-lg border border-white/[0.10] bg-black/[0.35] p-4 text-sm leading-7 text-white outline-none placeholder:text-white/[0.28] focus:border-velmere-gold"
                />
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={runImport}
                disabled={!adminEnvironmentGate.isUnlocked || isBusy || !token}
                className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-white px-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-black transition-colors hover:bg-velmere-gold disabled:cursor-not-allowed disabled:bg-white/[0.10] disabled:text-white/[0.34]"
              >
                {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {t("import")}
              </button>
              <button
                type="button"
                onClick={() => publish("coming_soon")}
                disabled={!adminEnvironmentGate.isUnlocked || isBusy || selectedDrafts.length === 0 || !token}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/[0.12] px-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/[0.62] transition-colors hover:border-white/[0.25] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("publishComingSoon")}
              </button>
              <button
                type="button"
                onClick={() => publish("active")}
                disabled={!adminEnvironmentGate.isUnlocked || isBusy || selectedDrafts.length === 0 || hasSelectedDraftErrors || !token}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-velmere-gold/[0.35] px-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-velmere-gold transition-colors hover:bg-velmere-gold hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("publishActive")}
              </button>
            </div>

            {message && (
              <div className="mt-5 flex gap-3 rounded-lg border border-velmere-gold/[0.25] bg-velmere-gold/[0.08] p-4 text-sm leading-7 text-white/[0.70]">
                <ShieldAlert className="mt-1 h-4 w-4 shrink-0 text-velmere-gold" aria-hidden="true" />
                {message}
              </div>
            )}

            <div className="mt-5">
              <AiProductCopyButton token={token} drafts={selectedDrafts} />
            </div>
          </section>
        </section>

        <section className="mt-8 overflow-hidden rounded-lg border border-white/[0.10] bg-white/[0.035]">
          <div className="border-b border-white/[0.10] p-5">
            <h2 className="font-serif text-3xl text-white">{t("previewTitle")}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-white/[0.10] text-[10px] uppercase tracking-[0.18em] text-white/[0.38]">
                <tr>
                  <th className="p-4">{t("select")}</th>
                  <th className="p-4">{t("image")}</th>
                  <th className="p-4">{t("detectedTitle")}</th>
                  <th className="p-4">{t("provider")}</th>
                  <th className="p-4">{t("price")}</th>
                  <th className="p-4">{t("variants")}</th>
                  <th className="p-4">{t("images")}</th>
                  <th className="p-4">{t("warnings")}</th>
                  <th className="p-4">{t("status")}</th>
                  <th className="p-4">{t("action")}</th>
                </tr>
              </thead>
              <tbody>
                {drafts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-white/[0.42]">
                      {t("emptyPreview")}
                    </td>
                  </tr>
                ) : (
                  drafts.map((draft) => {
                    const selected = selectedDraftIds.includes(draft.draftId);
                    return (
                      <tr key={draft.draftId} className="border-b border-white/[0.10] align-top text-white/[0.62]">
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(event) =>
                              setSelectedDraftIds((current) =>
                                event.target.checked
                                  ? [...current, draft.draftId]
                                  : current.filter((id) => id !== draft.draftId),
                              )
                            }
                          />
                        </td>
                        <td className="p-4">
                          {draft.product.images[0]?.url ? (
                            <div className="relative h-16 w-16 overflow-hidden rounded-lg">
                              <Image
                                src={draft.product.images[0].url}
                                alt={getLocalizedString(draft.product.title, "pl")}
                                fill
                                sizes="64px"
                                className="object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-white/[0.10] text-white/[0.28]">
                              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                            </div>
                          )}
                        </td>
                        <td className="max-w-[16rem] p-4 font-semibold text-white">
                          {getLocalizedString(draft.product.title, "pl")}
                        </td>
                        <td className="p-4 uppercase">{draft.product.provider}</td>
                        <td className="p-4">{draft.product.price.amount ? formatMoney(draft.product.price, "pl") : "-"}</td>
                        <td className="p-4">{draft.product.variants.length}</td>
                        <td className="p-4">{draft.product.images.length}</td>
                        <td className="max-w-[18rem] p-4">
                          <div className="space-y-1">
                            {[...draft.warnings, ...draft.validationErrors].map((warning) => (
                              <p key={warning}>{warning}</p>
                            ))}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.10] px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white/[0.50]">
                            <CheckCircle2 className="h-3.5 w-3.5 text-velmere-gold" aria-hidden="true" />
                            {draft.product.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {draft.product.externalUrl ? (
                            <a
                              href={draft.product.externalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-10 items-center gap-2 rounded-full border border-white/[0.10] px-4 text-[10px] uppercase tracking-[0.16em] text-white/[0.58] hover:border-white/[0.25] hover:text-white"
                            >
                              {t("openSource")}
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-10 space-y-10">
          <ProductionReadinessChecklist />
          <ProductLaunchChecklist />
        </div>
      </LuxurySection>
      <CommerceLaunchControl locale={locale} surface="admin" />
      <ProviderTruthLedgerPanel locale={locale} surface="admin" />
      <OrderEventLedgerPanel locale={locale} surface="admin" />
      <AdminRouteGatePanel locale={locale} surface="admin" />
        <OperatorLaunchGateMatrixPanel locale={locale} surface="admin" />
        <AdminServerAuthContractPanel locale={locale} surface="admin" />
        <PublishPermissionGatePanel locale={locale} surface="admin" />
        <SecretRedactionPolicyPanel locale={locale} surface="admin" />
        <AdminMutationAuditPanel locale={locale} surface="admin" />
        <AdminAuditPersistencePanel locale={locale} surface="admin" />
        <AdminAuthSessionGuardPanel locale={locale} surface="admin" />
        <AdminAuditWriteApiPanel locale={locale} surface="admin" />
        <AdminIdempotencyStorePanel locale={locale} surface="admin" />
        <PublishRollbackContextPanel locale={locale} surface="admin" />
        <SupportSafeTimelinePanel locale={locale} surface="admin" />
        <CustomerSafeExportBoundaryPanel locale={locale} surface="admin" />
    </main>
  );
}
