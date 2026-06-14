export type Pass597EvidenceSnapshot = {
  id: string;
  reportId?: string;
  symbol: string;
  timestamp: string;
  sourceState: string;
  overallRisk: number;
  confidence: string;
  blockedBy: readonly string[];
};

export type Pass597ReplayFrame = {
  id: string;
  index: number;
  timestamp: string;
  sourceState: string;
  risk: number;
  confidence: string;
  blockers: string[];
  riskDelta: number;
  addedBlockers: string[];
  resolvedBlockers: string[];
  sourceChanged: boolean;
  confidenceChanged: boolean;
  state: "baseline" | "steady" | "changed" | "material";
};

export type Pass597ShieldMapMultiSnapshotReplay = {
  version: "pass597-shield-map-multi-snapshot-replay";
  state: "empty" | "baseline" | "ready" | "identity_rejected";
  identity: string | null;
  frames: Pass597ReplayFrame[];
  rejectedSnapshotIds: string[];
  activeIndex: number;
  materialChanges: number;
  headline: string;
  boundary: string;
};

const normalizeIdentity = (value: string) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9:_/.-]/g, "")
    .slice(0, 96);

const unique = (values: readonly string[]) =>
  Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))).slice(0, 16);

const parseTimestamp = (value: string) => {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
};

export function normalizePass597EvidenceSnapshots(
  value: unknown,
  maxSnapshots = 24,
): Pass597EvidenceSnapshot[] {
  if (!Array.isArray(value)) return [];
  const limit = Math.min(48, Math.max(1, Math.trunc(maxSnapshots)));
  const normalized: Pass597EvidenceSnapshot[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") continue;
    const source = candidate as Record<string, unknown>;
    const id = String(source.id ?? "").trim().slice(0, 160);
    const symbol = normalizeIdentity(String(source.symbol ?? ""));
    const parsedTime = Date.parse(String(source.timestamp ?? ""));
    const risk = Number(source.overallRisk);
    if (!id || !symbol || !Number.isFinite(parsedTime) || !Number.isFinite(risk)) continue;
    normalized.push({
      id,
      reportId: source.reportId == null ? undefined : String(source.reportId).trim().slice(0, 160),
      symbol,
      timestamp: new Date(parsedTime).toISOString(),
      sourceState: String(source.sourceState ?? "unknown").trim().slice(0, 48) || "unknown",
      overallRisk: Math.min(100, Math.max(0, risk)),
      confidence: String(source.confidence ?? "Unknown").trim().slice(0, 48) || "Unknown",
      blockedBy: Array.isArray(source.blockedBy)
        ? unique(source.blockedBy.map((item) => String(item ?? "")))
        : [],
    });
  }
  return normalized.slice(-limit);
}

