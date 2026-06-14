import { adminRouteGateMatrix, getAdminRouteGateSummary } from "./admin-route-gate";
import { adminAuditPersistenceMatrix, getAdminAuditPersistenceSummary } from "./admin-audit-persistence";
import { getAdminAuditServerGate } from "./admin-audit-write-contract";
import { getAdminSessionPreviewFromEnv } from "./admin-auth-session-guard";

export type OperatorLaunchGateStatus = "ready" | "partial" | "blocked" | "manual_review";

export type OperatorLaunchGateItem = {
  id: string;
  label: string;
  status: OperatorLaunchGateStatus;
  progress: number;
  priority: "P0" | "P1" | "P2";
  surface: "admin" | "audit" | "source" | "security";
  promise: string;
  blocker: string;
  nextStep: string;
};

function statusFromProgress(progress: number, hardBlocked = true): OperatorLaunchGateStatus {
  if (progress >= 85) return "ready";
  if (progress >= 58) return "partial";
  return hardBlocked ? "blocked" : "manual_review";
}

export function buildOperatorLaunchGateMatrix(): OperatorLaunchGateItem[] {
  const routeSummary = getAdminRouteGateSummary();
  const auditSummary = getAdminAuditPersistenceSummary();
  const serverGate = getAdminAuditServerGate();
  const sessionPreview = getAdminSessionPreviewFromEnv();
  const serverReady = serverGate.enabled && serverGate.hasAuthContext && serverGate.hasStorage;
  const serverMissing = [
    !serverGate.enabled ? "server gate disabled" : null,
    !serverGate.hasAuthContext ? "auth context missing" : null,
    !serverGate.hasStorage ? "durable storage missing" : null,
  ].filter((item): item is string => Boolean(item));
  const adminAuth = adminRouteGateMatrix.find((item) => item.id === "admin-auth");
  const envGate = adminRouteGateMatrix.find((item) => item.id === "environment-gate");
  const publishGate = adminRouteGateMatrix.find((item) => item.id === "publish-permission");
  const storage = adminAuditPersistenceMatrix.find((item) => item.id === "storage-adapter");
  const operatorContext = adminAuditPersistenceMatrix.find((item) => item.id === "operator-context");
  const idempotency = adminAuditPersistenceMatrix.find((item) => item.id === "idempotent-write");
  const sourceSnapshot = adminAuditPersistenceMatrix.find((item) => item.id === "source-snapshot");

  return [
    {
      id: "operator-auth",
      label: "Operator identity gate",
      status: statusFromProgress(adminAuth?.progress ?? routeSummary.averageProgress),
      progress: adminAuth?.progress ?? routeSummary.averageProgress,
      priority: "P0",
      surface: "admin",
      promise: "Every admin/import/write action must be tied to a real operator identity and permission scope.",
      blocker: adminAuth?.blockers.join(" · ") ?? "auth provider · admin role · session expiry",
      nextStep: adminAuth?.nextStep ?? routeSummary.nextCriticalStep,
    },
    {
      id: "environment-kill-switch",
      label: "Environment and kill switch",
      status: statusFromProgress(envGate?.progress ?? 30),
      progress: envGate?.progress ?? 30,
      priority: "P0",
      surface: "security",
      promise: "Admin tools are disabled unless the deployment environment and operator gate explicitly allow them.",
      blocker: envGate?.blockers.join(" · ") ?? "environment gate · kill switch",
      nextStep: envGate?.nextStep ?? "Bind environment lock to server-side gate before launch.",
    },
    {
      id: "server-audit-write",
      label: "Server audit write",
      status: serverReady ? "partial" : "blocked",
      progress: serverReady ? 62 : 40,
      priority: "P0",
      surface: "audit",
      promise: "Audit writes must be server-side and return a locked preview when auth/storage is incomplete.",
      blocker: serverMissing.join(" · ") || "storage / auth still incomplete",
      nextStep: "Connect audit write contract to durable storage and operator session.",
    },
    {
      id: "persistent-storage",
      label: "Persistent ledger storage",
      status: statusFromProgress(storage?.progress ?? auditSummary.averageProgress),
      progress: storage?.progress ?? auditSummary.averageProgress,
      priority: "P0",
      surface: "audit",
      promise: "Import, publish, overwrite and evidence events survive refresh/deploy and can be reviewed later.",
      blocker: storage?.blockers.join(" · ") ?? "database · retention policy",
      nextStep: storage?.nextStep ?? auditSummary.nextCriticalStep,
    },
    {
      id: "operator-context",
      label: "Operator context envelope",
      status: statusFromProgress(operatorContext?.progress ?? 20),
      progress: operatorContext?.progress ?? 20,
      priority: "P0",
      surface: "admin",
      promise: "Every record contains operator id, role snapshot, permission scope and reauth timestamp.",
      blocker: operatorContext?.blockers.join(" · ") ?? "operator context",
      nextStep: operatorContext?.nextStep ?? "Bind audit envelope to server auth session.",
    },
    {
      id: "idempotent-mutations",
      label: "Idempotent mutation guard",
      status: statusFromProgress(idempotency?.progress ?? 35),
      progress: idempotency?.progress ?? 35,
      priority: "P0",
      surface: "audit",
      promise: "Retries do not duplicate import/publish events or corrupt product state.",
      blocker: idempotency?.blockers.join(" · ") ?? "idempotency key · duplicate handling",
      nextStep: idempotency?.nextStep ?? "Persist idempotency keys with target and result state.",
    },
    {
      id: "publish-hard-gate",
      label: "Publish hard gate",
      status: statusFromProgress(publishGate?.progress ?? 35),
      progress: publishGate?.progress ?? 35,
      priority: "P1",
      surface: "admin",
      promise: "No product becomes public until provider truth, shipping/returns truth and legal copy checks pass.",
      blocker: publishGate?.blockers.join(" · ") ?? "truth checklist · provider snapshot",
      nextStep: publishGate?.nextStep ?? "Make truth checklist a server-side blocker.",
    },
    {
      id: "redacted-source-snapshot",
      label: "Redacted source snapshot",
      status: sourceSnapshot?.status ?? "manual_review",
      progress: sourceSnapshot?.progress ?? 34,
      priority: "P1",
      surface: "source",
      promise: "Source snapshots are saved in an allowlisted/redacted format without raw secrets or private payloads.",
      blocker: sourceSnapshot?.blockers.join(" · ") ?? "allowlist · redaction proof",
      nextStep: sourceSnapshot?.nextStep ?? "Define source snapshot allowlist.",
    },
    {
      id: "session-preview",
      label: "Session preview honesty",
      status: sessionPreview.authenticated ? "partial" : "blocked",
      progress: sessionPreview.authenticated ? 58 : 26,
      priority: "P1",
      surface: "security",
      promise: "The UI tells operators when they are in preview/locked mode instead of pretending production auth is ready.",
      blocker: sessionPreview.authenticated ? "session is preview only" : "authenticated session missing",
      nextStep: "Replace preview session with real server auth provider and role checks.",
    },
  ];
}

export function getOperatorLaunchGateSummary() {
  const matrix = buildOperatorLaunchGateMatrix();
  const total = matrix.length;
  const averageProgress = Math.round(matrix.reduce((sum, item) => sum + item.progress, 0) / total);
  const p0Blocked = matrix.filter((item) => item.priority === "P0" && item.status !== "ready").length;
  const blocked = matrix.filter((item) => item.status === "blocked").length;
  const nextCriticalStep = matrix.find((item) => item.priority === "P0" && item.status !== "ready")?.nextStep ?? matrix.find((item) => item.status !== "ready")?.nextStep ?? "Operator gate matrix is clear.";
  return { total, averageProgress, p0Blocked, blocked, nextCriticalStep };
}
