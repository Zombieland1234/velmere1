#!/usr/bin/env python3
from __future__ import annotations

import pathlib
import sys

path = pathlib.Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

old_normalize = '''def normalize_dataset_path(raw: str) -> str:
    raw = raw.strip().split(" [MOVED TO:", 1)[0].strip()
    if raw.startswith("./"):
        raw = raw[2:]
    if raw.startswith("access_control/"):
        raw = "dataset/" + raw
    return raw
'''
new_normalize = '''def normalize_dataset_path(raw: str) -> str:
    raw = raw.strip()
    moved = re.search(r"\\[MOVED TO:\\s*(\\./)?([^\\]]+)\\]", raw)
    if moved:
        raw = moved.group(2).strip()
        if not raw.startswith("dataset/"):
            raw = "dataset/" + raw
        return raw
    raw = raw.split(" [MOVED TO:", 1)[0].strip()
    if raw.startswith("./"):
        raw = raw[2:]
    if not raw.startswith("dataset/"):
        raw = "dataset/" + raw
    return raw
'''

old_install = '''def install_compilers(cases: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    versions = sorted({row["compilerVersion"] for row in cases if row["compilerVersion"]})
    result: dict[str, dict[str, Any]] = {}
    for version in versions:
        install = run(["solc-select", "install", version], cwd=ROOT, timeout=600)
        result[version] = {"installExitCode": install["exitCode"], "installTimedOut": install["timedOut"], "stdoutSha256": sha256_bytes(install["stdout"]), "stderrSha256": sha256_bytes(install["stderr"])}
    return result
'''
new_install = '''def install_compilers(cases: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    versions = sorted({row["compilerVersion"] for row in cases if row["compilerVersion"]})
    bin_dir = pathlib.Path(os.environ.get("VELMERE_SOLC_BIN_DIR", "")).resolve()
    manifest_path = bin_dir / "SOLC_BINARY_MANIFEST.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.is_file() else {"versions": {}}
    result: dict[str, dict[str, Any]] = {}
    for version in versions:
        row = manifest.get("versions", {}).get(version, {})
        binary = bin_dir / f"solc-{version}"
        available = binary.is_file() and row.get("sha256") == sha256_file(binary)
        result[version] = {
            "status": "AVAILABLE_NATIVE_HASH_VERIFIED" if available else row.get("status", "BLOCKED_NATIVE_ARTIFACT_UNAVAILABLE"),
            "available": available,
            "path": str(binary) if available else None,
            "sha256": sha256_file(binary) if available else None,
            "manifest": row,
        }
    return result
'''

old_use = '''def use_compiler(version: str) -> dict[str, Any]:
    selected = run(["solc-select", "use", version], cwd=ROOT, timeout=120)
    version_result = run(["solc", "--version"], cwd=ROOT, timeout=60)
    return {"selectExitCode": selected["exitCode"], "versionExitCode": version_result["exitCode"], "versionOutput": (version_result["stdout"]+version_result["stderr"]).decode("utf-8","replace")[:1024], "solcPath": str(pathlib.Path(shutil.which("solc") or "").resolve())}
'''
new_use = '''def use_compiler(version: str) -> dict[str, Any]:
    bin_dir = pathlib.Path(os.environ.get("VELMERE_SOLC_BIN_DIR", "")).resolve()
    binary = bin_dir / f"solc-{version}"
    if not binary.is_file():
        return {"selectExitCode": None, "versionExitCode": None, "versionOutput": "", "selectedExact": False, "solcPath": None, "status": "BLOCKED_NATIVE_ARTIFACT_UNAVAILABLE"}
    version_result = run([str(binary), "--version"], cwd=ROOT, timeout=60)
    version_output = (version_result["stdout"]+version_result["stderr"]).decode("utf-8","replace")[:1024]
    selected_exact = version_result["exitCode"] == 0 and version in version_output
    return {"selectExitCode": 0 if selected_exact else 1, "versionExitCode": version_result["exitCode"], "versionOutput": version_output, "selectedExact": selected_exact, "solcPath": str(binary), "solcSha256": sha256_file(binary), "status": "AVAILABLE_NATIVE_HASH_VERIFIED" if selected_exact else "NATIVE_BINARY_VERSION_MISMATCH"}
'''

old_process = '''    compile_run = run(["solc", "--bin", str(source_copy)], cwd=case_dir, timeout=180)
    slither_json = case_dir / "slither.json"
    slither_run = run(["slither", str(source_copy), "--solc", compiler["solcPath"], "--json", str(slither_json), "--disable-color"], cwd=case_dir, timeout=300)
    slither = sanitize_slither(slither_json)
'''
new_process = '''    if compiler["selectedExact"]:
        compile_run = run([compiler["solcPath"], "--bin", str(source_copy)], cwd=case_dir, timeout=180)
        slither_json = case_dir / "slither.json"
        slither_run = run(["slither", str(source_copy), "--solc", compiler["solcPath"], "--json", str(slither_json), "--disable-color"], cwd=case_dir, timeout=300)
        slither = sanitize_slither(slither_json)
    else:
        compile_run = {"exitCode": None, "timedOut": False, "stdout": b"", "stderr": b"compiler_native_artifact_unavailable"}
        slither_run = {"exitCode": None, "timedOut": False, "stdout": b"", "stderr": b"compiler_native_artifact_unavailable"}
        slither = {"jsonPresent": False, "detectors": [], "skippedReason": compiler.get("status", "compiler_native_artifact_unavailable")}
'''

