import {  errors, read, retiredGuardMarkerSource } from "./context.mjs";
import { setGuardScope } from "./context.mjs";

setGuardScope("pf.evidence-providers.012");
// guard script marker: verify-pass205-ai-brain-webgl-prototype-isolation-safety.mjs
// PASS205

// PASS207 AI Brain decision dock guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass207.ts");
  const reportSource = read("docs/progress/PASS207_AI_BRAIN_DECISION_DOCK.md");
  for (const needle of [
    "PASS207 marker",
    "decisionDock",
    "data-vlm-decision-dock",
    "priorityValue",
    "confidenceLimitValue",
    "sourceModeValue",
    "reviewWindowValue",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.012.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS207 decision dock marker ${needle}`,
      );
  }
  for (const needle of [
    ".shield-vlm-decision-dock",
    "grid-template-columns: repeat(4",
    "max-width: 760px",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.012.components-market-integrity-tokenriskmodalx-missing-lega.a002.app-globals-css-missing-legacy-decision-dock-css-marker")(
        `app/globals.css: missing PASS207 decision dock CSS marker ${needle}`,
      );
  }
  for (const needle of [
    "velmerePass207ProgressDeltas",
    "Tile decision dock",
    "Risk driver mapping",
    "Source confidence lanes",
    "Missing-data semantics",
  ]) {
    if (!deltaSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.012.components-market-integrity-tokenriskmodalx-missing-lega.a003.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass207.ts: missing PASS207 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS207 — AI Brain Decision Dock"))
    errors.pushWithId.bind(errors, "evidence.012.components-market-integrity-tokenriskmodalx-missing-lega.a004.docs-progress-legacy-ai-brain-decision-dock-md-missing-l")(
      "docs/progress/PASS207_AI_BRAIN_DECISION_DOCK.md: missing PASS207 report marker",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "evidence.012.components-market-integrity-tokenriskmodalx-missing-lega.a005.legacy-ai-brain-decision-dock-guard-failed-value")(
    `PASS207 AI Brain decision dock guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}


setGuardScope("pf.evidence-providers.013");
// guard script marker: verify-pass207-ai-brain-decision-dock-safety.mjs
// PASS207

// PASS208 AI Brain report capsule guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass208.ts");
  const reportSource = read("docs/progress/PASS208_AI_BRAIN_REPORT_CAPSULE.md");
  for (const needle of [
    "PASS208 marker",
    "reportCapsule",
    "data-vlm-report-capsule",
    "publicBrief",
    "internalMemo",
    "redactionRule",
    "exportGate",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.013.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS208 report capsule marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS208 · AI Brain report capsule",
    ".shield-vlm-report-capsule",
    ".shield-vlm-report-capsule-grid",
    "contain: paint",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.013.components-market-integrity-tokenriskmodalx-missing-lega.a002.app-globals-css-missing-legacy-report-capsule-css-marker")(
        `app/globals.css: missing PASS208 report capsule CSS marker ${needle}`,
      );
  }
  for (const needle of [
    "velmerePass208ProgressDeltas",
    "Risk driver mapping",
    "Evidence Note",
    "Operator-only report fields",
  ]) {
    if (!deltaSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.013.components-market-integrity-tokenriskmodalx-missing-lega.a003.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass208.ts: missing PASS208 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS208 — AI Brain Report Capsule"))
    errors.pushWithId.bind(errors, "evidence.013.components-market-integrity-tokenriskmodalx-missing-lega.a004.docs-progress-legacy-ai-brain-report-capsule-md-missing")(
      "docs/progress/PASS208_AI_BRAIN_REPORT_CAPSULE.md: missing PASS208 report marker",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "evidence.013.components-market-integrity-tokenriskmodalx-missing-lega.a005.legacy-ai-brain-report-capsule-guard-failed-value")(
    `PASS208 AI Brain report capsule guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}


setGuardScope("pf.evidence-providers.014");
// guard script marker: verify-pass208-ai-brain-report-capsule-safety.mjs
// PASS208

// PASS209 AI Brain capsule envelope guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const capsuleSource = read(
    "lib/market-integrity/vlm-brain-report-capsule.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass209.ts");
  const reportSource = read(
    "docs/progress/PASS209_AI_BRAIN_CAPSULE_ENVELOPE.md",
  );
  for (const needle of [
    "buildVlmBrainReportCapsule",
    "selectedTileReportCapsuleEnvelope",
    "data-vlm-report-capsule-envelope",
    "capsuleId",
    "exportReadiness",
    "PASS209 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.014.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS209 capsule envelope marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainReportCapsuleEnvelope",
    "vlm-brain-report-capsule-v1-pass209",
    "tile_preview_only",
    "redactSensitive",
    "PASS209_VLM_BRAIN_REPORT_CAPSULE_CONTRACT",
  ]) {
    if (!capsuleSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.014.components-market-integrity-tokenriskmodalx-missing-lega.a002.lib-market-integrity-vlm-brain-report-capsule-missing-le")(
        `lib/market-integrity/vlm-brain-report-capsule.ts: missing PASS209 capsule contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS209 · AI Brain report capsule envelope",
    ".shield-vlm-report-capsule-footer",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.014.components-market-integrity-tokenriskmodalx-missing-lega.a003.app-globals-css-missing-legacy-capsule-css-marker-value")(
        `app/globals.css: missing PASS209 capsule CSS marker ${needle}`,
      );
  }
  for (const needle of [
    "velmerePass209ProgressDeltas",
    "Redacted payload export",
    "Previous → Current → Change",
  ]) {
    if (!deltaSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.014.components-market-integrity-tokenriskmodalx-missing-lega.a004.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass209.ts: missing PASS209 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS209 — AI Brain Capsule Envelope"))
    errors.pushWithId.bind(errors, "evidence.014.components-market-integrity-tokenriskmodalx-missing-lega.a005.docs-progress-legacy-ai-brain-capsule-envelope-md-missin")(
      "docs/progress/PASS209_AI_BRAIN_CAPSULE_ENVELOPE.md: missing PASS209 report marker",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "evidence.014.components-market-integrity-tokenriskmodalx-missing-lega.a006.legacy-ai-brain-capsule-envelope-guard-failed-value")(
    `PASS209 AI Brain capsule envelope guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}


setGuardScope("pf.evidence-providers.015");
// guard script marker: verify-pass209-ai-brain-capsule-envelope-safety.mjs
// PASS209

// PASS210 AI Brain capsule handoff bridge guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const handoffSource = read(
    "lib/market-integrity/vlm-brain-capsule-handoff.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass210.ts");
  const reportSource = read(
    "docs/progress/PASS210_AI_BRAIN_CAPSULE_HANDOFF.md",
  );
  for (const needle of [
    "buildVlmBrainCapsuleHandoff",
    "selectedTileReportCapsuleHandoff",
    "data-vlm-capsule-handoff",
    "PASS210 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.015.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS210 handoff marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainCapsuleHandoff",
    "vlm-brain-capsule-handoff-v1-pass210",
    "report_bridge_preview",
    "client_preview_only",
    "PASS210_VLM_BRAIN_CAPSULE_HANDOFF_CONTRACT",
  ]) {
    if (!handoffSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.015.components-market-integrity-tokenriskmodalx-missing-lega.a002.lib-market-integrity-vlm-brain-capsule-handoff-missing-l")(
        `lib/market-integrity/vlm-brain-capsule-handoff.ts: missing PASS210 handoff contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS210 · AI Brain report capsule handoff bridge",
    ".shield-vlm-report-handoff",
    ".shield-vlm-report-handoff-grid",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.015.components-market-integrity-tokenriskmodalx-missing-lega.a003.app-globals-css-missing-legacy-handoff-css-marker-value")(
        `app/globals.css: missing PASS210 handoff CSS marker ${needle}`,
      );
  }
  for (const needle of [
    "velmerePass210ProgressDeltas",
    "Source freshness registry",
    "PASS210_AI_BRAIN_CAPSULE_HANDOFF_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.015.components-market-integrity-tokenriskmodalx-missing-lega.a004.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass210.ts: missing PASS210 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS210 — AI Brain Capsule Handoff Bridge"))
    errors.pushWithId.bind(errors, "evidence.015.components-market-integrity-tokenriskmodalx-missing-lega.a005.docs-progress-legacy-ai-brain-capsule-handoff-md-missing")(
      "docs/progress/PASS210_AI_BRAIN_CAPSULE_HANDOFF.md: missing PASS210 report marker",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "evidence.015.components-market-integrity-tokenriskmodalx-missing-lega.a006.legacy-ai-brain-capsule-handoff-guard-failed-value")(
    `PASS210 AI Brain capsule handoff guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}


setGuardScope("pf.evidence-providers.016");
// guard script marker: verify-pass210-ai-brain-capsule-handoff-safety.mjs
// PASS210

// PASS211 AI Brain operator action queue guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const queueSource = read(
    "lib/market-integrity/vlm-brain-operator-action-queue.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass211.ts");
  const reportSource = read(
    "docs/progress/PASS211_AI_BRAIN_OPERATOR_ACTION_QUEUE.md",
  );
  for (const needle of [
    "buildVlmBrainOperatorActionQueue",
    "selectedTileOperatorActionQueue",
    "data-vlm-operator-action-queue",
    "PASS211 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.016.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS211 action queue marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainOperatorActionQueue",
    "vlm-brain-operator-action-queue-v1-pass211",
    "operator_case_preview",
    "PASS211_VLM_BRAIN_OPERATOR_ACTION_QUEUE_CONTRACT",
  ]) {
    if (!queueSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.016.components-market-integrity-tokenriskmodalx-missing-lega.a002.lib-market-integrity-vlm-brain-operator-action-queue-mis")(
        `lib/market-integrity/vlm-brain-operator-action-queue.ts: missing PASS211 action queue contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS211 · AI Brain operator action queue",
    ".shield-vlm-operator-action-queue",
    ".shield-vlm-operator-action-list",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.016.components-market-integrity-tokenriskmodalx-missing-lega.a003.app-globals-css-missing-legacy-action-queue-css-marker-v")(
        `app/globals.css: missing PASS211 action queue CSS marker ${needle}`,
      );
  }
  for (const needle of [
    "velmerePass211ProgressDeltas",
    "Operator cases",
    "PASS211_AI_BRAIN_OPERATOR_ACTION_QUEUE_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.016.components-market-integrity-tokenriskmodalx-missing-lega.a004.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass211.ts: missing PASS211 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS211 — AI Brain Operator Action Queue"))
    errors.pushWithId.bind(errors, "evidence.016.components-market-integrity-tokenriskmodalx-missing-lega.a005.docs-progress-legacy-ai-brain-operator-action-queue-md-m")(
      "docs/progress/PASS211_AI_BRAIN_OPERATOR_ACTION_QUEUE.md: missing PASS211 report marker",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "evidence.016.components-market-integrity-tokenriskmodalx-missing-lega.a006.legacy-ai-brain-operator-action-queue-guard-failed-value")(
    `PASS211 AI Brain operator action queue guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}


setGuardScope("pf.evidence-providers.017");
// guard script marker: verify-pass211-ai-brain-operator-action-queue-safety.mjs
// PASS211

// PASS212 AI Brain case review timeline guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const timelineSource = read(
    "lib/market-integrity/vlm-brain-case-review-timeline.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass212.ts");
  const reportSource = read(
    "docs/progress/PASS212_AI_BRAIN_CASE_REVIEW_TIMELINE.md",
  );
  for (const needle of [
    "buildVlmBrainCaseReviewTimeline",
    "selectedTileCaseReviewTimeline",
    "data-vlm-case-review-timeline",
    "PASS212 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.017.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS212 timeline marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainCaseReviewTimeline",
    "vlm-brain-case-review-timeline-v1-pass212",
    "operator_case_timeline_preview",
    "PASS212_VLM_BRAIN_CASE_REVIEW_TIMELINE_CONTRACT",
  ]) {
    if (!timelineSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.017.components-market-integrity-tokenriskmodalx-missing-lega.a002.lib-market-integrity-vlm-brain-case-review-timeline-miss")(
        `lib/market-integrity/vlm-brain-case-review-timeline.ts: missing PASS212 contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS212 · AI Brain case review timeline",
    ".shield-vlm-case-review-timeline",
    ".shield-vlm-case-review-event-list",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.017.components-market-integrity-tokenriskmodalx-missing-lega.a003.app-globals-css-missing-legacy-timeline-css-marker-value")(
        `app/globals.css: missing PASS212 timeline CSS marker ${needle}`,
      );
  }
  for (const needle of [
    "velmerePass212ProgressDeltas",
    "Operator cases",
    "PASS212_AI_BRAIN_CASE_REVIEW_TIMELINE_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.017.components-market-integrity-tokenriskmodalx-missing-lega.a004.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass212.ts: missing PASS212 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS212 — AI Brain Case Review Timeline"))
    errors.pushWithId.bind(errors, "evidence.017.components-market-integrity-tokenriskmodalx-missing-lega.a005.docs-progress-legacy-ai-brain-case-review-timeline-md-mi")(
      "docs/progress/PASS212_AI_BRAIN_CASE_REVIEW_TIMELINE.md: missing PASS212 report marker",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "evidence.017.components-market-integrity-tokenriskmodalx-missing-lega.a006.legacy-ai-brain-case-review-timeline-guard-failed-value")(
    `PASS212 AI Brain case review timeline guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}


setGuardScope("pf.evidence-providers.018");
// guard script marker: verify-pass212-ai-brain-case-review-timeline-safety.mjs
// PASS212

// PASS213 AI Brain customer export firewall guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const firewallSource = read(
    "lib/market-integrity/vlm-brain-customer-export-firewall.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = read("lib/launch/master-build-progress-delta-pass213.ts");
  const reportSource = read(
    "docs/progress/PASS213_AI_BRAIN_CUSTOMER_EXPORT_FIREWALL.md",
  );
  for (const needle of [
    "buildVlmBrainCustomerExportFirewall",
    "selectedTileCustomerExportFirewall",
    'data-vlm-export-firewall="pass213"',
    "PASS213 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.018.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS213 export firewall marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainCustomerExportFirewall",
    "vlm-brain-customer-export-firewall-v1-pass213",
    "customer_export_preview_gate",
    "debtMatrix",
    "PASS213_VLM_BRAIN_CUSTOMER_EXPORT_FIREWALL_CONTRACT",
  ]) {
    if (!firewallSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.018.components-market-integrity-tokenriskmodalx-missing-lega.a002.lib-market-integrity-vlm-brain-customer-export-firewall")(
        `lib/market-integrity/vlm-brain-customer-export-firewall.ts: missing PASS213 contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS213 · AI Brain customer export firewall",
    ".shield-vlm-export-firewall",
    ".shield-vlm-export-firewall-debt",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.018.components-market-integrity-tokenriskmodalx-missing-lega.a003.app-globals-css-missing-legacy-firewall-css-marker-value")(
        `app/globals.css: missing PASS213 firewall CSS marker ${needle}`,
      );
  }
  for (const needle of [
    "velmerePass213ProgressDeltas",
    "PASS213_AI_BRAIN_CUSTOMER_EXPORT_FIREWALL_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.018.components-market-integrity-tokenriskmodalx-missing-lega.a004.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass213.ts: missing PASS213 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS213 — AI Brain Customer Export Firewall"))
    errors.pushWithId.bind(errors, "evidence.018.components-market-integrity-tokenriskmodalx-missing-lega.a005.docs-progress-legacy-ai-brain-customer-export-firewall-m")(
      "docs/progress/PASS213_AI_BRAIN_CUSTOMER_EXPORT_FIREWALL.md: missing PASS213 report marker",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "evidence.018.components-market-integrity-tokenriskmodalx-missing-lega.a006.legacy-ai-brain-customer-export-firewall-guard-failed-va")(
    `PASS213 AI Brain customer export firewall guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}


setGuardScope("pf.evidence-providers.019");
// guard script marker: verify-pass213-ai-brain-customer-export-firewall-safety.mjs
// PASS213

// PASS214 AI Brain source coverage matrix guard
try {
  const modalSource = read("components/market-integrity/TokenRiskModal.tsx");
  const matrixSource = read(
    "lib/market-integrity/vlm-brain-source-coverage-matrix.ts",
  );
  const cssSource = read("app/globals.css");
  const deltaSource = retiredGuardMarkerSource("PASS214_AI_BRAIN_SOURCE_COVERAGE_MATRIX_DELTA");
  const reportSource = read(
    "docs/progress/PASS214_AI_BRAIN_SOURCE_COVERAGE_MATRIX.md",
  );
  for (const needle of [
    "buildVlmBrainSourceCoverageMatrix",
    "selectedTileSourceCoverageMatrix",
    'data-vlm-source-coverage-matrix="pass214"',
    "PASS214 marker",
  ]) {
    if (!modalSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.019.components-market-integrity-tokenriskmodalx-missing-lega.a001.components-market-integrity-tokenriskmodalx-missing-lega")(
        `components/market-integrity/TokenRiskModal.tsx: missing PASS214 matrix marker ${needle}`,
      );
  }
  for (const needle of [
    "VlmBrainSourceCoverageMatrix",
    "vlm-brain-source-coverage-matrix-v1-pass214",
    "operator_source_coverage_preview",
    "secondSourceRequired",
    "PASS214_VLM_BRAIN_SOURCE_COVERAGE_MATRIX_CONTRACT",
  ]) {
    if (!matrixSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.019.components-market-integrity-tokenriskmodalx-missing-lega.a002.lib-market-integrity-vlm-brain-source-coverage-matrix-mi")(
        `lib/market-integrity/vlm-brain-source-coverage-matrix.ts: missing PASS214 contract marker ${needle}`,
      );
  }
  for (const needle of [
    "PASS214 · AI Brain source coverage matrix",
    ".shield-vlm-source-coverage-matrix",
    "data-vlm-source-coverage-lane",
  ]) {
    if (!cssSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.019.components-market-integrity-tokenriskmodalx-missing-lega.a003.app-globals-css-missing-legacy-css-marker-value")(`app/globals.css: missing PASS214 CSS marker ${needle}`);
  }
  for (const needle of [
    "velmerePass214ProgressDeltas",
    "PASS214_AI_BRAIN_SOURCE_COVERAGE_MATRIX_DELTA",
  ]) {
    if (!deltaSource.includes(needle))
      errors.pushWithId.bind(errors, "evidence.019.components-market-integrity-tokenriskmodalx-missing-lega.a004.lib-launch-master-build-progress-delta-legacy-missing-le")(
        `lib/launch/master-build-progress-delta-pass214.ts: missing PASS214 delta marker ${needle}`,
      );
  }
  if (!reportSource.includes("PASS214 — AI Brain Source Coverage Matrix"))
    errors.pushWithId.bind(errors, "evidence.019.components-market-integrity-tokenriskmodalx-missing-lega.a005.docs-progress-legacy-ai-brain-source-coverage-matrix-md")(
      "docs/progress/PASS214_AI_BRAIN_SOURCE_COVERAGE_MATRIX.md: missing PASS214 report marker",
    );
} catch (error) {
  errors.pushWithId.bind(errors, "evidence.019.components-market-integrity-tokenriskmodalx-missing-lega.a006.legacy-ai-brain-source-coverage-matrix-guard-failed-valu")(
    `PASS214 AI Brain source coverage matrix guard failed: ${error instanceof Error ? error.message : String(error)}`,
  );
}
