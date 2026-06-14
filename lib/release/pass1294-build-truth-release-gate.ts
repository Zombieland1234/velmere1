export type Pass1294BuildTruthState = "blocked_by_sandbox_timeout" | "ready_for_real_ci" | "proven_green";

export type Pass1294BuildTruthCommand = {
  id: "install" | "typecheck" | "lint" | "build" | "clickProof" | "visualArtifacts";
  command: string;
  requiredFor100: boolean;
  sandboxStatus: "not_run" | "pass" | "blocked" | "pending_artifacts";
  proofRequired: string;
};

export type Pass1294BuildTruthReleaseGate = {
  id: "pass1294-build-truth-runtime-artifacts-gate";
  state: Pass1294BuildTruthState;
  nodeTarget: "24.16.0";
  npmTarget: "11.16.0";
  rule: "do_not_count_100_until_full_build_and_browser_artifacts_are_green";
  sandboxTruth: string;
  requiredCommands: Pass1294BuildTruthCommand[];
  artifactPolicy: {
    root: "test-results/pass1274-runtime-visual-qa";
    requiredScreenshots: string[];
    minimumBytes: number;
    validator: "npm run verify:e2e:pass1274-1293-artifacts";
  };
  percentageCapUntilGreen: 96.2;
};

export const pass1294BuildTruthReleaseGate: Pass1294BuildTruthReleaseGate = {
  id: "pass1294-build-truth-runtime-artifacts-gate",
  state: "blocked_by_sandbox_timeout",
  nodeTarget: "24.16.0",
  npmTarget: "11.16.0",
  rule: "do_not_count_100_until_full_build_and_browser_artifacts_are_green",
  sandboxTruth:
    "Full npm ci on Node 24/npm 11 starts and downloads packages, but this sandbox cuts the process before a stable node_modules remains; treat build/typecheck/lint as not proven here.",
  requiredCommands: [
    {
      id: "install",
      command: "npx -p node@24.16.0 -p npm@11.16.0 -c \"npm ci --no-audit --no-fund --progress=false\"",
      requiredFor100: true,
      sandboxStatus: "blocked",
      proofRequired: "Complete install log ending with added packages and a stable node_modules directory.",
    },
    {
      id: "typecheck",
      command: "npm run typecheck",
      requiredFor100: true,
      sandboxStatus: "not_run",
      proofRequired: "Zero TypeScript errors after a complete install.",
    },
    {
      id: "lint",
      command: "npm run lint",
      requiredFor100: true,
      sandboxStatus: "not_run",
      proofRequired: "ESLint exits 0 or has documented intentional warnings only.",
    },
    {
      id: "build",
      command: "npm run build",
      requiredFor100: true,
      sandboxStatus: "not_run",
      proofRequired: "Next production build exits 0 on Node 24/npm 11.",
    },
    {
      id: "clickProof",
      command: "npm run test:e2e:pass1214-1233 && npm run test:e2e:pass1274-1293",
      requiredFor100: true,
      sandboxStatus: "pending_artifacts",
      proofRequired: "Playwright passes for desktop and mobile click surfaces.",
    },
    {
      id: "visualArtifacts",
      command: "npm run verify:e2e:pass1274-1293-artifacts",
      requiredFor100: true,
      sandboxStatus: "pending_artifacts",
      proofRequired: "Required screenshots exist, are non-empty, and are listed in the release notes.",
    },
  ],
  artifactPolicy: {
    root: "test-results/pass1274-runtime-visual-qa",
    requiredScreenshots: [
      "lens-reader-desktop-eth.png",
      "lens-pdf-frame-desktop-eth.png",
      "lens-reader-mobile-eth.png",
      "header-language-mobile.png",
      "header-wallet-mobile.png",
      "header-cart-mobile.png",
      "shield-unified-modal.png",
      "real-markets-unified-modal.png",
    ],
    minimumBytes: 2048,
    validator: "npm run verify:e2e:pass1274-1293-artifacts",
  },
  percentageCapUntilGreen: 96.2,
};

export function getPass1294BuildTruthReleaseGate(): Pass1294BuildTruthReleaseGate {
  return pass1294BuildTruthReleaseGate;
}
