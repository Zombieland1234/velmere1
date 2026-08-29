#!/usr/bin/env python3
from __future__ import annotations

import pathlib
import sys

path = pathlib.Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
replacements = {
    '    if "unchecked_call" not in signals and "unchecked_low_level_calls" in final:\n':
    '    if modern and "unchecked_call" not in signals and "unchecked_low_level_calls" in final:\n',
    '    if "reentrancy_order" not in signals and "hook_reentrancy" not in signals and "reentrancy" in final:\n':
    '    if modern and "reentrancy_order" not in signals and "hook_reentrancy" not in signals and "reentrancy" in final:\n',
}
for old, new in replacements.items():
    if old not in text:
        raise SystemExit(f"expected patch target missing: {old.strip()}")
    text = text.replace(old, new, 1)
path.write_text(text, encoding="utf-8")
print("PATCHED_R44P14_LEGACY_TOOL_SIGNAL_PRESERVATION")
