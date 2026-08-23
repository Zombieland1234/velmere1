from __future__ import annotations

import base64
import importlib.util
import tempfile
from pathlib import Path

MODULE_PATH = Path(__file__).with_name("apply-p79-unified-diff.py")
spec = importlib.util.spec_from_file_location("p79_apply_diff_wrapper", MODULE_PATH)
if spec is None or spec.loader is None:
    raise SystemExit("P79 transport test could not load wrapper")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def decode(value: bytes):
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "payload.b64"
        path.write_bytes(value)
        normalized, meta = module.normalize_base64_transport(path)
        return base64.b64decode(normalized, validate=True), meta


def expect_fail(value: bytes, marker: str) -> None:
    try:
        decode(value)
    except (SystemExit, UnicodeDecodeError, ValueError):
        return
    raise AssertionError(f"expected fail-closed rejection: {marker}")


payload = b"velmere-p79-transport"
canonical = base64.b64encode(payload).decode("ascii")
unpadded = canonical.rstrip("=")

decoded, meta = decode(canonical.encode("ascii"))
assert decoded == payload and meta["addedPaddingCharacters"] == 0

decoded, meta = decode(f"  {unpadded[:8]}\n{unpadded[8:]}\r\n".encode("ascii"))
assert decoded == payload
assert meta["addedPaddingCharacters"] == len(canonical) - len(unpadded)
assert meta["normalizationBoundary"] == (
    "ASCII_WHITESPACE_AND_MISSING_TERMINAL_PADDING_ONLY"
)

expect_fail(b"dmVsbWVyZQ=", "wrong supplied padding")
expect_fail(b"dmVsbWVy$Q==", "invalid alphabet")
expect_fail(b"A", "impossible core length")
expect_fail("dmVsbWVy\u00a0ZQ==".encode("utf-8"), "non-ASCII whitespace")
expect_fail(b"", "empty transport")

print("PASS P79 strict base64 transport 7/7")
