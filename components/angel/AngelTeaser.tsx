"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import AngelPanel from "@/components/angel/AngelPanel";
import { useCart } from "@/components/CartProvider";

export default function AngelTeaser() {
  const t = useTranslations("Angel");
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { closeCart } = useCart();

  useEffect(() => {
    const closeAngel = () => setOpen(false);
    const openAngelFromCommand = () => {
      closeCart();
      window.dispatchEvent(new Event("velmere:close-square-panels"));
      setOpen(true);
    };
    window.addEventListener("velmere:close-angel", closeAngel);
    const onVisibility = (event: Event) => {
      const detail = (event as CustomEvent<{ hidden?: boolean }>).detail;
      setHidden(Boolean(detail?.hidden));
      if (detail?.hidden) setOpen(false);
    };
    window.addEventListener("velmere:angel:open", openAngelFromCommand);
    window.addEventListener("velmere:angel-visibility", onVisibility);
    return () => {
      window.removeEventListener("velmere:close-angel", closeAngel);
      window.removeEventListener("velmere:angel:open", openAngelFromCommand);
      window.removeEventListener("velmere:angel-visibility", onVisibility);
    };
  }, [closeCart]);

  const openAngel = () => {
    closeCart();
    window.dispatchEvent(new Event("velmere:close-square-panels"));
    setOpen(true);
  };

  return (
    <>
      {!hidden ? (
        <button
          type="button"
          onClick={openAngel}
          aria-label={t("openLabel")}
          className="velmere-floating-utility velmere-floating-utility--angel group fixed flex min-h-12 items-center gap-2 rounded-full border border-[#d4af37]/[0.35] bg-[#F5F0E8] px-3 text-black shadow-[0_20px_70px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.20] backdrop-blur-2xl transition hover:border-[#d4af37]/[0.55] hover:bg-white active:scale-95 md:bg-[#1A1A1C]/[0.95] md:px-4 md:text-[#d4af37]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d4af37]/[0.25] text-black md:bg-[#d4af37]/[0.10] md:text-[#d4af37]">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="hidden font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/[0.70] md:inline">
            Angel
          </span>
        </button>
      ) : null}
      <AngelPanel open={open && !hidden} onClose={() => setOpen(false)} />
    </>
  );
}
