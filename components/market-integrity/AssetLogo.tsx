"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  resolveVelmereAssetLogo,
  type VelmereAssetLogoInput,
} from "@/lib/market-integrity/asset-logo-resolver";

export default function AssetLogo({
  className = "",
  compact = false,
  ...input
}: VelmereAssetLogoInput & { className?: string; compact?: boolean }) {
  const { assetClass, id, imageUrl, name, symbol, venue } = input;
  const resolution = useMemo(
    () =>
      resolveVelmereAssetLogo({
        assetClass,
        id,
        imageUrl,
        name,
        symbol,
        venue,
      }),
    [assetClass, id, imageUrl, name, symbol, venue],
  );
  const imageCandidatesKey = resolution.imageCandidates.join("|");
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const src = resolution.imageCandidates[candidateIndex];
  const hasImageCandidate = Boolean(src);

  useEffect(() => {
    setCandidateIndex(0);
    setLoaded(false);
  }, [resolution.symbol, imageCandidatesKey]);

  return (
    <span
      className={`velmere-asset-logo velmere-asset-logo-${resolution.tone} ${compact ? "velmere-asset-logo-compact" : ""} relative overflow-hidden ${className}`}
      role="img"
      aria-label={`${resolution.label} logo`}
      data-logo-source={src ? (candidateIndex === 0 ? "provider" : "fallback") : "badge"}
      data-logo-loaded={loaded ? "true" : "false"}
      data-pass1998-logo-glyph-policy="hide-fallback-glyph-while-any-image-candidate-exists"
    >
      {src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes={compact ? "24px" : "48px"}
          loading="lazy"
          unoptimized
          className={loaded ? "is-loaded" : ""}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setLoaded(false);
            setCandidateIndex((current) => current + 1);
          }}
        />
      ) : null}
      {!hasImageCandidate ? <span aria-hidden="true">{resolution.glyph}</span> : null}
    </span>
  );
}
