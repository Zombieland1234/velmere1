#!/usr/bin/env python3
import hashlib, json, os, subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
COMMANDS = [
  ("runtime", ["node", "--experimental-strip-types", "--import", "./scripts/pass11/register-offline-ts-loader.mjs", "./scripts/p97/test-p97-browser-basic-durable-pdf-runtime.mjs"], {"VELMERE_OFFLINE_TS_FORCE_BUILTIN":"1"}, ["receipts/p97/P97_BROWSER_BASIC_DURABLE_PDF_RUNTIME.json", "artifacts/p97/P97_BROWSER_BASIC_DURABLE_PDF_RUNTIME.json"]),
  ("static", ["python", "scripts/p97/test-p97-browser-basic-durable-pdf-static.py"], {}, ["receipts/p97/P97_BROWSER_BASIC_DURABLE_PDF_STATIC.json", "artifacts/p97/P97_BROWSER_BASIC_DURABLE_PDF_STATIC.json"]),
  ("reachability", ["node", "--experimental-strip-types", "--import", "./scripts/pass11/register-offline-ts-loader.mjs", "./scripts/p97/test-p97-changed-module-reachability.mjs"], {"VELMERE_OFFLINE_TS_FORCE_BUILTIN":"1"}, ["receipts/p97/P97_CHANGED_MODULE_REACHABILITY.json", "artifacts/p97/P97_CHANGED_MODULE_REACHABILITY.json"]),
  ("targeted_typescript", ["python", "scripts/p97/test-p97-targeted-typescript.py"], {}, ["receipts/p97/P97_TARGETED_STRICT_TYPESCRIPT.json", "artifacts/p97/P97_TARGETED_STRICT_TYPESCRIPT.json"]),
  ("twenty_row_map", ["node", "--experimental-strip-types", "--import", "./scripts/pass11/register-offline-ts-loader.mjs", "./scripts/p97/build-p97-20-row-final-distance-map.mjs"], {"VELMERE_OFFLINE_TS_FORCE_BUILTIN":"1"}, ["receipts/p97/P97_CURRENT_20_ROW_FINAL_DISTANCE_MAP.json", "artifacts/closure/p97r1/P97R1_CURRENT_20_ROW_FINAL_DISTANCE_MAP.json"]),
]
def sha(path): return "sha256:" + hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
rows=[]
logs=ROOT/"artifacts/p97/logs/repeatability"; logs.mkdir(parents=True,exist_ok=True)
for name,command,extra_env,files in COMMANDS:
  iteration=[]
  for run in (1,2):
    env=os.environ.copy(); env.update(extra_env)
    proc=subprocess.run(command,cwd=ROOT,env=env,text=True,capture_output=True)
    (logs/f"{name}_{run}.log").write_text(proc.stdout+proc.stderr,encoding="utf-8")
    hashes={path:sha(path) for path in files if (ROOT/path).is_file()}
    iteration.append({"run":run,"exitCode":proc.returncode,"hashes":hashes})
  same=iteration[0]["exitCode"]==0 and iteration[1]["exitCode"]==0 and iteration[0]["hashes"]==iteration[1]["hashes"] and len(iteration[0]["hashes"])==len(files)
  rows.append({"id":name,"status":"PASS" if same else "FAIL","runs":iteration})
failed=[row for row in rows if row["status"]!="PASS"]
receipt={
 "schemaVersion":"velmere.p97.repeatability.v1",
 "generatedAt":"2026-08-21T08:00:00.000Z",
 "status":"PASS_5_COMMANDS_EACH_2_OF_2_BYTE_IDENTICAL" if not failed else "FAIL",
 "checks":{"total":len(rows),"passed":len(rows)-len(failed),"failed":len(failed),"rows":rows},
 "truthBoundary":"Byte-identical repeatability of five bounded P97 local commands and their declared receipts. It does not prove deterministic whole-project builds, Browser rendering, Supabase, external providers, exact Windows or Customer FINAL."
}
text=json.dumps(receipt,indent=2)+"\n"
for rel in ["receipts/p97/P97_REPEATABILITY.json","artifacts/closure/p97r1/P97R1_REPEATABILITY.json"]:
 p=ROOT/rel; p.parent.mkdir(parents=True,exist_ok=True); p.write_text(text,encoding="utf-8")
print(json.dumps(receipt))
raise SystemExit(1 if failed else 0)
