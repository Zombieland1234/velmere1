# R13C API / provider commercial-rights review — 2026-09-16

> Engineering primary-source review, **not legal advice and not provider approval**. A working key is not a licence. Unknown/restricted states stay fail-closed for customer-facing paid output.

| Provider | Status | Paid product | Customer display | Redistribution |
|---|---|---:|---:|---:|
| `alchemy` | **SERVICE_OK_INTERNAL_BUSINESS_SCOPE** | YES | NO | NO |
| `alpha_vantage` | **RESTRICTED** | NO | NO | NO |
| `angel_external` | **UNKNOWN_FAIL_CLOSED** | NO | NO | NO |
| `arkham` | **UNKNOWN_FAIL_CLOSED** | NO | NO | NO |
| `binance` | **UNKNOWN_FAIL_CLOSED** | NO | NO | NO |
| `blockaid` | **UNKNOWN_FAIL_CLOSED** | NO | NO | NO |
| `chainlink` | **UNKNOWN_FAIL_CLOSED** | NO | NO | NO |
| `coinbase` | **RESTRICTED** | NO | NO | NO |
| `coingecko` | **COMMERCIAL_OK_CONDITIONAL** | YES | YES | NO |
| `coinmarketcap` | **COMMERCIAL_OK_CONDITIONAL** | YES | YES | NO |
| `coinpaprika` | **COMMERCIAL_OK_CONDITIONAL** | YES | YES | NO |
| `contrado` | **UNKNOWN_FAIL_CLOSED** | NO | NO | NO |
| `defillama` | **RESTRICTED** | NO | NO | NO |
| `dexscreener` | **UNKNOWN_FAIL_CLOSED** | NO | NO | NO |
| `ecb` | **COMMERCIAL_OK_CONDITIONAL** | YES | YES | YES |
| `etherscan` | **COMMERCIAL_OK_WITH_SUBSCRIPTION_SCOPE_NO_REDISTRIBUTION** | YES | YES | NO |
| `fred` | **RESTRICTED_PER_SERIES_AND_USE** | NO | NO | NO |
| `gemini` | **COMMERCIAL_SERVICE_OK_CONDITIONAL** | YES | YES | NO |
| `kraken` | **RESTRICTED** | NO | NO | NO |
| `openai` | **COMMERCIAL_SERVICE_OK** | YES | YES | NO |
| `polygon` | **RESTRICTED** | NO | NO | NO |
| `printful` | **UNKNOWN_FAIL_CLOSED** | NO | NO | NO |
| `pyth` | **UNKNOWN_FAIL_CLOSED** | NO | NO | NO |
| `quicknode` | **SERVICE_OK_INTERNAL_SCOPE** | YES | NO | NO |
| `resend` | **UNKNOWN_FAIL_CLOSED** | NO | NO | NO |
| `rwa_xyz` | **UNKNOWN_FAIL_CLOSED** | NO | NO | NO |
| `stripe` | **COMMERCIAL_SERVICE_OK** | YES | YES | NO |
| `supabase` | **COMMERCIAL_SERVICE_OK_CONDITIONAL** | YES | YES | NO |
| `tapstitch` | **UNKNOWN_FAIL_CLOSED** | NO | NO | NO |
| `twelve_data` | **RESTRICTED_UNTIL_BUSINESS_PLAN_PROVEN** | NO | NO | NO |

## Rules for Velmère

1. `UNKNOWN`/`RESTRICTED` sources may be used only where the provider terms and our evidence permit it; they must not silently leak into customer-facing paid reports.
2. No raw provider feed resale unless an explicit redistribution licence is stored.
3. AI/model-provider terms never override source-data rights. The market/data provider must separately permit the input/use.
4. Plan identity must be evidenced (account/contract/order form), not inferred from the existence of an API key.
5. Attribution, freshness, cache/retention and region/exchange restrictions are enforced per provider/use case.

## Provider-specific requirements and primary sources

