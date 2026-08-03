#!/usr/bin/env python3
from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import pathlib
import platform
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / "evidence"
RAW = OUT / "raw"
MAX_BODY = 8 * 1024 * 1024
TIMEOUT = 30
USER_AGENT = "Velmere-R44P12-Real-Provider-Diagnostic/1.0"

ASSETS = [
    {"id":"BTC","name":"Bitcoin","coinpaprika":"btc-bitcoin","coinbase":"BTC-USD"},
    {"id":"ETH","name":"Ethereum","coinpaprika":"eth-ethereum","coinbase":"ETH-USD"},
    {"id":"SOL","name":"Solana","coinpaprika":"sol-solana","coinbase":"SOL-USD"},
    {"id":"XRP","name":"XRP","coinpaprika":"xrp-xrp","coinbase":"XRP-USD"},
    {"id":"ADA","name":"Cardano","coinpaprika":"ada-cardano","coinbase":"ADA-USD"},
    {"id":"DOGE","name":"Dogecoin","coinpaprika":"doge-dogecoin","coinbase":"DOGE-USD"},
    {"id":"LINK","name":"Chainlink","coinpaprika":"link-chainlink","coinbase":"LINK-USD"},
    {"id":"AVAX","name":"Avalanche","coinpaprika":"avax-avalanche","coinbase":"AVAX-USD"},
    {"id":"BNB","name":"BNB","coinpaprika":"bnb-binance-coin","coinbase":"BNB-USD"},
    {"id":"UNI","name":"Uniswap","coinpaprika":"uni-uniswap","coinbase":"UNI-USD"},
    {"id":"ARB","name":"Arbitrum","coinpaprika":"arb-arbitrum","coinbase":"ARB-USD"},
    {"id":"XTZ","name":"Tezos","coinpaprika":"xtz-tezos","coinbase":"XTZ-USD"},
    {"id":"ALGO","name":"Algorand","coinpaprika":"algo-algorand","coinbase":"ALGO-USD"},
    {"id":"APT","name":"Aptos","coinpaprika":"apt-aptos","coinbase":"APT-USD"},
    {"id":"POL","name":"Polygon Ecosystem Token","coinpaprika":"pol-polygon-ecosystem-token","coinbase":"POL-USD"},
]


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def strict_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in pairs:
        if key in out:
            raise ValueError(f"duplicate_json_key:{key}")
        if key in {"__proto__", "prototype", "constructor"}:
            raise ValueError(f"prototype_json_key:{key}")
        out[key] = value
    return out


def parse_json(body: bytes) -> Any:
    text = body.decode("utf-8", "strict")
    return json.loads(text, object_pairs_hook=strict_object, parse_constant=lambda x: (_ for _ in ()).throw(ValueError(f"invalid_constant:{x}")))


def safe_headers(headers: Any) -> dict[str, str]:
    allowed = {"content-type", "date", "etag", "last-modified", "retry-after", "x-ratelimit-limit", "x-ratelimit-remaining", "cache-control"}
    return {str(k).lower(): str(v)[:512] for k, v in headers.items() if str(k).lower() in allowed}


def fetch(provider: str, request_id: str, url: str, *, attempts: int = 3) -> dict[str, Any]:
    RAW.mkdir(parents=True, exist_ok=True)
    last: dict[str, Any] | None = None
    for attempt in range(1, attempts + 1):
        started = dt.datetime.now(dt.timezone.utc)
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
        status = None; headers: dict[str,str] = {}; body = b""; error = None
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as response:
                status = int(response.status)
                headers = safe_headers(response.headers)
                body = response.read(MAX_BODY + 1)
        except urllib.error.HTTPError as exc:
            status = int(exc.code)
            headers = safe_headers(exc.headers)
            body = exc.read(MAX_BODY + 1)
            error = f"HTTP_{status}"
        except Exception as exc:
            error = type(exc).__name__
        duration_ms = round((dt.datetime.now(dt.timezone.utc)-started).total_seconds()*1000, 3)
        if len(body) > MAX_BODY:
            error = "BODY_TOO_LARGE"; body = body[:MAX_BODY]
        body_path = RAW / f"{provider}-{request_id}-attempt{attempt}.body.bin"
        headers_path = RAW / f"{provider}-{request_id}-attempt{attempt}.headers.json"
        body_path.write_bytes(body)
        headers_path.write_text(json.dumps(headers, indent=2, sort_keys=True)+"\n", encoding="utf-8")
        last = {
            "provider": provider, "requestId": request_id, "url": url, "attempt": attempt,
            "observedAt": started.isoformat(), "durationMs": duration_ms, "status": status,
            "error": error, "headers": headers, "bodyBytes": len(body), "bodySha256": sha256(body),
            "bodyPath": str(body_path.relative_to(ROOT)), "headersPath": str(headers_path.relative_to(ROOT)),
        }
        if status == 200 and error is None:
            try:
                last["json"] = parse_json(body)
                last["jsonValid"] = True
                return last
            except Exception as exc:
                last["jsonValid"] = False; last["error"] = type(exc).__name__
        if status not in (429, 500, 502, 503, 504) and error not in ("URLError", "TimeoutError"):
            return last
        time.sleep(min(2 ** attempt, 8))
    assert last is not None
    return last


