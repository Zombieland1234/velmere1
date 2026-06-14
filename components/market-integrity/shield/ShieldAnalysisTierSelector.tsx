"use client";

import { Brain, FileText, GitBranch } from "lucide-react";
import type {
  Pass615AnalysisTier,
  Pass615TierManifest,
} from "@/lib/market-integrity/pass615-tier-information-architecture";

export type ShieldAnalysisTierSelectorProps = {
  selectedTier: Pass615AnalysisTier;
  manifests: Record<Pass615AnalysisTier, Pass615TierManifest>;
  copy: {
    basicTitle: string;
    basicHint: string;
    proTitle: string;
    proHint: string;
    advancedTitle: string;
    advancedHint: string;
  };
  onSelect: (tier: Pass615AnalysisTier) => void;
};

const TIER_PRESENTATION = {
  basic: {
    icon: Brain,
    className: "shield-analysis-button shield-analysis-button-basic",
  },
  pro: {
    icon: FileText,
    className:
      "shield-analysis-button border-cyan-200/[0.14] bg-cyan-300/[0.045] text-cyan-50",
  },
  advanced: {
    icon: GitBranch,
    className: "shield-analysis-button shield-analysis-button-advanced",
  },
} satisfies Record<
  Pass615AnalysisTier,
  { icon: typeof Brain; className: string }
>;

export function ShieldAnalysisTierSelector({
  selectedTier,
  manifests,
  copy,
  onSelect,
}: ShieldAnalysisTierSelectorProps) {
  const labels: Record<
    Pass615AnalysisTier,
    { title: string; hint: string }
  > = {
    basic: { title: copy.basicTitle, hint: copy.basicHint },
    pro: { title: copy.proTitle, hint: copy.proHint },
    advanced: { title: copy.advancedTitle, hint: copy.advancedHint },
  };

  return (
    <div
      className="mt-4 grid gap-3"
      role="group"
      aria-label="Analysis depth"
      data-pass615-tier-selector="extracted"
      data-pass645-mobile-budget="interaction-safe"
    >
      {(["basic", "pro", "advanced"] as const).map((tier) => {
        const manifest = manifests[tier];
        const presentation = TIER_PRESENTATION[tier];
        const Icon = presentation.icon;

        return (
          <div key={tier} className="shield-analysis-row shield-analysis-row-clean">
            <button
              type="button"
              onClick={() => onSelect(tier)}
              aria-pressed={selectedTier === tier}
              data-tier-selected={selectedTier === tier ? "true" : "false"}
              data-analysis-tier={tier}
              className={presentation.className}
            >
              <span>
                <strong>{labels[tier].title}</strong>
                <small>{labels[tier].hint}</small>
              </span>
              <span className="shield-analysis-field-count">
                {manifest.fieldBudget}
                <small>{manifest.missingCount} gaps</small>
              </span>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
