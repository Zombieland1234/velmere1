#!/usr/bin/env python3
from __future__ import annotations

import datetime as dt
import hashlib
import json
import pathlib
import random
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / "evidence"
RAW = OUT / "raw"
SEED = "velmere-r44p17-50-asset-v1"
MAX_BODY = 16 * 1024 * 1024
TIMEOUT = 35
UA = "Velmere-R44P17-Diagnostic/1.0"


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def strict_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in pairs:
        if key in out or key in {"__proto__", "prototype", "constructor"}:
            raise ValueError(f"unsafe_json_key:{key}")
        out[key] = value
    return out


def parse_json(data: bytes) -> Any:
    return json.loads(data.decode("utf-8", "strict"), object_pairs_hook=strict_object,
                      parse_constant=lambda x: (_ for _ in ()).throw(ValueError(x)))


def headers_subset(headers: Any) -> dict[str, str]:
    allowed = {"content-type", "date", "etag", "last-modified", "retry-after", "cache-control", "x-ratelimit-limit", "x-ratelimit-remaining"}
    return {str(k).lower(): str(v)[:512] for k, v in headers.items() if str(k).lower() in allowed}


def fetch(provider: str, request_id: str, url: str, attempts: int = 3) -> dict[str, Any]:
    RAW.mkdir(parents=True, exist_ok=True)
    last: dict[str, Any] | None = None
    for attempt in range(1, attempts + 1):
        started = dt.datetime.now(dt.timezone.utc)
        status = None; body = b""; error = None; headers: dict[str, str] = {}
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
                status = int(response.status); headers = headers_subset(response.headers); body = response.read(MAX_BODY + 1)
        except urllib.error.HTTPError as exc:
            status = int(exc.code); headers = headers_subset(exc.headers); body = exc.read(MAX_BODY + 1); error = f"HTTP_{status}"
        except Exception as exc:
            error = type(exc).__name__
        if len(body) > MAX_BODY:
            body = body[:MAX_BODY]; error = "BODY_TOO_LARGE"
        path = RAW / f"{provider}-{request_id}-attempt{attempt}.body.bin"
        hpath = RAW / f"{provider}-{request_id}-attempt{attempt}.headers.json"
        path.write_bytes(body); hpath.write_text(json.dumps(headers, indent=2, sort_keys=True) + "\n")
        last = {
            "provider": provider, "requestId": request_id, "url": url, "attempt": attempt,
            "observedAt": started.isoformat(), "durationMs": round((dt.datetime.now(dt.timezone.utc)-started).total_seconds()*1000, 3),
            "status": status, "error": error, "headers": headers, "bodyBytes": len(body), "bodySha256": digest(body),
            "bodyPath": str(path.relative_to(ROOT)), "headersPath": str(hpath.relative_to(ROOT)),
        }
        if status == 200 and error is None:
            try:
                last["json"] = parse_json(body); last["jsonValid"] = True; return last
            except Exception as exc:
                last["jsonValid"] = False; last["error"] = type(exc).__name__
        if status not in (429, 500, 502, 503, 504) and error not in ("URLError", "TimeoutError"):
            return last
        time.sleep(min(2 ** attempt, 8))
    assert last is not None
    return last


def positive(value: Any) -> float | None:
    try:
        x = float(value)
        return x if 0 < x < 1e18 else None
    except Exception:
        return None


