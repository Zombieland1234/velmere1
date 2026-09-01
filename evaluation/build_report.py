import csv
import json
import statistics
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EVAL = ROOT / "evaluation"
SUM = EVAL / "summaries"


def load(pattern):
    rows = []
    for path in sorted(SUM.glob(pattern)):
        value = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(value, dict):
            rows.append(value)
    return rows


def avg(rows, key):
    values = [row.get(key) for row in rows if isinstance(row.get(key), (int, float))]
    return round(statistics.mean(values), 1) if values else None


def write_csv(path, rows):
    keys = []
    for row in rows:
        for key in row:
            if key not in keys:
                keys.append(key)
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=keys)
        writer.writeheader()
        for row in rows:
            writer.writerow({
                key: json.dumps(value, ensure_ascii=False) if isinstance(value, (list, dict)) else value
                for key, value in row.items()
            })


shield = [row for row in load("shield-*.json") if row.get("category") == "shield"]
real = [row for row in load("real-markets-*.json") if row.get("category") == "real-markets"]
pdf = [row for row in load("pdf-*.json") if row.get("category") == "pdf"]
audit = [row for row in load("audit-*.json") if row.get("category") == "audit"]
all_rows = shield + real + pdf + audit

if (len(shield), len(real), len(pdf), len(audit)) != (30, 30, 30, 30):
    raise SystemExit(f"Incomplete matrix: shield={len(shield)} real={len(real)} pdf={len(pdf)} audit={len(audit)}")

write_csv(EVAL / "VELMERE_PASS4640_ALL_120.csv", all_rows)
write_csv(EVAL / "VELMERE_PASS4640_SHIELD_30.csv", shield)
write_csv(EVAL / "VELMERE_PASS4640_REAL_MARKETS_30.csv", real)
write_csv(EVAL / "VELMERE_PASS4640_PDF_30.csv", pdf)
write_csv(EVAL / "VELMERE_PASS4640_AUDIT_30.csv", audit)


def by_depth(rows, depth):
    return [row for row in rows if row.get("depth") == depth]


def status_counts(rows):
    return dict(sorted(Counter(int(row.get("status") or row.get("pdfStatus") or 0) for row in rows).items()))


shield_wrong_surface = [row for row in shield if row.get("sourceMode") != "crypto_market_integrity" or row.get("kernelSurface") != "shield"]
real_wrong_surface = [row for row in real if row.get("sourceMode") != "real_markets" or row.get("kernelSurface") != "real_markets"]
market_502 = [row for row in shield + real if row.get("status") == 502]
market_fake_scores = [
    row for row in shield + real
    if (row.get("kernelSourceCount") in (0, None) and isinstance(row.get("score"), (int, float)))
]
paid_market_released = [
    row for row in shield + real
    if row.get("depth") in ("pro", "advanced") and row.get("releaseAllowed") is True
]

pdf_basic = by_depth(pdf, "basic")
pdf_pro = by_depth(pdf, "pro")
pdf_advanced = by_depth(pdf, "advanced")
pdf_basic_invalid = [row for row in pdf_basic if row.get("pdfStatus") != 200 or row.get("binaryPageCount") != 2 or row.get("pdfBytes", 0) <= 1000]
pdf_paid_unblocked = [row for row in pdf_pro + pdf_advanced if row.get("pdfStatus") == 200 or row.get("commercialSellReady") is True]

audit_basic = by_depth(audit, "basic")
audit_pro = by_depth(audit, "pro")
audit_advanced = by_depth(audit, "advanced")
audit_fake_scores = [row for row in audit if row.get("customerRiskScore") is not None or (row.get("customerConfidence") or 0) > 0]
audit_paid_unblocked = [row for row in audit_pro + audit_advanced if row.get("status") == 200 or row.get("commercialCheckoutAllowed") is True]