old_controls = '''    use_compiler("0.8.24")
    rows = []
'''
new_controls = '''    control_compiler = use_compiler("0.8.24")
    if not control_compiler["selectedExact"]:
        raise RuntimeError("exact 0.8.24 control compiler unavailable")
    rows = []
'''
old_control_slither = '''        slither_run = run(["slither", str(path), "--json", str(slither_json), "--disable-color"], cwd=controls_root, timeout=300)
'''
new_control_slither = '''        slither_run = run(["slither", str(path), "--solc", control_compiler["solcPath"], "--json", str(slither_json), "--disable-color"], cwd=controls_root, timeout=300)
'''

for old, new, label in (
    (old_normalize, new_normalize, "normalize"),
    (old_install, new_install, "install_compilers"),
    (old_use, new_use, "use_compiler"),
    (old_process, new_process, "process_case"),
    (old_controls, new_controls, "controls_compiler"),
    (old_control_slither, new_control_slither, "controls_slither"),
):
    if old not in text:
        raise SystemExit(f"expected patch target missing: {label}")
    text = text.replace(old, new, 1)

start = text.index("SEMGREP_RULES = r'''")
end = text.index("'''", start + len("SEMGREP_RULES = r'''"))
block = text[start:end]
block = block.replace("\\\\", "\\")
text = text[:start] + block + text[end:]

old_summary = '''    summary = {"status":"PASS_EXTERNAL_BASELINE_EXECUTED", "cases":len(cases), "labelInstances":total_label_instances, "compileSuccess":compile_success, "contractAnyLabelRecall":ledger["metrics"]["contractAnyLabelRecall"], "contractAllLabelsRecall":ledger["metrics"]["contractAllLabelRecall"], "labelInstanceRecall":ledger["metrics"]["labelInstanceRecall"], "controls":len(controls), "flaggedControls":flagged_controls, "controlFlagRate":ledger["metrics"]["controlFlagRate"], "ledgerSha256":sha256_file(ledger_path)}
'''
if old_summary not in text:
    old_summary = '''    summary = {"status":"PASS_EXTERNAL_BASELINE_EXECUTED", "cases":len(cases), "labelInstances":total_label_instances, "compileSuccess":compile_success, "contractAnyLabelRecall":ledger["metrics"]["contractAnyLabelRecall"], "contractAllLabelsRecall":ledger["metrics"]["contractAllLabelsRecall"], "labelInstanceRecall":ledger["metrics"]["labelInstanceRecall"], "controls":len(controls), "flaggedControls":flagged_controls, "controlFlagRate":ledger["metrics"]["controlFlagRate"], "ledgerSha256":sha256_file(ledger_path)}
'''
new_summary = '''    legacy_blocked = sum(1 for row in receipts if row["compiler"].get("status") == "BLOCKED_NATIVE_ARTIFACT_UNAVAILABLE")
    status = "PASS_EXTERNAL_BASELINE_EXECUTED_WITH_BLOCKED_LEGACY_NATIVE_COMPILERS" if compile_success > 0 and semgrep_success == len(cases) else "ACTION_REQUIRED_EXTERNAL_BASELINE_INSUFFICIENT_EXECUTION"
    summary = {"status":status, "cases":len(cases), "labelInstances":total_label_instances, "compileSuccess":compile_success, "slitherSanitizedResults":slither_json_success, "semgrepSanitizedResults":semgrep_success, "legacyNativeCompilerBlockedCases":legacy_blocked, "contractAnyLabelRecall":ledger["metrics"]["contractAnyLabelRecall"], "contractAllLabelsRecall":ledger["metrics"]["contractAllLabelsRecall"], "labelInstanceRecall":ledger["metrics"]["labelInstanceRecall"], "controls":len(controls), "flaggedControls":flagged_controls, "controlFlagRate":ledger["metrics"]["controlFlagRate"], "ledgerSha256":sha256_file(ledger_path)}
'''
if old_summary not in text:
    raise SystemExit("expected patch target missing: summary")
text = text.replace(old_summary, new_summary, 1)

old_tail = '''    print(json.dumps(summary, indent=2))
    return 0
'''
new_tail = '''    shutil.rmtree(OUT / "work", ignore_errors=True)
    print(json.dumps(summary, indent=2))
    return 0 if status.startswith("PASS_") else 1
'''
if old_tail not in text:
    raise SystemExit("expected patch target missing: tail")
text = text.replace(old_tail, new_tail, 1)

path.write_text(text, encoding="utf-8")
print("PATCHED_R44P13_RUNNER_V2")
