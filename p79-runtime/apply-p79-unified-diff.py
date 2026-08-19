from __future__ import annotations

import base64
import hashlib
import json
import re
import runpy
import sys
import tempfile
from pathlib import Path
from typing import Any

BASE64_ALPHABET = re.compile(r"[A-Za-z0-9+/]*={0,2}\Z")
ASCII_TRANSPORT_WHITESPACE = re.compile(r"[ \t\r\n\f\v]+")
LEGACY_SCRIPT = Path(__file__).with_name("apply-p79-unified-diff-legacy.py")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def normalize_base64_transport(path: Path) -> tuple[str, dict[str, Any]]:
    """Repair only omitted RFC 4648 tail padding; fail closed otherwise."""

    text = path.read_text(encoding="ascii")
    compact = ASCII_TRANSPORT_WHITESPACE.sub("", text)
    if not compact:
        raise SystemExit(f"P79 empty base64 transport:{path}")
    if BASE64_ALPHABET.fullmatch(compact) is None:
        raise SystemExit(f"P79 invalid base64 transport alphabet:{path}")

    core = compact.rstrip("=")
    supplied_padding = len(compact) - len(core)
    required_padding = (-len(core)) % 4
    if required_padding == 3:
        raise SystemExit(f"P79 impossible base64 transport length:{path}:{len(core)}")
    if supplied_padding not in (0, required_padding):
        raise SystemExit(
            f"P79 non-canonical base64 padding:{path}:"
            f"supplied={supplied_padding}:required={required_padding}"
        )

    normalized = core + ("=" * required_padding)
    decoded = base64.b64decode(normalized, validate=True)
    return normalized, {
        "encoding": "RFC4648_BASE64",
        "sourceCharacters": len(text),
        "compactCharacters": len(compact),
        "suppliedPaddingCharacters": supplied_padding,
        "addedPaddingCharacters": required_padding - supplied_padding,
        "normalizedCharacters": len(normalized),
        "decodedBytes": len(decoded),
        "decodedSha256": sha256(decoded),
        "normalizationBoundary": "ASCII_WHITESPACE_AND_MISSING_TERMINAL_PADDING_ONLY",
    }


def argument_value(argv: list[str], flag: str) -> tuple[int, str]:
    try:
        index = argv.index(flag)
    except ValueError as exc:
        raise SystemExit(f"P79 missing required wrapper argument:{flag}") from exc
    if index + 1 >= len(argv):
        raise SystemExit(f"P79 missing value for wrapper argument:{flag}")
    return index + 1, argv[index + 1]


def augment_receipt(path: Path, transport: dict[str, Any]) -> None:
    if not path.is_file():
        raise SystemExit(f"P79 legacy patch receipt missing:{path}")
    receipt = json.loads(path.read_text(encoding="utf-8"))
    if receipt.get("status") != "PASS":
        raise SystemExit(f"P79 legacy patch receipt not PASS:{path}")
    receipt["schemaVersion"] = "velmere.p79.unified-diff-source-patch.v2"
    receipt["patchTransport"] = transport
    path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    if not LEGACY_SCRIPT.is_file():
        raise SystemExit(f"P79 pinned legacy patcher missing:{LEGACY_SCRIPT}")

    patch_index, patch_path = argument_value(sys.argv, "--patch-b64")
    _, receipt_path = argument_value(sys.argv, "--receipt")
    normalized, transport = normalize_base64_transport(Path(patch_path))

    temporary_path: Path | None = None
    original_argv = list(sys.argv)
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="ascii",
            newline="\n",
            prefix="p79-normalized-",
            suffix=".b64",
            delete=False,
        ) as handle:
            handle.write(normalized)
            handle.write("\n")
            temporary_path = Path(handle.name)

        sys.argv = [str(LEGACY_SCRIPT), *original_argv[1:]]
        sys.argv[patch_index] = str(temporary_path)
        runpy.run_path(str(LEGACY_SCRIPT), run_name="__main__")
        augment_receipt(Path(receipt_path), transport)
    finally:
        sys.argv = original_argv
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
