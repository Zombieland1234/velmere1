import type { Metadata } from "next";
import AssetDetailTruthWithheldPage from "@/components/market-integrity/AssetDetailTruthWithheldPage";

type Props = {
  params: Promise<{
    locale: string;
    assetId: string;
  }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Asset detail withheld — Velmère Shield",
    description:
      "Asset detail is withheld until price, market movement, risk, confidence, freshness and source claims are bound to server-verified provider evidence.",
  };
}

export default async function ShieldAssetDetailPage({ params }: Props) {
  const { locale, assetId } = await params;
  return (
    <AssetDetailTruthWithheldPage
      locale={locale}
      surface="shield"
      assetId={assetId}
    />
  );
}
