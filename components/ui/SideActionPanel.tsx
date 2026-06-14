"use client";

import { useEffect, useId } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCart } from "@/components/CartProvider";
import { DrawerRoot } from "@/components/ui/OverlayPrimitives";

export type SideActionPanelProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  kicker?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
};

const widthBySize = {
  sm: "md:max-w-[520px]",
  md: "md:max-w-[560px]",
  lg: "md:max-w-[640px]",
} as const;

export default function SideActionPanel({
  open,
  onClose,
  title,
  kicker,
  children,
  size = "md",
}: SideActionPanelProps) {
  const common = useTranslations("SideActionPanel");
  const { closeCart } = useCart();
  const titleId = useId();

  useEffect(() => {
    if (open) closeCart();
  }, [closeCart, open]);

  return (
    <DrawerRoot
      open={open}
      onClose={onClose}
      closeLabel={common("close")}
      ariaLabelledBy={titleId}
      surfaceClassName={`velmere-command-shell velmere-side-drawer-panel fixed inset-x-0 bottom-0 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-[2rem] text-white md:right-0 md:left-auto md:w-full md:rounded-none md:rounded-l-[2rem] ${widthBySize[size]}`}
      surfaceData={{ surface: "side-action" }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-6 py-6 md:px-10 md:py-8">
        <div className="min-w-0 pr-4">
          {kicker ? (
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#d4af37]">
              {kicker}
            </p>
          ) : null}
          <h2
            id={titleId}
            className="mt-2 font-serif text-2xl leading-[0.98] tracking-[-0.025em] text-[#FFFFF0] md:text-3xl"
          >
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="velmere-command-pill velmere-interaction-pulse inline-flex h-11 w-11 shrink-0 items-center justify-center px-0 text-white/[0.70] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-velmere-gold/[0.75]"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{common("close")}</span>
        </button>
      </div>
      <div
        data-modal-scroll-region="true"
        className="flex-1 overflow-y-auto overscroll-contain px-6 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] touch-pan-y luxury-scrollbar md:px-10 md:py-10"
      >
        {children}
      </div>
    </DrawerRoot>
  );
}
