#!/usr/bin/env python3
import json, os, shutil, socket, subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
STAGING_VARS = [
  "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY", "DATABASE_URL", "POSTGRES_URL",
  "POSTGRES_PRISMA_URL", "POSTGRES_URL_NON_POOLING",
]
TOOL_NAMES = ["psql", "pg_isready", "supabase", "docker", "podman"]
configured = [name for name in STAGING_VARS if str(os.environ.get(name, "")).strip()]
tools = {name: shutil.which(name) for name in TOOL_NAMES}
node_modules = (ROOT / "node_modules").is_dir()
package_lock = (ROOT / "package-lock.json").is_file()
package_json = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
try:
  node_version = subprocess.check_output(["node", "--version"], text=True, timeout=5).strip()
except Exception as error:
  node_version = f"unavailable:{type(error).__name__}"
try:
  npm_version = subprocess.check_output(["npm", "--version"], text=True, timeout=5).strip()
except Exception as error:
  npm_version = f"unavailable:{type(error).__name__}"
try:
  dns = subprocess.run(["getent", "hosts", "registry.npmjs.org"], capture_output=True, text=True, timeout=5)
  registry_dns = {"exitCode": dns.returncode, "resolved": dns.returncode == 0 and bool(dns.stdout.strip()), "outputPresent": bool(dns.stdout.strip())}
except Exception as error:
  registry_dns = {"exitCode": None, "resolved": False, "error": type(error).__name__}

staging_available = bool(configured) and bool(tools.get("psql") or tools.get("supabase"))
exact_dependency_available = node_modules
status = "EXTERNAL_BLOCKER_CONFIRMED" if not staging_available else "AUTHORIZED_STAGING_CAPABILITY_PRESENT"
receipt = {
  "schemaVersion": "velmere.p97.external-blocker-confirmation.v1",
  "generatedAt": "2026-08-21T08:00:00.000Z",
  "status": status,
  "authorizedStaging": {
    "availableInCurrentExecutionEnvironment": staging_available,
    "configuredCredentialVariableNames": configured,
    "missingCredentialVariableNames": [name for name in STAGING_VARS if name not in configured],
    "toolAvailability": {name: bool(path) for name, path in tools.items()},
    "rawCredentialValuesRecorded": False,
    "classification": "EXTERNAL_BLOCKER_CONFIRMED" if not staging_available else "AVAILABLE",
    "scope": "Risk Indicator migrations P91/P93/P94, RLS/JWT, rollback/concurrency and deployed HTTP cannot be executed from this environment without authorized staging credentials and an execution client.",
  },
  "exactEngineeringEnvironment": {
    "currentNode": node_version,
    "currentNpm": npm_version,
    "requiredByPackageDevEngines": package_json.get("devEngines"),
    "packageLockPresent": package_lock,
    "nodeModulesPresent": node_modules,
    "registryDns": registry_dns,
    "classification": "EXTERNAL_BLOCKER_CONFIRMED" if not exact_dependency_available else "AVAILABLE",
  },
  "workstreamDecision": {
    "riskHistoryLocalPolishing": "STOPPED_AFTER_P96",
    "selectedIndependentRow": "browser-basic",
    "reason": "Authorized staging and exact dependency/runtime proof are unavailable. Browser Basic had a production-reachable artifact-integrity defect that could be repaired and tested without imitating staging.",
  },
  "zeroFakeCredit": {
    "stagingExecuted": False,
    "postgresExecuted": False,
    "supabaseExecuted": False,
    "rlsExecuted": False,
    "jwtExecuted": False,
    "browserExecuted": False,
    "wholeProjectTypeScript": False,
    "exactWindows": False,
    "customerFinalNumeratorDelta": 0,
  },
  "truthBoundary": "Confirms only that authorized staging credentials/tools and the exact dependency graph are unavailable in this execution environment. It does not prove that the owner's external staging does not exist, is unhealthy, or cannot be used elsewhere.",
}
text = json.dumps(receipt, indent=2) + "\n"
for rel in ["receipts/p97/P97_EXTERNAL_BLOCKER_CONFIRMED.json", "artifacts/closure/p97r1/P97R1_EXTERNAL_BLOCKER_CONFIRMED.json"]:
  p = ROOT / rel; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(text, encoding="utf-8")
print(json.dumps(receipt))
if status != "EXTERNAL_BLOCKER_CONFIRMED":
  raise SystemExit(2)