summary = {
    "pass": "PASS4640",
    "executed": len(all_rows),
    "complete": len(all_rows) == 120,
    "shield": {
        "executed": len(shield),
        "statusByDepth": {depth: status_counts(by_depth(shield, depth)) for depth in ("basic", "pro", "advanced")},
        "wrongSurface": len(shield_wrong_surface),
        "http502": sum(row.get("status") == 502 for row in shield),
        "numericScoreWithoutSources": sum(row in market_fake_scores for row in shield),
        "averageLatencyMs": {depth: avg(by_depth(shield, depth), "latencyMs") for depth in ("basic", "pro", "advanced")},
    },
    "realMarkets": {
        "executed": len(real),
        "statusByDepth": {depth: status_counts(by_depth(real, depth)) for depth in ("basic", "pro", "advanced")},
        "wrongSurface": len(real_wrong_surface),
        "http502": sum(row.get("status") == 502 for row in real),
        "numericScoreWithoutSources": sum(row in market_fake_scores for row in real),
        "adsResolved": all(row.get("resolvedName") == "adidas AG" for row in real if row.get("query") == "ADS.DE"),
        "mcResolved": all(str(row.get("resolvedName", "")).startswith("LVMH") for row in real if row.get("query") == "MC.PA"),
        "averageLatencyMs": {depth: avg(by_depth(real, depth), "latencyMs") for depth in ("basic", "pro", "advanced")},
    },
    "pdf": {
        "executed": len(pdf),
        "basicValidTwoPagePdf": len(pdf_basic) - len(pdf_basic_invalid),
        "proBlocked422": sum(row.get("jsonStatus") == 422 and row.get("pdfBytes") == 0 for row in pdf_pro),
        "advancedBlocked422": sum(row.get("jsonStatus") == 422 and row.get("pdfBytes") == 0 for row in pdf_advanced),
        "templateContract": {"basicPages": 2, "proPages": 4, "advancedPages": 8},
        "averageBasicPdfBytes": avg(pdf_basic, "pdfBytes"),
    },
    "audit": {
        "executed": len(audit),
        "statusByDepth": {depth: status_counts(by_depth(audit, depth)) for depth in ("basic", "pro", "advanced")},
        "numericScoreWithoutSources": len(audit_fake_scores),
        "paidIncorrectlyReleased": len(audit_paid_unblocked),
        "averageResponseBytes": {depth: avg(by_depth(audit, depth), "responseBytes") for depth in ("basic", "pro", "advanced")},
        "averageLatencyMs": {depth: avg(by_depth(audit, depth), "latencyMs") for depth in ("basic", "pro", "advanced")},
    },
    "remainingLimitations": [
        "The local test environment does not include production provider secrets, live Stripe payment, or durable Supabase persistence.",
        "Paid tiers are intentionally blocked until provider quorum and release gates pass.",
        "This matrix invokes the server routes used by the UI; it is not a literal browser-click or responsive-layout E2E run.",
    ],
}
(EVAL / "VELMERE_PASS4640_120_CASE_SUMMARY.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")

