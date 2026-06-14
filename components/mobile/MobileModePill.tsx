"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";

export default function MobileModePill() {
  const t = useTranslations("VlmModeSwitch");
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "pro" ? "pro" : "basic";
  const items = [
    { key: "basic", href: "/vlm-token", label: t("basic") },
    { key: "pro", href: "/vlm-token?mode=pro", label: t("pro") },
  ] as const;

  return (
    <div className="velmere-floating-utility velmere-floating-utility--mode fixed left-1/2 flex -translate-x-1/2 rounded-full border border-white/[0.10] bg-black/[0.78] p-1 shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:hidden">
      {items.map((item) => {
        const active = mode === item.key;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={() => window.setTimeout(() => window.scrollTo({ top: 0, left: 0, behavior: "smooth" }), 0)}
            className={`inline-flex min-h-11 min-w-[6.25rem] items-center justify-center rounded-full px-5 font-sans text-[10px] font-black uppercase tracking-[0.18em] luxury-hover ${
              active ? "bg-[#F5F0E8] text-black" : "text-white/[0.52] hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
