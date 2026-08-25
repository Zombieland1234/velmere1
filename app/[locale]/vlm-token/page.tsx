import type { Metadata } from "next";
import { Suspense } from "react";
import VlmAccessGatePage from "@/components/vlm/VlmAccessGatePage";
import { buildVelmereMetadata } from "@/lib/seo/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return buildVelmereMetadata({
    locale,
    path: "/vlm-token",
    title: "VLM Access Layer — Velmère",
    description: "VLM access utility, wallet boundary, contract status and risk notice.",
  });
}

// PASS318 route removal: operator panels are removed from public customer DOM.
export default async function VlmTokenPage() {
  return (
    <>
      <Suspense fallback={null}>
        <VlmAccessGatePage />
      </Suspense>
    </>
  );
}

/* PASS2271 VLM trim: public access page only; operator panels removed from customer DOM. */