def state(receipt: dict[str, Any], available: bool) -> str:
    if available: return "AVAILABLE"
    if receipt.get("status") == 429: return "RATE_LIMITED"
    if receipt.get("status") == 404: return "UNAVAILABLE"
    if receipt.get("jsonValid") is False: return "SCHEMA_REJECTED"
    return "FAILED"


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    requests: list[dict[str, Any]] = []
    top = fetch("coinpaprika", "top100", "https://api.coinpaprika.com/v1/tickers?quotes=USD&limit=100")
    requests.append({k: v for k, v in top.items() if k != "json"})
    rows = top.get("json") if isinstance(top.get("json"), list) else []
    candidates = [x for x in rows if isinstance(x, dict) and x.get("id") and x.get("symbol") and isinstance(x.get("quotes"), dict)]
    if len(candidates) < 50:
        raise RuntimeError(f"insufficient CoinPaprika candidates: {len(candidates)}")
    rng = random.Random(int(hashlib.sha256(SEED.encode()).hexdigest(), 16))
    selected = sorted(rng.sample(candidates[:100], 50), key=lambda x: str(x["id"]))

    products = fetch("coinbase", "products", "https://api.exchange.coinbase.com/products")
    requests.append({k: v for k, v in products.items() if k != "json"})
    product_rows = products.get("json") if isinstance(products.get("json"), list) else []
    by_symbol: dict[str, list[dict[str, Any]]] = {}
    for product in product_rows:
        if not isinstance(product, dict): continue
        if str(product.get("quote_currency", "")).upper() != "USD": continue
        symbol = str(product.get("base_currency", "")).upper()
        by_symbol.setdefault(symbol, []).append(product)

    observations = []
    for item in selected:
        asset_id = str(item["id"]); symbol = str(item["symbol"]).upper(); usd = item.get("quotes", {}).get("USD", {})
        p1 = positive(usd.get("price")) if isinstance(usd, dict) else None
        cp = {
            "provider": "COINPAPRIKA", "providerAssetId": asset_id, "identityClass": "EXACT_PROVIDER_ID_AND_SYMBOL",
            "identityValid": True, "state": "AVAILABLE" if p1 is not None else "SCHEMA_REJECTED", "priceUsd": p1,
            "marketCapUsd": positive(usd.get("market_cap")) if isinstance(usd, dict) else None,
            "volume24hUsd": positive(usd.get("volume_24h")) if isinstance(usd, dict) else None,
            "providerTimestamp": item.get("last_updated"), "requestId": "top100", "receiptBodySha256": top["bodySha256"],
        }
        options = sorted(by_symbol.get(symbol, []), key=lambda x: (str(x.get("status", "")) != "online", str(x.get("id", ""))))
        if options:
            product = options[0]; pair = str(product.get("id"))
            cb = fetch("coinbase", asset_id.replace("-", "_"), f"https://api.exchange.coinbase.com/products/{urllib.parse.quote(pair)}/ticker")
            requests.append({k: v for k, v in cb.items() if k != "json"})
            body = cb.get("json") if isinstance(cb.get("json"), dict) else {}
            p2 = positive(body.get("price"))
            valid = str(product.get("base_currency", "")).upper() == symbol and str(product.get("quote_currency", "")).upper() == "USD"
            cbrow = {
                "provider": "COINBASE_EXCHANGE", "providerAssetId": pair, "identityClass": "SYMBOL_USD_PAIR_ONLY",
                "identityValid": valid, "state": state(cb, bool(valid and p2 is not None)), "priceUsd": p2,
                "bidUsd": positive(body.get("bid")), "askUsd": positive(body.get("ask")), "providerTimestamp": body.get("time"),
                "requestId": cb["requestId"], "receiptBodySha256": cb["bodySha256"],
            }
        else:
            cbrow = {
                "provider": "COINBASE_EXCHANGE", "providerAssetId": None, "identityClass": "NO_MATCHING_USD_PAIR",
                "identityValid": False, "state": "UNAVAILABLE", "priceUsd": None, "requestId": "products",
                "receiptBodySha256": products["bodySha256"],
            }
        prices = [x["priceUsd"] for x in (cp, cbrow) if x.get("state") == "AVAILABLE" and x.get("priceUsd")]
        drift = abs(prices[0]-prices[1]) / ((prices[0]+prices[1])/2) * 100 if len(prices) == 2 else None
        terminal = "CONFLICTED" if drift is not None and drift > 5 else "AVAILABLE" if len(prices) == 2 else "PARTIAL" if len(prices) == 1 else "RATE_LIMITED" if any(x["state"] == "RATE_LIMITED" for x in (cp, cbrow)) else "FAILED"
        observations.append({
            "assetId": asset_id, "symbol": symbol, "name": str(item.get("name", "")), "rank": item.get("rank"),
            "selectionSeed": SEED, "terminalState": terminal, "crossProviderDriftPct": round(drift, 6) if drift is not None else None,
            "providers": [cp, cbrow],
        })

    provider_rows = [p for x in observations for p in x["providers"]]
    summary = {
        "assets": 50, "providerRows": 100,
        "twoProviderAvailable": sum(x["terminalState"] == "AVAILABLE" for x in observations),
        "oneProviderAvailable": sum(x["terminalState"] == "PARTIAL" for x in observations),
        "conflicted": sum(x["terminalState"] == "CONFLICTED" for x in observations),
        "failedOrRateLimited": sum(x["terminalState"] in {"FAILED", "RATE_LIMITED"} for x in observations),
        "availableProviderRows": sum(p["state"] == "AVAILABLE" for p in provider_rows),
    }
    ledger = {
        "schemaVersion": "velmere.pass36.a102r44p17.real-50-asset-public-diagnostic.v1",
        "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(), "selectionSeed": SEED,
        "denominator": {"candidatePool": min(len(candidates), 100), "assets": 50, "providerRows": 100},
        "summary": summary, "observations": observations, "requests": requests,
        "truthBoundary": {
            "realNetworkDiagnostic": True, "nonCherryPickedSeededSample": True,
            "rightsApprovedCommercialUse": False, "displayRightsApproved": False, "cacheRightsApproved": False,
            "pdfRedistributionRightsApproved": False, "aiRagRightsApproved": False,
            "customerCredit": False, "paidTierCredit": False, "liveCredit": False, "productionApproved": False,
            "notes": ["Public endpoints were queried only for bounded diagnostic evidence.", "Coinbase identity is symbol/USD-pair level, not a universal provider asset identifier.", "UNAVAILABLE rows remain in the denominator."]
        }
    }
    ledger_path = OUT / "R44P17_50_ASSET_PUBLIC_DIAGNOSTIC_LEDGER.json"
    ledger_path.write_text(json.dumps(ledger, indent=2, sort_keys=True) + "\n")
    result = {"status": "PASS_DIAGNOSTIC" if summary["availableProviderRows"] >= 50 else "ACTION_REQUIRED", **summary, "ledgerSha256": digest(ledger_path.read_bytes())}
    (OUT / "R44P17_50_ASSET_PUBLIC_DIAGNOSTIC_SUMMARY.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    print(json.dumps(result, indent=2)); return 0 if result["status"] == "PASS_DIAGNOSTIC" else 1

if __name__ == "__main__":
    raise SystemExit(main())
