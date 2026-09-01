#!/usr/bin/env python3
from __future__ import annotations
import json, os, shutil, subprocess, sys, tempfile, time
from pathlib import Path
from typing import Any

ROOT = Path.cwd().resolve()
REVISION_ID = "VELMERE_PASS36_A88R1_SEMANTIC_GENERALIZATION_ROUTE_EXECUTION_PRIVACY_AND_PDF_EVIDENCE_RETENTION"
COMMAND_TIMEOUT_SECONDS = 360
MAX_OUTPUT_BYTES = 64 * 1024 * 1024
BATCH_SIZE = 4

COMMANDS: tuple[tuple[str, tuple[str, ...], bool], ...] = (
    ("a58_release_integrity_first", ("scripts/pass36/verify-a58-release-integrity.mjs",), True),
    ("source_package_self_audit", ("scripts/pass35/test-source-package-self-verification.mjs",), False),
    ("a88r1_descendant", ("scripts/pass36/verify-a88r1-current-root-descendant.mjs",), False),
    ("a88r1_verifier", ("--import", "./scripts/pass11/register-offline-ts-loader.mjs", "scripts/pass36/verify-a88r1-semantic-route-privacy-pdf.ts"), False),
    ("a88r1_route_preflight", ("--import", "./scripts/pass11/register-offline-ts-loader.mjs", "scripts/pass36/test-a88r1-route-preflight.ts"), False),
    ("a88r1_pdf_summary", ("scripts/pass36/verify-a88r1-pdf-evidence-summary.mjs",), False),
    ("a37_performance_runtime", ("--experimental-strip-types", "scripts/pass36/run-a88-top-level-module-force-exit.mjs", "scripts/pass35/test-a37-visual-runtime-performance.mjs"), False),
    ("a38_lifecycle_payload", ("--expose-gc", "--experimental-strip-types", "scripts/pass36/run-a88-top-level-module-force-exit.mjs", "scripts/pass35/test-a38-client-runtime-lifecycle.mjs"), False),
    ("a39_runtime_css_a11y", ("--experimental-strip-types", "scripts/pass36/run-a88-top-level-module-force-exit.mjs", "scripts/pass35/test-a39-runtime-binding-css.mjs"), False),
    ("a40_session_temporal_visibility", ("--experimental-strip-types", "scripts/pass36/run-a88-top-level-module-force-exit.mjs", "scripts/pass35/test-a40-session-temporal-visibility.mjs"), False),
    ("a41_route_runtime_recovery", ("scripts/pass35/test-a41-browser-shield-runtime-recovery.mjs",), False),
    ("a59_build_route_css_budgets", ("scripts/pass36/verify-a59-build-graph-route-css-budget-recovery.mjs",), False),
    ("a46_data_plane", ("scripts/pass35/test-a46-customer-data-plane-acceptance.mjs",), False),
    ("a57_acceptance", ("scripts/pass35/test-a57-controlled-canary-kill-switch-rollback-telemetry-acceptance.mjs",), False),
    ("route_dispatch", ("scripts/pass15/verify-route-dispatch-consolidation.mjs",), False),
    ("current_status", ("scripts/pass35/test-current-status-register.mjs",), False),
    ("static_control_plane", ("scripts/pass35/verify-control-plane.mjs",), False),
    ("product_tiers", ("scripts/pass35/test-product-tier-content-contract.mjs",), False),
    ("zero_budget", ("scripts/pass35/test-zero-budget-functional-roadmap.mjs",), False),
    ("source_audit", ("scripts/a44-source-integrity-audit.mjs",), False),
)

def parse_json_status(text: str):
    try: value = json.loads(text)
    except json.JSONDecodeError: return None, None
    if not isinstance(value, dict): return None, None
    status = value.get("status")
    return value, status if isinstance(status, str) else None

