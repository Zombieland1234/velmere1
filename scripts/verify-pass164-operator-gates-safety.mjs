import { readFileSync, existsSync } from "node:fs";

const files = [
  "lib/launch/operator-launch-gate-matrix.ts",
  "components/launch/OperatorLaunchGateMatrixPanel.tsx",
  "app/[locale]/admin/import-products/page.tsx",
  "VELMERE_PASS164_OPERATOR_LAUNCH_GATES_REPORT.md",
  "VELMERE_PASS164_FULL_PROGRESS_MATRIX.md",
];
const failures = [];
for (const file of files) if (!existsSync(file)) failures.push(`${file} is missing`);

const lib = readFileSync("lib/launch/operator-launch-gate-matrix.ts", "utf8");
const page = readFileSync("app/[locale]/admin/import-products/page.tsx", "utf8");
const panel = readFileSync("components/launch/OperatorLaunchGateMatrixPanel.tsx", "utf8");
const matrix = readFileSync("VELMERE_PASS164_FULL_PROGRESS_MATRIX.md", "utf8");

for (const token of [
  "buildOperatorLaunchGateMatrix",
  "getOperatorLaunchGateSummary",
  "server-audit-write",
  "persistent-storage",
  "idempotent-mutations",
]) {
  if (!lib.includes(token)) failures.push(`operator launch gate lib missing ${token}`);
}

if (!page.includes("OperatorLaunchGateMatrixPanel")) failures.push("admin page does not render OperatorLaunchGateMatrixPanel");
if (!panel.includes("P0") || !panel.includes("nextCriticalStep")) failures.push("operator panel is missing priority/next critical step UI");

for (const area of ["Admin auth / operator gates", "Audit ledger / persistence", "Security / secret redaction", "Provider snapshot / Printful etc."]) {
  if (!matrix.includes(area)) failures.push(`progress matrix missing ${area}`);
}

if (failures.length) {
  console.error("PASS164 operator gate safety failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("PASS164 operator gate safety OK");
