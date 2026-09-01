import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { GET } from "../../app/api/ops/readiness/route";

let assertions = 0;
function check(condition: unknown, message: string) {
  assertions += 1;
  assert.ok(condition, message);
}

const accountSource = fs.readFileSync(
  path.join(process.cwd(), "app/[locale]/account/page.tsx"),
  "utf8",
);
const gateOpen = accountSource.indexOf("<AuthGate>");
const gateClose = accountSource.indexOf("</AuthGate>");
for (const panel of [
  "<DashboardClient />",
  "<ProductionDataBackbonePanel",
  "<StorageAdapterReadinessPanel",
  "<AccountOrderEventTimelinePanel",
]) {
  const position = accountSource.indexOf(panel);
  check(position > gateOpen && position < gateClose, `${panel} must stay inside AuthGate`);
}

const response = await GET();
const text = await response.text();
const body = JSON.parse(text) as Record<string, unknown>;
check(response.status === 423, "public readiness remains an honest pre-release blocker");
check(response.headers.get("cache-control")?.includes("no-store"), "public readiness must not be cached");
check(response.headers.get("x-robots-tag")?.includes("noindex"), "public readiness must not be indexed");
check(body.ok === false, "public readiness must not claim success");
check(body.status === "pre_release_no_go", "public readiness must expose only the coarse status");
check(!("snapshot" in body), "public readiness must not expose the internal snapshot");
check(!("telemetryPreview" in body), "public readiness must not expose internal telemetry preview");
for (const sensitive of [
  "database adapter",
  "RLS",
  "operator identity",
  "retention policy",
  "write transaction",
  "source ledger persistence",
]) {
  check(!text.toLowerCase().includes(sensitive.toLowerCase()), `public readiness leaked ${sensitive}`);
}

console.log(JSON.stringify({ status: "PASS", assertions }));
