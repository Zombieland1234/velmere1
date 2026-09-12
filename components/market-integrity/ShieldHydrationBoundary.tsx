"use client";

import dynamic from "next/dynamic";

const ShieldRealMarketsParityClient = dynamic(
  () => import("@/components/market-integrity/ShieldRealMarketsParityClient"),
  {
    ssr: false,
    loading: () => (
      <div
        className="min-h-[32rem] rounded-[1.6rem] border border-white/[0.08] bg-white/[0.025]"
        aria-busy="true"
        aria-label="Loading Velmère Shield market terminal"
        data-shield-hydration-boundary="client-mount-pending"
      />
    ),
  },
);

export default function ShieldHydrationBoundary({ locale }: { locale: string }) {
  return <ShieldRealMarketsParityClient locale={locale} />;
}
