"use client";

import type React from "react";
import { useEffect, useId } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCart } from "@/components/CartProvider";
import { ModalRoot } from "@/components/ui/OverlayPrimitives";

export type LuxuryActionModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  kicker?: string;
  size?: "sm" | "md" | "lg" | "xl";
  children: React.ReactNode;
};

const widthBySize = {
  sm: "md:max-w-[520px]",
  md: "md:max-w-[720px]",
  lg: "md:max-w-[920px]",
  xl: "md:max-w-[1100px]",
} as const;

export default function LuxuryActionModal({
  open,
  onClose,
  title,
  kicker,
  size = "md",
  children,
}: LuxuryActionModalProps) {
  const common = useTranslations("LuxuryActionModal");
  const { closeCart } = useCart();
  const titleId = useId();

  useEffect(() => {
    if (open) closeCart();
  }, [closeCart, open]);

  return (
    <ModalRoot
      open={open}
      onClose={onClose}
      closeLabel={common("close")}
      ariaLabelledBy={titleId}
      surfaceClassName={`velmere-command-shell flex w-[min(100%,calc(100vw-1rem))] flex-col overflow-hidden rounded-[2rem] text-white outline-none ${widthBySize[size]}`}
      surfaceData={{ surface: "luxury-action" }}
    >
      <div
        className="mx-auto mt-3 h-1 w-14 rounded-full bg-white/[0.20] md:hidden"
        aria-hidden="true"
      />
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.08] px-6 py-5 md:px-8 md:py-6">
        <div className="min-w-0 pr-2">
          {kicker ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">
              {kicker}
            </p>
          ) : null}
          <h2
            id={titleId}
            className="mt-2 font-serif text-2xl leading-[0.96] tracking-[-0.025em] text-[#FFFFF0] md:text-3xl"
          >
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="velmere-command-pill velmere-interaction-pulse inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full px-0 text-white/[0.70] hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{common("close")}</span>
        </button>
      </div>
      <div
        data-modal-scroll-region="true"
        className="luxury-scrollbar flex-1 overflow-y-auto overscroll-contain px-6 py-6 touch-pan-y md:px-8 md:py-8"
      >
        {children}
      </div>
    </ModalRoot>
  );
}
