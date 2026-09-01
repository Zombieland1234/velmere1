#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

import tinycss2
from tinycss2.ast import AtRule, QualifiedRule

ROOT = Path(__file__).resolve().parents[2]
RECEIPT = ROOT / "artifacts/pass36/a59/PASS36_A59_CSS_COMPACTION_RECEIPT.json"
ACTIVE_DIRS = ("app", "components", "lib")
ACTIVE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".html", ".json"}
NESTED_RULE_AT_RULES = {"media", "supports", "layer", "container", "scope", "document", "starting-style"}
CLASS_RE = re.compile(r"\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)")
ID_RE = re.compile(r"#(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)")
IDENT_RE = re.compile(r"[-_A-Za-z][-_A-Za-z0-9]*")
PASS_MARKER_RE = re.compile(r"(?:^|[-_])pass\d{2,}|data-pass\d{2,}", re.I)
EXTERNAL_PREFIXES = (
    "recharts", "mapbox", "maplibre", "leaflet", "swiper", "splide", "slick", "nprogress",
    "monaco", "cm-", "codemirror", "toast", "radix", "walletconnect", "wcm-", "web3modal",
    "grecaptcha", "stripe", "turnstile", "lucide", "next-", "__next",
)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def active_identifier_set() -> set[str]:
    result: set[str] = set()
    for base in ACTIVE_DIRS:
        directory = ROOT / base
        if not directory.exists():
            continue
        for path in directory.rglob("*"):
            if path.is_file() and path.suffix.lower() in ACTIVE_EXTENSIONS:
                text = path.read_text(encoding="utf-8", errors="ignore")
                result.update(IDENT_RE.findall(text))
    return result


def high_confidence_unused(selector: str, active: set[str]) -> tuple[bool, list[str]]:
    names = CLASS_RE.findall(selector) + ID_RE.findall(selector)
    if not names:
        return False, []
    if any(name.startswith(EXTERNAL_PREFIXES) for name in names):
        return False, names
    if any(token in selector for token in (":global", ":root", "[class", "[id")):
        return False, names
    if any(name in active for name in names):
        return False, names
    if not PASS_MARKER_RE.search(selector):
        return False, names
    if not all(len(name) >= 12 or re.search(r"\d{2,}", name) for name in names):
        return False, names
    return True, names


def minify_css(text: str) -> str:
    # A59's hand-written lexical minifier removed token boundaries inside
    # Tailwind `@apply` candidates (for example after arbitrary-value `]`) and
    # converted serializer protection comments around decimal utilities into
    # whitespace. A standards parser accepting the result did not prove that
    # Tailwind could compile it. Pruning remains supported, but lexical
    # compaction is intentionally disabled; the real Tailwind compiler is the
    # semantic gate.
    return text.strip() + "\n"


def serialize_filtered_rules(rules, active: set[str], source_path: str, context: str, removed: list[dict]) -> str:
    chunks: list[str] = []
    for ordinal, rule in enumerate(rules):
        if isinstance(rule, QualifiedRule):
            selector = tinycss2.serialize(rule.prelude).strip()
            should_remove, names = high_confidence_unused(selector, active)
            if should_remove:
                serialized = tinycss2.serialize([rule])
                removed.append({
                    "sourcePath": source_path,
                    "context": context,
                    "ordinal": ordinal,
                    "selector": selector,
                    "selectorSha256": sha256_bytes(selector.encode("utf-8")),
                    "ruleSha256": sha256_bytes(serialized.encode("utf-8")),
                    "serializedBytes": len(serialized.encode("utf-8")),
                    "identifiers": sorted(set(names)),
                })
                continue
            chunks.append(tinycss2.serialize(rule.prelude))
            chunks.append("{")
            chunks.append(tinycss2.serialize(rule.content))
            chunks.append("}")
            continue

        if isinstance(rule, AtRule) and rule.content is not None and rule.lower_at_keyword in NESTED_RULE_AT_RULES:
            nested = tinycss2.parse_rule_list(rule.content, skip_comments=False, skip_whitespace=False)
            nested_text = serialize_filtered_rules(nested, active, source_path, f"{context}/@{rule.lower_at_keyword}", removed)
            chunks.append(f"@{rule.at_keyword}")
            prelude = tinycss2.serialize(rule.prelude)
            if prelude:
                chunks.append(prelude)
            chunks.append("{")
            chunks.append(nested_text)
            chunks.append("}")
            continue

        chunks.append(tinycss2.serialize([rule]))
    return "".join(chunks)


