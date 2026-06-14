"use client";

import { Search, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import AssetLogo from "@/components/market-integrity/AssetLogo";
import type { RealMarketSearchResult } from "@/lib/market-integrity/real-market-search";

type SearchPayload = {
  ok: boolean;
  providerMode: "catalog_live" | "curated_reference";
  results: RealMarketSearchResult[];
  resolution?: {
    autoOpen: boolean;
    exactSymbol: string | null;
    requiresExplicitSelection: boolean;
    ambiguousExactCount: number;
  };
};

const classLabel: Record<RealMarketSearchResult["assetClass"], string> = {
  stock: "stock",
  fx: "FX",
  etf: "ETF",
  real_estate: "real estate",
  commodity: "commodity",
  crypto: "crypto ref.",
  exchange_token: "exchange token",
};

export default function RealMarketSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RealMarketSearchResult[]>([]);
  const [providerMode, setProviderMode] =
    useState<SearchPayload["providerMode"]>("curated_reference");
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [exactSymbol, setExactSymbol] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const clean = query.trim();
    if (clean.length < 2) {
      setResults([]);
      setPending(false);
      setActiveIndex(0);
      return;
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPending(true);
      try {
        const response = await fetch(
          `/api/market-integrity/real-markets/search?q=${encodeURIComponent(clean)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const payload = (await response.json()) as SearchPayload;
        if (requestId !== requestIdRef.current) return;
        setResults(payload.ok ? payload.results : []);
        setProviderMode(payload.providerMode ?? "curated_reference");
        setExactSymbol(payload.resolution?.autoOpen ? payload.resolution.exactSymbol : null);
        setActiveIndex(0);
        setOpen(true);
      } catch {
        if (!controller.signal.aborted && requestId === requestIdRef.current) {
          setResults([]);
        }
      } finally {
        if (requestId === requestIdRef.current) setPending(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="shield-real-search" data-real-market-search="true" data-pass1985-real-search="three-results-no-chaos">
      <div className="shield-real-search-input-row">
        <Search className="h-4 w-4" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActiveIndex((current) =>
                Math.min(
                  current + 1,
                  Math.max(0, Math.min(results.length, 3) - 1),
                ),
              );
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((current) => Math.max(0, current - 1));
            }
            if (event.key === "Enter" && open) {
              event.preventDefault();
              const exact = exactSymbol
                ? results.find((item) => item.symbol === exactSymbol)
                : null;
              if (!exact) {
                setOpen(Boolean(results.length));
                return;
              }
              setQuery(exact.symbol);
              setOpen(false);
            }
          }}
          placeholder="Szukaj: NVDA, Apple, gold, EUR/USD, REIT..."
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-label="Szukaj instrumentu w Real Markets"
          aria-expanded={open && query.trim().length >= 2}
          aria-controls="real-market-search-results"
          aria-activedescendant={
            open && results[activeIndex]
              ? `real-market-search-result-${activeIndex}`
              : undefined
          }
        />
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        <span>
          {providerMode === "catalog_live" ? "global catalog" : "curated fallback"}
          {exactSymbol ? " · exact" : " · choose"}
        </span>
      </div>

      {open && query.trim().length >= 2 ? (
        <div
          id="real-market-search-results"
          className="shield-real-search-results"
          role="listbox"
          aria-label="Instrumenty Real Markets"
        >
          {results.length ? (
            results.slice(0, 3).map((item, index) => (
              <button
                key={item.id}
                id={`real-market-search-result-${index}`}
                type="button"
                className={`shield-real-search-result ${activeIndex === index ? "is-active" : ""}`}
                role="option"
                aria-selected={activeIndex === index}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => {
                  setQuery(item.symbol);
                  setOpen(false);
                }}
              >
                <AssetLogo
                  symbol={item.symbol}
                  name={item.name}
                  assetClass={item.assetClass}
                  compact
                />
                <div>
                  <strong>{item.symbol}</strong>
                  <span>{item.name}</span>
                  <small>
                    {item.exchange} · {item.country}
                    {item.currency ? ` · ${item.currency}` : ""}
                  </small>
                </div>
                <b>{classLabel[item.assetClass]}</b>
              </button>
            ))
          ) : (
            <p className="shield-real-search-empty">
              Brak trafienia. Spróbuj pełnej nazwy lub symbolu giełdowego.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