def run_command(node: str, identifier: str, args: tuple[str, ...], parse_a58: bool) -> dict[str, Any]:
    started = time.monotonic(); environment = os.environ.copy(); environment["VELMERE_A88R1_CLEAN_UNPACK_SEQUENCE"] = "1"
    try:
        completed = subprocess.run([node, *args], cwd=ROOT, env=environment, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=False, timeout=COMMAND_TIMEOUT_SECONDS, check=False, text=True, encoding="utf-8", errors="replace", start_new_session=(os.name != "nt"))
        stdout, stderr, exit_code = completed.stdout or "", completed.stderr or "", completed.returncode
        error_code = None
    except subprocess.TimeoutExpired as error:
        stdout, stderr, exit_code, error_code = error.stdout or "", error.stderr or "", None, "ETIMEDOUT"
        if isinstance(stdout, bytes): stdout = stdout.decode("utf-8", "replace")
        if isinstance(stderr, bytes): stderr = stderr.decode("utf-8", "replace")
    except OSError as error:
        stdout, stderr, exit_code, error_code = "", "", None, f"SPAWN:{error.__class__.__name__}:{error}"
    stdout_bytes, stderr_bytes = len(stdout.encode()), len(stderr.encode())
    if stdout_bytes > MAX_OUTPUT_BYTES: error_code = error_code or "STDOUT_MAX_OUTPUT_BYTES"
    if stderr_bytes > MAX_OUTPUT_BYTES: error_code = error_code or "STDERR_MAX_OUTPUT_BYTES"
    parsed, status = parse_json_status(stdout)
    passed = exit_code == 0 and error_code is None
    if parse_a58:
        passed = bool(passed and parsed and parsed.get("status") == "PASS_RELEASE_INTEGRITY_NO_PROMOTION" and parsed.get("summary",{}).get("blockingFailed") == 0)
    return {"id":identifier,"passed":passed,"exitCode":exit_code,"timedOut":error_code=="ETIMEDOUT","errorCode":error_code,"elapsedMs":round((time.monotonic()-started)*1000),"stdoutBytes":stdout_bytes,"stderrBytes":stderr_bytes,"status":status,"failureTail":None if passed else f"{stderr}\n{stdout}"[-5000:]}

def create_state_file() -> Path:
    fd, raw = tempfile.mkstemp(prefix="velmere-a88r1-clean-state-", suffix=".json"); os.close(fd); p=Path(raw); os.chmod(p,0o600); p.write_text(json.dumps({"next":0,"results":[]}),"utf-8"); return p

def read_state(p:Path):
    v=json.loads(p.read_text("utf-8"))
    if not isinstance(v,dict) or v.get("next") != len(v.get("results",[])): raise RuntimeError("a88r1_clean_state_invalid")
    return v

def write_state(p:Path,v):
    t=p.with_suffix(f".{os.getpid()}.tmp"); t.write_text(json.dumps(v,separators=(",",":")),"utf-8"); os.chmod(t,0o600); os.replace(t,p)

def report(results):
    failures=[r for r in results if not r["passed"]]
    return {"schemaVersion":"velmere.pass36.a88r1.clean-unpack-sequence.v1","revisionId":REVISION_ID,"status":"FAIL_A88R1_CLEAN_UNPACK_SEQUENCE" if failures else "PASS_A88R1_CLEAN_UNPACK_SEQUENCE_NO_PROMOTION","requiredOrder":["A58_EXACT_PATH_SET_FIRST","A88R1_AND_RETAINED_REGRESSIONS_AFTER_A58"],"processBoundary":{"nodeBridge":"ASYNC_SPAWN_BOUNDED_OUTPUT_TIMEOUT_EXPLICIT_EXIT","pythonBatches":"SELF_REEXECUTING_BOUNDED_SUBPROCESS_RUN","shell":False,"batchSize":BATCH_SIZE,"commandTimeoutSeconds":COMMAND_TIMEOUT_SECONDS},"checks":len(results),"passed":sum(r["passed"] for r in results),"failed":len(failures),"results":results,"realEvalCasesVerified":0,"legalRegulatoryDecisionsSigned":0,"stagingProven":False,"liveProven":False,"saleEnabled":False,"truthBoundary":"This verifies safe clean-unpack ordering and local regressions only. It does not establish exact runtime, provider rights, legal approval, real model quality, customer value, LIVE or sale readiness."}

def main():
    if not (ROOT/"_velmere/PASS35_SOURCE_ONLY_MANIFEST.json").is_file(): raise RuntimeError("a88r1_clean_unpack_package_manifest_required")
    node=shutil.which("node")
    if not node: raise RuntimeError("a88r1_clean_unpack_node_not_found")
    if len(sys.argv)==3 and sys.argv[1]=="--state":
        state_path=Path(sys.argv[2]).resolve()
        if not state_path.is_file() or ROOT in state_path.parents: raise RuntimeError("a88r1_clean_state_path_invalid")
    elif len(sys.argv)==1: state_path=create_state_file()
    else: raise RuntimeError("a88r1_clean_arguments_invalid")
    state=read_state(state_path); failures=[r for r in state["results"] if not r.get("passed")]
    if not failures:
        for index in range(state["next"], min(len(COMMANDS), state["next"]+BATCH_SIZE)):
            identifier,args,parse_a58=COMMANDS[index]; result=run_command(node,identifier,args,parse_a58); state["results"].append(result); state["next"]=index+1; write_state(state_path,state)
            if not result["passed"]: failures.append(result); break
    if not failures and state["next"]<len(COMMANDS):
        env=os.environ.copy(); env["PYTHONUNBUFFERED"]="1"; os.execve(sys.executable,[sys.executable,str(Path(__file__).resolve()),"--state",str(state_path)],env)
    out=report(state["results"])
    try: state_path.unlink()
    except OSError: pass
    print(json.dumps(out,indent=2,ensure_ascii=False)); return 1 if out["failed"] else 0

if __name__=="__main__": raise SystemExit(main())