def decimal(value: Any) -> float | None:
    try:
        parsed = float(value)
        return parsed if parsed > 0 and parsed < 1e15 else None
    except Exception:
        return None


def provider_state(receipt: dict[str, Any], *, available: bool) -> str:
    if available: return "AVAILABLE"
    if receipt.get("status") == 429: return "RATE_LIMITED"
    if receipt.get("status") == 404: return "UNAVAILABLE"
    if receipt.get("status") is None: return "FAILED"
    if receipt.get("jsonValid") is False: return "SCHEMA_REJECTED"
    return "FAILED"


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    observations: list[dict[str, Any]] = []
    requests: list[dict[str, Any]] = []

    products = fetch("coinbase", "products", "https://api.exchange.coinbase.com/products")
    requests.append({k:v for k,v in products.items() if k != "json"})
    product_rows = products.get("json") if isinstance(products.get("json"), list) else []
    product_map = {str(row.get("id")): row for row in product_rows if isinstance(row, dict) and row.get("id")}

    for asset in ASSETS:
        cp = fetch("coinpaprika", asset["id"].lower(), f"https://api.coinpaprika.com/v1/tickers/{urllib.parse.quote(asset['coinpaprika'])}")
        requests.append({k:v for k,v in cp.items() if k != "json"})
        cpj = cp.get("json") if isinstance(cp.get("json"), dict) else {}
        usd = cpj.get("quotes", {}).get("USD", {}) if isinstance(cpj.get("quotes"), dict) else {}
        cp_price = decimal(usd.get("price")) if isinstance(usd, dict) else None
        cp_symbol = str(cpj.get("symbol", "")).upper()
        cp_id = str(cpj.get("id", ""))
        cp_identity = cp_id == asset["coinpaprika"] and cp_symbol == asset["id"]
        cp_available = cp.get("status") == 200 and cp.get("jsonValid") and cp_identity and cp_price is not None
        cp_row = {
            "asset": asset["id"], "provider":"COINPAPRIKA", "state": provider_state(cp, available=cp_available),
            "identityExact": cp_identity, "providerAssetId": cp_id or asset["coinpaprika"], "priceUsd": cp_price,
            "marketCapUsd": decimal(usd.get("market_cap")) if isinstance(usd, dict) else None,
            "volume24hUsd": decimal(usd.get("volume_24h")) if isinstance(usd, dict) else None,
            "providerTimestamp": cpj.get("last_updated"), "receiptBodySha256": cp["bodySha256"], "requestId": cp["requestId"],
        }

        cb_product = product_map.get(asset["coinbase"])
        cb_product_exact = bool(cb_product and str(cb_product.get("base_currency", "")).upper() == asset["id"] and str(cb_product.get("quote_currency", "")).upper() == "USD")
        if cb_product_exact:
            cb = fetch("coinbase", asset["id"].lower(), f"https://api.exchange.coinbase.com/products/{urllib.parse.quote(asset['coinbase'])}/ticker")
            requests.append({k:v for k,v in cb.items() if k != "json"})
            cbj = cb.get("json") if isinstance(cb.get("json"), dict) else {}
            cb_price = decimal(cbj.get("price"))
            cb_available = cb.get("status") == 200 and cb.get("jsonValid") and cb_price is not None
            cb_row = {
                "asset": asset["id"], "provider":"COINBASE_EXCHANGE", "state": provider_state(cb, available=cb_available),
                "identityExact": cb_product_exact, "providerAssetId": asset["coinbase"], "priceUsd": cb_price,
                "bidUsd": decimal(cbj.get("bid")), "askUsd": decimal(cbj.get("ask")), "volumeBase24h": decimal(cbj.get("volume")),
                "providerTimestamp": cbj.get("time"), "receiptBodySha256": cb["bodySha256"], "requestId": cb["requestId"],
            }
        else:
            cb_row = {"asset":asset["id"], "provider":"COINBASE_EXCHANGE", "state":"UNAVAILABLE", "identityExact":False,
                      "providerAssetId":asset["coinbase"], "priceUsd":None, "requestId":"products", "receiptBodySha256":products["bodySha256"]}
        available_prices = [r["priceUsd"] for r in (cp_row, cb_row) if r.get("state") == "AVAILABLE" and r.get("priceUsd")]
        drift = None
        if len(available_prices) == 2:
            drift = abs(available_prices[0]-available_prices[1]) / ((available_prices[0]+available_prices[1])/2) * 100
        if len(available_prices) == 2 and drift is not None and drift > 5:
            terminal = "CONFLICTED"
        elif len(available_prices) == 2:
            terminal = "AVAILABLE"
        elif len(available_prices) == 1:
            terminal = "PARTIAL"
        elif any(r["state"] == "RATE_LIMITED" for r in (cp_row, cb_row)):
            terminal = "RATE_LIMITED"
        else:
            terminal = "FAILED"
        observations.append({"asset":asset["id"], "name":asset["name"], "terminalState":terminal,
                             "crossProviderPriceDriftPct": round(drift,6) if drift is not None else None,
                             "providers":[cp_row, cb_row]})

    available_assets = sum(1 for row in observations if row["terminalState"] == "AVAILABLE")
    partial_assets = sum(1 for row in observations if row["terminalState"] == "PARTIAL")
    provider_available = sum(1 for row in observations for p in row["providers"] if p["state"] == "AVAILABLE")
    ledger = {
        "schemaVersion":"velmere.pass36.a102r44p12.real-public-provider-diagnostic.v1",
        "generatedAt":dt.datetime.now(dt.timezone.utc).isoformat(),
        "executionEnvironment":{"python":sys.version.split()[0],"platform":platform.platform(),"githubSha":os.getenv("GITHUB_SHA")},
        "denominator":{"assets":len(ASSETS),"providerRows":len(ASSETS)*2},
        "summary":{"availableAssets":available_assets,"partialAssets":partial_assets,"providerAvailableRows":provider_available,
                   "conflictedAssets":sum(1 for x in observations if x["terminalState"]=="CONFLICTED"),
                   "failedAssets":sum(1 for x in observations if x["terminalState"] in {"FAILED","RATE_LIMITED"})},
        "observations":observations,
        "requests":requests,
        "truthBoundary":{
            "realNetworkObservations": provider_available,
            "diagnosticOnly":True,
            "rightsApprovedCommercialUse":False,
            "customerDeliveryCredit":False,
            "paidTierCredit":False,
            "liveCredit":False,
            "productionApproved":False,
            "notes":["Public unauthenticated endpoints were queried for a bounded diagnostic.","Provider terms and commercial display/redistribution rights were not approved by counsel or provider agreement.","This receipt does not prove full 318/583 catalog coverage, uptime, corrections, retention rights, redistribution rights or customer value."],
        },
    }
    ledger_path = OUT / "R44P12_REAL_PROVIDER_DIAGNOSTIC_LEDGER.json"
    ledger_path.write_text(json.dumps(ledger, indent=2, sort_keys=True)+"\n", encoding="utf-8")
    summary = {"status":"PASS_DIAGNOSTIC" if provider_available >= 10 else "ACTION_REQUIRED_INSUFFICIENT_OBSERVATIONS",
               "assets":len(ASSETS),"providerRows":len(ASSETS)*2,"providerAvailableRows":provider_available,
               "availableAssets":available_assets,"partialAssets":partial_assets,"ledgerSha256":sha256(ledger_path.read_bytes())}
    (OUT / "R44P12_REAL_PROVIDER_DIAGNOSTIC_SUMMARY.json").write_text(json.dumps(summary, indent=2, sort_keys=True)+"\n",encoding="utf-8")
    print(json.dumps(summary, indent=2))
    return 0 if provider_available >= 10 else 1

if __name__ == "__main__":
    raise SystemExit(main())