### alchemy — SERVICE_OK_INTERNAL_BUSINESS_SCOPE
Suitable as infrastructure, not proof of rights to redistribute Alchemy service/data.
- Use Alchemy service for Velmere internal business/backend benefit within licensed volume
- Do not resell/rent/lease Alchemy service or allow third-party use outside the agreement
- Treat underlying chain data/content rights separately from Alchemy service access
- Primary source: https://legal.alchemy.com/

### alpha_vantage — RESTRICTED
Default licence is personal/non-commercial unless otherwise agreed in writing.
- Obtain a written commercial agreement/licence from Alpha Vantage before customer-facing paid use
- Review additional exchange/regulatory licensing for realtime/delayed US data
- Primary sources: https://www.alphavantage.co/terms_of_service/ and https://www.alphavantage.co/licensing/

### coinbase — RESTRICTED
Default Market Data licence is personal/internal research; third-party display/dissemination and derived works are restricted.
- Obtain prior express written Coinbase consent / authorized redistribution agreement for third-party display or derived works
- Do not use default Market Data licence to build end-user market-data application
- Primary source: https://www.coinbase.com/legal/market_data

### coingecko — COMMERCIAL_OK_CONDITIONAL
Current Velmere API-plan entitlement is not proven here; keep customer egress blocked until plan identity is evidenced.
- Use a Basic/Analyst/Lite/Pro or custom/Enterprise license whose scope covers the deployment
- Prominent attribution: Data provided by CoinGecko + link
- Do not resell/redistribute/syndicate raw API/data without custom license
- Primary sources: https://www.coingecko.com/en/api/pricing ; https://www.coingecko.com/en/api_terms ; https://support.coingecko.com/hc/en-us/articles/16760512207257-What-Are-the-Differences-Between-Commercial-and-Custom-Licenses

### coinmarketcap — COMMERCIAL_OK_CONDITIONAL
Commercial-use wording is explicit on current pricing page, but exact active plan/account entitlement still needs evidence.
- Use a plan carrying commercial-use rights
- Integrated component of one larger product; not standalone data resale/redistribution
- Respect plan/user limits and applicable attribution/brand terms
- Primary source: https://coinmarketcap.com/api/pricing/

### coinpaprika — COMMERCIAL_OK_CONDITIONAL
Free plan is not commercial.
- Use a non-Free commercial plan
- Attribution and plan limits apply
- Enterprise/separate rights required for redistribution
- Primary sources: https://coinpaprika.com/api-terms-of-use/ and https://docs.coinpaprika.com/api-plans

### defillama — RESTRICTED
Keep diagnostic/internal only unless written permission is stored.
- Obtain prior written permission for commercial exploitation/republishing/resale
- Primary source: https://defillama.com/terms

### ecb — COMMERCIAL_OK_CONDITIONAL
Good candidate for customer-facing reference statistics when source scope and freshness are enforced.
- Use only publicly available ESCB statistics covered by reuse policy
- Quote source, e.g. `Source: ECB statistics.`
- Do not modify statistics/metadata
- Do not assume third-party/confidential ECB-hosted data are covered
- Primary source: https://www.ecb.europa.eu/stats/ecb_statistics/governance_and_quality_framework/html/usage_policy.en.html

### etherscan — COMMERCIAL_OK_WITH_SUBSCRIPTION_SCOPE_NO_REDISTRIBUTION
Current 2026 API terms permit API Data/Output within own Customer Applications under applicable subscription/licence entitlements and permit runtime AI use, but not model training/benchmarking/dataset creation. Redistribution, resale, external sharing and extended retention/cache need separate rights unless expressly permitted.
- Primary sources: https://etherscan.io/apiterms and https://etherscan.io/terms

