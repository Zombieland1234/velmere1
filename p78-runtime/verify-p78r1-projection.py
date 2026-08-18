from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from pathlib import Path

SKIP_TOP = {"node_modules"}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def actual_rows(root: Path) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        rel = path.relative_to(root).as_posix()
        top = rel.split("/", 1)[0]
        if top in SKIP_TOP or top.startswith(".next"):
            continue
        data = path.read_bytes()
        rows.append({"path": rel, "byteLength": len(data), "sha256": sha256(data)})
    return sorted(rows, key=lambda row: str(row["path"]))


def identity(rows: list[dict[str, object]]) -> dict[str, object]:
    ordered = sorted(rows, key=lambda row: str(row["path"]))
    path_set = hashlib.sha256("\n".join(str(row["path"]) for row in ordered).encode()).hexdigest()
    aggregate = hashlib.sha256()
    for row in ordered:
        aggregate.update(f"{row['path']}\0{row['byteLength']}\0{row['sha256']}\n".encode())
    return {
        "fileCount": len(ordered),
        "payloadBytes": sum(int(row["byteLength"]) for row in ordered),
        "pathSetSha256": path_set,
        "sourceContentAggregateSha256": aggregate.hexdigest(),
    }


def compare(root: Path, manifest: dict) -> dict[str, object]:
    expected = {row["path"]: row for row in manifest["files"]}
    observed_list = actual_rows(root)
    observed = {row["path"]: row for row in observed_list}
    missing = sorted(set(expected) - set(observed))
    unexpected = sorted(set(observed) - set(expected))
    mismatches = []
    for rel in sorted(set(expected) & set(observed)):
        exp, got = expected[rel], observed[rel]
        if int(exp["byteLength"]) != int(got["byteLength"]) or exp["sha256"] != got["sha256"]:
            mismatches.append({"path": rel, "expected": exp, "observed": got})
    observed_identity = identity([observed[rel] for rel in sorted(set(expected) & set(observed))])
    exact = not missing and not unexpected and not mismatches and observed_identity == {
        key: manifest["projection"][key]
        for key in ("fileCount", "payloadBytes", "pathSetSha256", "sourceContentAggregateSha256")
    }
    return {
        "exact": exact,
        "missing": missing,
        "unexpected": unexpected,
        "mismatches": mismatches,
        "identity": observed_identity,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source-root", required=True)
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--mode", choices=["check", "capture-next-env", "post-build"], required=True)
    ap.add_argument("--snapshot")
    ap.add_argument("--receipt", required=True)
    ap.add_argument("--build-label", default="unspecified")
    args = ap.parse_args()

    root = Path(args.source_root)
    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    snapshot = Path(args.snapshot) if args.snapshot else None
    result: dict[str, object] = {
        "schemaVersion": "velmere.p78r1.exact-projection-control.v1",
        "mode": args.mode,
        "buildLabel": args.build_label,
        "status": "PASS",
    }

    if args.mode == "capture-next-env":
        if snapshot is None:
            raise SystemExit("--snapshot required")
        next_env = root / "next-env.d.ts"
        if not next_env.is_file():
            raise SystemExit("next-env.d.ts missing before build")
        snapshot.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(next_env, snapshot)
        result["nextEnv"] = {
            "bytes": next_env.stat().st_size,
            "sha256": sha256(next_env.read_bytes()),
        }
    elif args.mode == "check":
        state = compare(root, manifest)
        if not state["exact"]:
            result["status"] = "FAIL"
        result["projection"] = state
    else:
        if snapshot is None or not snapshot.is_file():
            raise SystemExit("valid --snapshot required for post-build")
        state_before_restore = compare(root, manifest)
        changed_paths = [item["path"] for item in state_before_restore["mismatches"]]
        if state_before_restore["missing"] or state_before_restore["unexpected"]:
            result["status"] = "FAIL"
        if any(path != "next-env.d.ts" for path in changed_paths):
            result["status"] = "FAIL"
        result["beforeRestore"] = state_before_restore
        result["allowedMutation"] = {
            "onlyNextEnv": not state_before_restore["missing"] and not state_before_restore["unexpected"] and all(path == "next-env.d.ts" for path in changed_paths),
            "changedPaths": changed_paths,
        }
        shutil.copyfile(snapshot, root / "next-env.d.ts")
        state_after_restore = compare(root, manifest)
        result["afterRestore"] = state_after_restore
        if not state_after_restore["exact"]:
            result["status"] = "FAIL"

    out = Path(args.receipt)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    if result["status"] != "PASS":
        raise SystemExit(f"P78R1 exact projection control failed:{args.mode}:{args.build_label}")


if __name__ == "__main__":
    main()