export function buildPass597ShieldMapMultiSnapshotReplay(input: {
  snapshots: readonly Pass597EvidenceSnapshot[];
  locale?: string;
  maxFrames?: number;
}): Pass597ShieldMapMultiSnapshotReplay {
  const locale = input.locale === "de" || input.locale === "en" ? input.locale : "pl";
  const maxFrames = Math.min(12, Math.max(2, Math.trunc(input.maxFrames ?? 6)));
  const deduped = Array.from(
    new Map(
      normalizePass597EvidenceSnapshots(input.snapshots, 48).map((snapshot) => [snapshot.id, snapshot] as const),
    ).values(),
  ).sort((left, right) => parseTimestamp(left.timestamp) - parseTimestamp(right.timestamp));

  const latest = deduped.at(-1) ?? null;
  const identity = latest ? normalizeIdentity(latest.symbol) : null;
  const accepted = identity
    ? deduped.filter((snapshot) => normalizeIdentity(snapshot.symbol) === identity).slice(-maxFrames)
    : [];
  const rejectedSnapshotIds = identity
    ? deduped.filter((snapshot) => normalizeIdentity(snapshot.symbol) !== identity).map((snapshot) => snapshot.id)
    : [];

  const frames: Pass597ReplayFrame[] = accepted.map((snapshot, index) => {
    const previous = accepted[index - 1] ?? null;
    const blockers = unique(snapshot.blockedBy);
    const previousBlockers = unique(previous?.blockedBy ?? []);
    const addedBlockers = blockers.filter((blocker) => !previousBlockers.includes(blocker));
    const resolvedBlockers = previousBlockers.filter((blocker) => !blockers.includes(blocker));
    const riskDelta = previous ? Math.round(snapshot.overallRisk - previous.overallRisk) : 0;
    const sourceChanged = Boolean(previous && previous.sourceState !== snapshot.sourceState);
    const confidenceChanged = Boolean(previous && previous.confidence !== snapshot.confidence);
    const material = Boolean(previous && (Math.abs(riskDelta) >= 12 || sourceChanged || addedBlockers.length >= 2));
    const changed = Boolean(
      previous &&
        (riskDelta !== 0 || sourceChanged || confidenceChanged || addedBlockers.length || resolvedBlockers.length),
    );
    return {
      id: snapshot.id,
      index,
      timestamp: snapshot.timestamp,
      sourceState: snapshot.sourceState,
      risk: Math.round(snapshot.overallRisk),
      confidence: snapshot.confidence,
      blockers,
      riskDelta,
      addedBlockers,
      resolvedBlockers,
      sourceChanged,
      confidenceChanged,
      state: !previous ? "baseline" : material ? "material" : changed ? "changed" : "steady",
    };
  });

  const state: Pass597ShieldMapMultiSnapshotReplay["state"] =
    frames.length === 0
      ? "empty"
      : rejectedSnapshotIds.length > 0
        ? "identity_rejected"
        : frames.length === 1
          ? "baseline"
          : "ready";
  const materialChanges = frames.filter((frame) => frame.state === "material").length;
  const headline =
    locale === "de"
      ? state === "empty"
        ? "Noch kein verifizierter Snapshot für Replay."
        : state === "baseline"
          ? `${identity}: Basis gespeichert; der nächste identische Lauf aktiviert Replay.`
          : state === "identity_rejected"
            ? `${identity}: Fremde Instrument-Snapshots wurden aus dem Replay ausgeschlossen.`
            : `${identity}: ${frames.length} verifizierte Zustände, ${materialChanges} wesentliche Änderungen.`
      : locale === "en"
        ? state === "empty"
          ? "No verified snapshot is available for replay yet."
          : state === "baseline"
            ? `${identity}: baseline stored; the next matching run unlocks replay.`
            : state === "identity_rejected"
              ? `${identity}: foreign instrument snapshots were excluded from replay.`
              : `${identity}: ${frames.length} verified states, ${materialChanges} material changes.`
        : state === "empty"
          ? "Brak zweryfikowanego snapshotu do replayu."
          : state === "baseline"
            ? `${identity}: zapisano bazę; kolejny przebieg tej samej tożsamości uruchomi replay.`
            : state === "identity_rejected"
              ? `${identity}: snapshoty innego instrumentu zostały odrzucone z replayu.`
              : `${identity}: ${frames.length} zweryfikowanych stanów, ${materialChanges} istotnych zmian.`;

  return {
    version: "pass597-shield-map-multi-snapshot-replay",
    state,
    identity,
    frames,
    rejectedSnapshotIds,
    activeIndex: Math.max(0, frames.length - 1),
    materialChanges,
    headline,
    boundary:
      locale === "de"
        ? "Replay ordnet nur zeitgestempelte Zustände derselben Instrument-Identität; fehlende Historie wird nicht erfunden."
        : locale === "en"
          ? "Replay orders only timestamped states for the same instrument identity; missing history is never invented."
          : "Replay porządkuje wyłącznie timestampowane stany tej samej tożsamości instrumentu; brakująca historia nie jest dopowiadana.",
  };
}