def parser_errors(text: str) -> list[str]:
    rules = tinycss2.parse_stylesheet(text, skip_comments=False, skip_whitespace=False)
    errors: list[str] = []
    for rule in rules:
        if getattr(rule, "type", None) == "error":
            errors.append(str(rule))
    return errors


def main() -> None:
    active = active_identifier_set()
    css_paths = sorted(path for path in ROOT.rglob("*.css") if path.is_file())
    removed: list[dict] = []
    files: list[dict] = []

    for path in css_paths:
        relative = path.relative_to(ROOT).as_posix()
        before = path.read_bytes()
        before_text = before.decode("utf-8")
        before_errors = parser_errors(before_text)
        if before_errors:
            raise RuntimeError(f"preexisting_css_parse_error:{relative}:{before_errors[:3]}")

        transformed = before_text
        if relative == "app/globals.css":
            parsed = tinycss2.parse_stylesheet(before_text, skip_comments=False, skip_whitespace=False)
            transformed = serialize_filtered_rules(parsed, active, relative, "root", removed)
        transformed = minify_css(transformed)

        after_errors = parser_errors(transformed)
        if after_errors:
            raise RuntimeError(f"compacted_css_parse_error:{relative}:{after_errors[:3]}")
        after = transformed.encode("utf-8")
        path.write_bytes(after)
        files.append({
            "path": relative,
            "beforeBytes": len(before),
            "afterBytes": len(after),
            "savedBytes": len(before) - len(after),
            "beforeSha256": sha256_bytes(before),
            "afterSha256": sha256_bytes(after),
            "parseErrorsBefore": 0,
            "parseErrorsAfter": 0,
        })

    used_identifier_violations = []
    for row in removed:
        overlap = sorted(set(row["identifiers"]) & active)
        if overlap:
            used_identifier_violations.append({"selector": row["selector"], "overlap": overlap})
    if used_identifier_violations:
        raise RuntimeError(f"used_identifier_removed:{used_identifier_violations[:3]}")

    total_before = sum(row["beforeBytes"] for row in files)
    total_after = sum(row["afterBytes"] for row in files)
    receipt = {
        "schemaVersion": "velmere.pass36.a59.css-compaction.v1",
        "revisionId": "VELMERE_PASS36_A59R0_BUILD_GRAPH_ROUTE_CSS_BUDGET_RECOVERY",
        "mode": "HIGH_CONFIDENCE_UNUSED_PASS_RULE_PRUNE_NO_LEXICAL_COMPACTION",
        "activeSourceDirectories": list(ACTIVE_DIRS),
        "activeIdentifierCount": len(active),
        "files": files,
        "summary": {
            "cssFiles": len(files),
            "beforeBytes": total_before,
            "afterBytes": total_after,
            "savedBytes": total_before - total_after,
            "removedRules": len(removed),
            "removedSerializedBytes": sum(row["serializedBytes"] for row in removed),
            "usedIdentifierViolations": 0,
            "parseErrorsBefore": 0,
            "parseErrorsAfter": 0,
        },
        "removedRules": removed,
        "truthBoundary": "Only rules whose exact class/id identifiers are absent from active app/components/lib source and whose selectors carry high-entropy pass markers are pruned. Hand-written lexical compaction is disabled after A90 found semantic Tailwind token corruption. A successful real Tailwind compilation is mandatory; browser screenshot parity still requires exact frozen-build acceptance.",
    }
    RECEIPT.parent.mkdir(parents=True, exist_ok=True)
    RECEIPT.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt["summary"], indent=2))


if __name__ == "__main__":
    main()
