"use client";

import { useTranslations } from "next-intl";

export type VlmActionKey = "wallet" | "trade" | "registry" | "guide" | "lab";

type VlmActionBarProps = {
  onAction: (key: VlmActionKey) => void;
};

const actions: { key: VlmActionKey; labelKey: string }[] = [
  { key: "wallet", labelKey: "wallet" },
  { key: "trade", labelKey: "trade" },
  { key: "registry", labelKey: "registry" },
  { key: "guide", labelKey: "guide" },
  { key: "lab", labelKey: "proLab" },
];

export default function VlmActionBar({ onAction }: VlmActionBarProps) {
  const t = useTranslations("VlmActionBar");

  return (
    <div className="no-scrollbar w-full overflow-x-auto pb-1" data-pass2004-vlm-actionbar="cyan-focus-low-lag">
      <div className="inline-flex min-w-max gap-1 rounded-full border border-white/[0.10] bg-white/[0.035] p-1">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            onClick={() => onAction(action.key)}
            className="min-h-[44px] shrink-0 rounded-full px-5 font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FFFFF0]/[0.72] transition-colors duration-150 hover:bg-white/[0.07] hover:text-[#FFFFF0] focus:outline-none focus:ring-2 focus:ring-cyan-200/[0.22]"
          >
            {t(action.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