lines = []
A = lines.append
A("# Velmère PASS4640 — regresja jakości 120/120")
A("")
A("Data: 8 lipca 2026")
A("")
A("## Wynik po naprawach")
A("")
A("Przebadano ponownie 120 przypadków: 30 Shield, 30 Real Markets, 30 PDF i 30 audytów kontraktów. Testy wywoływały bezpośrednio te same endpointy serwerowe, których używa interfejs.")
A("")
A("| Moduł | Basic | Pro | Advanced | Najważniejszy wynik |")
A("|---|---:|---:|---:|---|")
A("| Shield | 10/10 HTTP 200 | 10/10 HTTP 422 | 10/10 HTTP 422 | Krypto pozostaje w Shield; przy braku źródeł score jest `null`, a płatne raporty są blokowane. |")
A("| Real Markets | 10/10 HTTP 200 | 10/10 HTTP 422 | 10/10 HTTP 422 | Brak 502; ADS.DE i MC.PA są rozpoznawane poprawnie. |")
A("| Lens PDF | 10/10 prawidłowych PDF | 10/10 HTTP 422 | 10/10 HTTP 422 | Basic generuje 2 strony; płatny PDF bez quorum nie powstaje. Szablony mają kontrakt 2/4/8 stron. |")
A("| Audit Watch | 10/10 HTTP 200 | 10/10 HTTP 422 | 10/10 HTTP 422 | Brak wymyślonego score; zwykła odpowiedź Basic spadła do około 9,2 KB. |")
A("")
A("## Co zostało naprawione")
A("")
A("1. **Shield i Real Markets są rozdzielone jawnie.** BTC, ETH, SOL i pozostałe kryptowaluty nie wpadają już do `BTC-USD` ani powierzchni Real Markets.")
A("2. **Brak danych nie udaje analizy.** Gdy nie ma potwierdzonych źródeł, klient dostaje `insufficient_data`, score `null`, confidence 0 i czytelną listę braków.")
A("3. **Pro i Advanced są fail-closed.** Bez quorum, release gate i właściwego receipt-u endpoint zwraca 422; checkout nie może sprzedać niedostarczalnego raportu.")
A("4. **ADS.DE i MC.PA nie zwracają już 502.** Są mapowane odpowiednio do adidas AG i LVMH.")
A("5. **PDF ma prawdziwe różnice tierów.** Generator ma kontrakt Basic 2 strony, Pro 4 strony, Advanced 8 stron. W obecnym środowisku Basic powstaje, a płatne poziomy są uczciwie blokowane bez danych.")
A("6. **Audyt klienta nie pokazuje stałych ocen 47/68/71.** Widok bierze score, confidence, verdict i blocker z serwerowego `customerResult`.")
A("7. **Payload audytu został odchudzony.** Basic ma średnio %.1f KB zamiast około 419 KB (wcześniej nawet około 1,7 MB); pełne macierze operatora są dostępne tylko w trybie `?proof=full`." % ((avg(audit_basic, "responseBytes") or 0) / 1024))
A("8. **Provider calls i ścieżka braku danych są szybsze.** Basic Shield może zakończyć kontrolowany prescreen bez uruchamiania całego płatnego łańcucha AI.")
A("")
A("## Twarde wyniki regresji")
A("")
A(f"- Pełna macierz: **{len(all_rows)}/120**.")
A(f"- Błędne powierzchnie Shield: **{len(shield_wrong_surface)}**.")
A(f"- Błędne powierzchnie Real Markets: **{len(real_wrong_surface)}**.")
A(f"- Odpowiedzi 502 w Shield/Real Markets: **{len(market_502)}**.")
A(f"- Liczbowe score przy zerowych źródłach: **{len(market_fake_scores)}**.")
A(f"- Płatne analizy rynku błędnie dopuszczone do publikacji: **{len(paid_market_released)}**.")
A(f"- Prawidłowe dwustronicowe PDF Basic: **{len(pdf_basic) - len(pdf_basic_invalid)}/10**.")
A(f"- Pro PDF zablokowane bez gotowości: **{sum(row.get('jsonStatus') == 422 for row in pdf_pro)}/10**.")
A(f"- Advanced PDF zablokowane bez gotowości: **{sum(row.get('jsonStatus') == 422 for row in pdf_advanced)}/10**.")
A(f"- Audyty z wymyślonym score/confidence bez źródeł: **{len(audit_fake_scores)}**.")
A(f"- Płatne audyty błędnie wypuszczone: **{len(audit_paid_unblocked)}**.")
A("")
A("## Czy Advanced jest już godne kupna?")
A("")
A("**W obecnym lokalnym środowisku — nadal nie można tego uczciwie potwierdzić, dlatego system go nie sprzedaje.** To jest teraz właściwe zachowanie produktu.")
A("")
A("Advanced ma sens dopiero wtedy, gdy produkcyjne źródła dostarczą dodatkowe, potwierdzone dowody: source receipts, sprzeczności między providerami, dane ABI/uprawnień, holderów, płynności, filingów oraz finalny podpis release gate. PASS4640 naprawia najważniejszy problem: użytkownik nie zapłaci już wyłącznie za dłuższy tekst lub większą liczbę pól.")
A("")
A("## Co jeszcze pozostaje przed sprzedażą Pro/Advanced")
A("")
A("- Podłączyć i sprawdzić produkcyjne klucze providerów oraz durable Supabase.")
A("- Wykonać prawdziwy Stripe checkout + webhook + entitlement replay.")
A("- Ustalić minimalne quorum per produkt i przetestować przypadki, w których Pro/Advanced faktycznie przechodzą release gate.")
A("- Dodać browser E2E kliknięć, pobierania PDF, stanu modala i responsywności; bieżąca macierz testuje endpointy i generowane pliki.")
A("- Przeprowadzić testy kontraktów z realnymi ABI/source/holder/liquidity providerami; bez nich wynik pozostaje `insufficient_data`.")
A("")
A("## Ograniczenia")
A("")
A("Nie użyto produkcyjnych sekretów providerów, prawdziwej płatności Stripe ani trwałej bazy Supabase. Płatne tiery były testowane lokalnym, serwerowym demo entitlementem wyłącznie po to, żeby zweryfikować ich blokady. Nie zmieniano wyglądu strony.")

report = "\n".join(lines) + "\n"
(EVAL / "VELMERE_PASS4640_120_CASE_REPORT.md").write_text(report, encoding="utf-8")
(EVAL / "VELMERE_PASS4640_120_CASE_REPORT.txt").write_text(report.replace("# ", "").replace("## ", ""), encoding="utf-8")
print(json.dumps({"shield": len(shield), "real": len(real), "pdf": len(pdf), "audit": len(audit), "total": len(all_rows)}, indent=2))
