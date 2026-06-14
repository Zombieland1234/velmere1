"use client";

import { useState } from "react";
import { Ruler, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { ModalRoot } from "@/components/ui/OverlayPrimitives";
import { pass628LayerStyle } from "@/lib/ui/pass628-overlay-constitution";

const rows = [
  ["S", "48–52", "66", "58"],
  ["M", "52–56", "68", "60"],
  ["L", "56–60", "70", "62"],
  ["XL", "60–64", "72", "64"],
];

export default function SizeGuideTeaser() {
  const t = useTranslations("SizeGuide");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("open")}
        className="velmere-floating-utility velmere-floating-utility--size-guide velmere-command-pill velmere-interaction-pulse fixed hidden h-12 w-12 items-center justify-center bg-[#FFFFF0]/[0.94] px-0 text-black shadow-[0_18px_70px_rgba(0,0,0,0.48)] md:flex"
        style={pass628LayerStyle("floatingAction")}
      >
        <Ruler className="h-4 w-4 text-[#9f7d24]" aria-hidden="true" />
      </button>

      <ModalRoot
        open={open}
        onClose={() => setOpen(false)}
        closeLabel={t("close")}
        ariaLabelledBy="velmere-size-guide-title"
        surfaceClassName="velmere-command-shell flex w-[min(29rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-[2rem] text-[#FFFFF0]"
        surfaceData={{ surface: "size-guide" }}
      >
        <div
          className="mx-auto mt-3 h-1 w-14 rounded-full bg-white/[0.18] md:hidden"
          aria-hidden="true"
        />
        <div className="velmere-dialog-header flex items-start justify-between gap-4 border-b border-white/[0.08] px-5 py-5 sm:px-6">
          <div>
            <p className="font-sans text-[10px] font-black uppercase tracking-[0.22em] text-[#d4af37]">
              {t("kicker")}
            </p>
            <h2
              id="velmere-size-guide-title"
              className="mt-2 font-serif text-2xl leading-tight sm:text-3xl"
            >
              {t("title")}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="velmere-command-pill velmere-interaction-pulse inline-flex h-11 w-11 shrink-0 items-center justify-center px-0 text-white/[0.58] hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">{t("close")}</span>
          </button>
        </div>

        <div
          data-modal-scroll-region="true"
          className="luxury-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] touch-pan-y sm:px-6 sm:py-6"
        >
          <p className="text-sm leading-7 text-white/[0.58]">{t("body")}</p>
          <div className="velmere-data-table mt-5 overflow-hidden rounded-2xl">
            <table className="w-full border-collapse text-left font-sans text-xs text-white/[0.68]">
              <thead>
                <tr>
                  <th>{t("size")}</th>
                  <th>{t("chest")}</th>
                  <th>{t("length")}</th>
                  <th>{t("shoulder")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, index) => (
                      <td
                        key={`${row[0]}-${cell}`}
                        className={
                          index === 0 ? "font-semibold text-white" : undefined
                        }
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="velmere-form-note mt-4">{t("note")}</p>
        </div>
      </ModalRoot>
    </>
  );
}
