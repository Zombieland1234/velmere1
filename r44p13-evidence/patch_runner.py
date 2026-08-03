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

old_use = '''def use_compiler(version: str) -> dict[str, Any]:
    selected = run(["solc-select", "use", version], cwd=ROOT, timeout=120)
    version_result = run(["solc", "--version"], cwd=ROOT, timeout=60)
    return {"selectExitCode": selected["exitCode"], "versionExitCode": version_result["exitCode"], "versionOutput": (version_result["stdout"]+version_result["stderr"]).decode("utf-8","replace")[:1024], "solcPath": str(pathlib.Path(shutil.which("solc") or "").resolve())}
'''
new_use = '''def use_compiler(version: str) -> dict[str, Any]:
    selected = run(["solc-select", "use", version], cwd=ROOT, timeout=120)
    version_result = run(["solc", "--version"], cwd=ROOT, timeout=60)
    version_output = (version_result["stdout"]+version_result["stderr"]).decode("utf-8","replace")[:1024]
    selected_exact = selected["exitCode"] == 0 and version_result["exitCode"] == 0 and version in version_output
    return {"selectExitCode": selected["exitCode"], "versionExitCode": version_result["exitCode"], "versionOutput": version_output, "selectedExact": selected_exact, "solcPath": str(pathlib.Path(shutil.which("solc") or "").resolve())}
'''

old_process = '''    compile_run = run(["solc", "--bin", str(source_copy)], cwd=case_dir, timeout=180)
    slither_json = case_dir / "slither.json"
    slither_run = run(["slither", str(source_copy), "--solc", compiler["solcPath"], "--json", str(slither_json), "--disable-color"], cwd=case_dir, timeout=300)
    slither = sanitize_slither(slither_json)
'''
new_process = '''    if compiler["selectedExact"]:
        compile_run = run(["solc", "--bin", str(source_copy)], cwd=case_dir, timeout=180)
        slither_json = case_dir / "slither.json"
        slither_run = run(["slither", str(source_copy), "--solc", compiler["solcPath"], "--json", str(slither_json), "--disable-color"], cwd=case_dir, timeout=300)
        slither = sanitize_slither(slither_json)
    else:
        compile_run = {"exitCode": None, "timedOut": False, "stdout": b"", "stderr": b"compiler_not_selected_exact"}
        slither_run = {"exitCode": None, "timedOut": False, "stdout": b"", "stderr": b"compiler_not_selected_exact"}
        slither = {"jsonPresent": False, "detectors": [], "skippedReason": "compiler_not_selected_exact"}
'''

for old, new, label in ((old_normalize, new_normalize, "normalize"), (old_use, new_use, "use_compiler"), (old_process, new_process, "process_case")):
    if old not in text:
        raise SystemExit(f"expected patch target missing: {label}")
    text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")
print("PATCHED_R44P13_RUNNER")
