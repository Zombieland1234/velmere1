# Velmère PASS 104 · Data Backbone

This pass implements a strict Zod-backed data validation layer for Market Integrity / VLM Shield.

## Added

- `lib/market-integrity/data-backbone.ts`
- `.env.example`

## Purpose

The Gemini architecture review flagged that the system needs hard typed schemas, validated inputs, env safety and fewer mock-like assumptions before real launch. The new data backbone normalizes numeric strings, validates token risk inputs and exposes runtime env readiness helpers.

## Current scope

- TokenRiskInput schema
- finite number normalization
- data-source warnings
- runtime env validation helper
- integration into `analyzeTokenRisk`

## Next required steps

- Move CoinGecko/DexScreener adapters to strict external API schemas.
- Add Etherscan/Alchemy contract adapter.
- Add OSINT source schema.
- Add JSON schema for AI structured outputs.
- Add a CI script that fails on unvalidated market data.
