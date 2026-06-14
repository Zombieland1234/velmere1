"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { CONSENT_STORAGE_KEY, createConsentChoice, parseConsent } from "@/lib/privacy/consent";
import { pass628LayerStyle } from "@/lib/ui/pass628-overlay-constitution";

export default function CookieConsent() {
  const t = useTranslations("CookieConsent");
  const [isVisible, setIsVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setIsVisible(!parseConsent(localStorage.getItem(CONSENT_STORAGE_KEY)));
  }, []);

  const choose = (value: "accepted" | "declined") => {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(createConsentChoice(value)));
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.aside
          initial={{ y: 28, opacity: 0, scale: 0.985 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0, scale: 0.985 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="velmere-command-shell fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 right-3 overflow-hidden rounded-[1.55rem] border-white/[0.09] p-4 text-white shadow-[0_30px_100px_rgba(0,0,0,0.55)] sm:left-5 sm:right-auto sm:w-[min(31rem,calc(100vw-2.5rem))] sm:p-5" data-pass2006-cookie="solid-low-lag-cyan-focus-owned-settings"
          style={pass628LayerStyle("floatingAction")}
          role="dialog"
          aria-labelledby="velmere-cookie-title"
          aria-describedby="velmere-cookie-description"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/[0.28] to-transparent" aria-hidden="true" />

          <div className="flex items-start gap-3.5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-200/[0.16] bg-cyan-200/[0.055] text-cyan-100">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p id="velmere-cookie-title" className="text-sm font-semibold text-white/[0.86]">{t("title")}</p>
              <p id="velmere-cookie-description" className="mt-2 text-xs leading-6 text-white/[0.48]">{t("message")}</p>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {showSettings ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-4 rounded-[1.2rem] border border-white/[0.07] bg-black/[0.16] p-3.5">
                  <p className="text-xs leading-6 text-white/[0.46]">{t("settingsIntro")}</p>
                  <div className="mt-3 grid gap-2">
                    {[t("necessary"), t("analytics"), t("marketing")].map((item, index) => (
                      <div key={item} className="flex items-start gap-2.5 rounded-xl border border-white/[0.055] bg-white/[0.02] px-3 py-2.5 text-xs leading-5 text-white/[0.48]">
                        <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${index === 0 ? "border-emerald-300/[0.28] bg-emerald-300/[0.08] text-emerald-200" : "border-white/[0.10] text-white/[0.26]"}`}>
                          {index === 0 ? <Check className="h-2.5 w-2.5" aria-hidden="true" /> : null}
                        </span>
                        {item}
                      </div>
                    ))}
                  </div>
                  <Link href="/privacy" className="mt-3 inline-flex text-xs text-cyan-100 underline-offset-4 transition hover:underline">
                    {t("privacyLink")}
                  </Link>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() => choose("declined")}
              className="velmere-button-secondary min-h-11 px-4 text-[10px] sm:flex-1"
            >
              {t("decline")}
            </button>
            <button
              type="button"
              onClick={() => choose("accepted")}
              className="velmere-button-primary min-h-11 px-4 text-[10px] sm:flex-1"
            >
              {t("accept")}
            </button>
            <button
              type="button"
              onClick={() => setShowSettings((value) => !value)}
              className="col-span-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/[0.38] transition hover:bg-white/[0.035] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/[0.38] sm:order-first sm:min-w-full"
              aria-expanded={showSettings}
            >
              {t("settings")}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${showSettings ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
