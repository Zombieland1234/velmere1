import type { UnifiedAuditLocale, UnifiedAuditMode } from "./unified-audit";
import type {
  Pass485EvidenceReasoning,
  Pass485ReasoningLaneId,
} from "./pass485-evidence-reasoning-engine";
import type {
  Pass491ConfidenceAxisId,
  Pass491NeuralConfidenceTopology,
} from "./pass491-neural-confidence-topology";
import type { Pass489MotionTier } from "@/lib/motion/pass489-motion-system";

export type Pass493AttentionTone = "supported" | "review" | "warning" | "action";

export type Pass493AttentionStep = {
  id: Pass485ReasoningLaneId;
  label: string;
  headline: string;
  detail: string;
  tone: Pass493AttentionTone;
  evidenceIds: string[];
  start: number;
  end: number;
};

export type Pass493NeuralAttentionDirector = {
  version: "pass493-neural-attention-director";
  durationMs: number;
  focusAxisId: Pass491ConfidenceAxisId;
  focusAxisScore: number;
  focusBand: "stable" | "guarded" | "critical";
  axisOrder: Pass491ConfidenceAxisId[];
  sequence: Pass493AttentionStep[];
  operatorRead: string;
  interactionHint: string;
};

const copy = {
  pl: {
    stable: "Najbardziej ograniczająca oś jest nadal wystarczająco stabilna. Wniosek pozostaje zależny od źródeł.",
    guarded: "Ta oś ogranicza siłę wniosku. Otwórz ją i sprawdź, jakie dane podniosą pewność.",
    critical: "Ta oś jest krytycznym ograniczeniem. Najpierw uzupełnij brak, dopiero potem wzmacniaj interpretację.",
    hint: "Wybierz oś lub etap rozumowania. Strzałki przełączają fokus.",
  },
  de: {
    stable: "Die stärkste Begrenzung bleibt ausreichend stabil. Die Aussage bleibt quellengebunden.",
    guarded: "Diese Achse begrenzt die Aussagekraft. Öffne sie und prüfe, welche Daten die Konfidenz erhöhen.",
    critical: "Diese Achse ist eine kritische Begrenzung. Zuerst die Lücke schließen, dann die Interpretation vertiefen.",
    hint: "Achse oder Reasoning-Schritt wählen. Pfeiltasten wechseln den Fokus.",
  },
  en: {
    stable: "The strongest limiter remains sufficiently stable. The conclusion stays source-bound.",
    guarded: "This axis limits the conclusion. Open it to see which data can raise confidence.",
    critical: "This axis is a critical limiter. Resolve the gap before strengthening the interpretation.",
    hint: "Choose an axis or reasoning step. Arrow keys move focus.",
  },
} as const;

const durations: Record<UnifiedAuditMode, Record<Pass489MotionTier, number>> = {
  basic: { still: 500, efficient: 2600, full: 3200 },
  pro: { still: 500, efficient: 3400, full: 4200 },
  advanced: { still: 500, efficient: 4300, full: 5200 },
};

const laneStarts = [0, 26, 52, 76] as const;

export function buildPass493NeuralAttentionDirector(
  locale: UnifiedAuditLocale,
  mode: UnifiedAuditMode,
  motionTier: Pass489MotionTier,
  topology: Pass491NeuralConfidenceTopology,
  reasoning: Pass485EvidenceReasoning,
): Pass493NeuralAttentionDirector {
  const c = copy[locale];
  const orderedAxes = [...topology.axes].sort((left, right) => left.score - right.score);
  const focusBand = topology.dominantLimiter.score >= 72
    ? "stable"
    : topology.dominantLimiter.score >= 45
      ? "guarded"
      : "critical";
  const sequence: Pass493AttentionStep[] = reasoning.lanes.map((lane, index) => ({
    id: lane.id,
    label: lane.label,
    headline: lane.headline,
    detail: lane.detail,
    tone: lane.id === "supported"
      ? "supported"
      : lane.id === "tension"
        ? "review"
        : lane.id === "unknown"
          ? "warning"
          : "action",
    evidenceIds: lane.evidenceIds,
    start: laneStarts[index],
    end: index === reasoning.lanes.length - 1 ? 100 : laneStarts[index + 1] - 1,
  }));

  return {
    version: "pass493-neural-attention-director",
    durationMs: durations[mode][motionTier],
    focusAxisId: topology.dominantLimiter.id,
    focusAxisScore: topology.dominantLimiter.score,
    focusBand,
    axisOrder: orderedAxes.map((axis) => axis.id),
    sequence,
    operatorRead: c[focusBand],
    interactionHint: c.hint,
  };
}

export function resolvePass493AttentionStep(
  director: Pass493NeuralAttentionDirector,
  progress: number,
): Pass493AttentionStep {
  return director.sequence.find((step) => progress >= step.start && progress <= step.end)
    ?? director.sequence[director.sequence.length - 1];
}
