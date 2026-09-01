#!/usr/bin/env python3
import hashlib, json, platform, subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
config = ROOT / "tsconfig.p97-browser-pdf-policy-targeted.json"
proc = subprocess.run(["tsc", "-p", config.name, "--pretty", "false"], cwd=ROOT, text=True, capture_output=True)
output = (proc.stdout + proc.stderr).replace(str(ROOT), "<ROOT>")
log = ROOT / "artifacts/p97/logs/01_P97_TARGETED_TYPESCRIPT.log"
log.parent.mkdir(parents=True, exist_ok=True)
log.write_text(output, encoding="utf-8")
row = {
  "id": config.name,
  "status": "PASS" if proc.returncode == 0 else "FAIL",
  "exitCode": proc.returncode,
  "configSha256": "sha256:" + hashlib.sha256(config.read_bytes()).hexdigest(),
  "diagnostic": output[:4000],
}
receipt = {
  "schemaVersion": "velmere.p97.targeted-strict-typescript.v1",
  "generatedAt": "2026-08-21T08:00:00.000Z",
  "status": "PASS_BOUNDED_TARGETED_STRICT_TYPESCRIPT" if proc.returncode == 0 else "FAIL",
  "checks": {"total": 1, "passed": 1 if proc.returncode == 0 else 0, "failed": 0 if proc.returncode == 0 else 1, "rows": [row]},
  "environment": {"typescript": subprocess.check_output(["tsc", "--version"], text=True).strip(), "python": platform.python_version(), "platform": platform.platform()},
  "zeroFakeCredit": {"wholeProjectSemanticTypeScript": False, "eslint": False, "webpackBuild": False, "turbopackBuild": False, "exactWindows": False, "customerFinal": "0/20"},
  "truthBoundary": "Strict TypeScript covers only the new P97 Browser PDF durable policy under bounded ambient declarations. The changed route is separately imported/transpiled. This does not prove the complete dependency graph, whole-project semantic TypeScript, lint, production builds or exact Windows.",
}
text = json.dumps(receipt, indent=2) + "\n"
for rel in ["receipts/p97/P97_TARGETED_STRICT_TYPESCRIPT.json", "artifacts/p97/P97_TARGETED_STRICT_TYPESCRIPT.json"]:
  target = ROOT / rel; target.parent.mkdir(parents=True, exist_ok=True); target.write_text(text, encoding="utf-8")
print(json.dumps(receipt))
raise SystemExit(proc.returncode)