### fred — RESTRICTED_PER_SERIES_AND_USE
No blanket commercial clearance. Series owner rights and API restrictions apply independently.
- Classify every series copyright/owner before use
- For client reports, use only series whose label permits commercial/client-report use and preserve attribution
- FRED API terms prohibit AI use and storing/caching/archiving FRED content; do not feed FRED API content into AI or persist it
- Display required FRED API notice and terms link where applicable
- Primary sources: https://fred.stlouisfed.org/docs/api/terms_of_use.html and https://fred.stlouisfed.org/legal/terms/

### gemini — COMMERCIAL_SERVICE_OK_CONDITIONAL
Gemini API is intended for professional/business development. Output ownership is not claimed by Google, but input/data rights remain Velmere responsibility.
- For EEA/Switzerland/UK end-user API Clients use Paid Services
- Users must be 18+; do not target likely under-18 users
- Google Search grounding has separate no-cache/no-resale/no-training restrictions
- Primary sources: https://ai.google.dev/gemini-api/terms and https://ai.google.dev/gemini-api/docs/usage-policies

### kraken — RESTRICTED
Public endpoint availability is not commercial-use permission.
- Obtain prior permission for non-personal commercial use of public API market data from `marketdata@kraken.com`
- Store written permission and exact data/use scope before customer egress
- Primary sources: https://docs-legacy.kraken.com/api/docs/guides/global-intro/ and https://www.kraken.com/legal/global-terms

### openai — COMMERCIAL_SERVICE_OK
OpenAI API rights do not cure missing rights in third-party market/provider data.
- API may be integrated into Customer Applications and offered to End Users
- Do not buy/sell/transfer API keys
- Velmere must have rights to all Inputs/third-party data supplied to the API
- Primary sources: https://openai.com/policies/services-agreement/ and https://openai.com/policies/service-terms/

### polygon — RESTRICTED
Market Data Terms restrict third-party display, redistribution, derived works and commercial use absent consent/licence.
- Obtain express written consent and/or applicable Third Party Provider market-data licence for business/commercial display/derived works
- Primary source: https://polygon.io/terms/market_data_terms.pdf

### quicknode — SERVICE_OK_INTERNAL_SCOPE
Infrastructure usage can support a commercial product, but QuickNode service itself cannot be redistributed.
- Use as backend infrastructure within subscription
- Do not sublicense/sell/resell/rent/distribute or allow QuickNode products for third-party benefit beyond agreement
- Treat underlying chain data rights separately
- Primary source: https://www.quicknode.com/terms

### stripe — COMMERCIAL_SERVICE_OK
Payment processor/service, not a source-data redistribution licence.
- Use Stripe services for Velmere business purposes and according to Documentation/SSA
- Keep secret keys server-side; use sandbox for tests
- Primary source: https://stripe.com/legal/ssa

### supabase — COMMERCIAL_SERVICE_OK_CONDITIONAL
Supabase is backend/platform infrastructure; this does not grant rights to stored third-party data.
- Do not expose service-role/secret keys to clients
- Underlying stored/provider data rights remain Velmere responsibility
- Primary source: https://supabase.com/docs/guides/integrations/supabase-for-platforms

### twelve_data — RESTRICTED_UNTIL_BUSINESS_PLAN_PROVEN
Individual Basic/Grow/Pro/Ultra do not permit commercial display to third parties.
- Prove Venture/Enterprise/Enterprise+ business plan
- Confirm exchange-specific approvals, especially outside US
- Separate redistribution agreement for redistribution/white-label use
- Primary sources: https://support.twelvedata.com/en/articles/5332349-commercial-and-personal-usage ; https://twelvedata.com/terms ; https://twelvedata.com/pricing

## Still fail-closed / current primary-source proof incomplete

`angel_external`, `arkham`, `binance`, `blockaid`, `chainlink`, `contrado`, `dexscreener`, `printful`, `pyth`, `resend`, `rwa_xyz`, `tapstitch` remain `UNKNOWN_FAIL_CLOSED` until a current official terms/order-form or written provider permission is stored and tied to the exact Velmere use case. No customer-facing paid egress should be granted from those provider families merely because technical access works.
