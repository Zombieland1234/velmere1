#!/usr/bin/env pwsh
# §108.3 Mandatory product flows — 20 customer rows
# Real HTTP requests to localhost:3000 (Next.js standalone server)

$ErrorActionPreference = "Stop"
$base = "http://localhost:3000"
$locales = @("en", "pl", "de")
$outFile = "C:\Users\marci\Desktop\Nowy folder\reports\108-product-flows.json"

$products = @(
  @{ n="Audit Basic"; route="/security/audits" }
  @{ n="Audit Pro"; route="/security/audits" }
  @{ n="Audit Advanced"; route="/security/audits" }
  @{ n="Browser Basic"; route="/browser" }
  @{ n="Browser Pro"; route="/browser" }
  @{ n="Browser Advanced"; route="/browser" }
  @{ n="Shield Basic"; route="/shield" }
  @{ n="Shield Pro"; route="/shield-pro" }
  @{ n="Shield Advanced"; route="/shield-pro" }
  @{ n="Shield Pro Basic"; route="/shield-pro" }
  @{ n="Shield Pro Pro"; route="/shield-pro" }
  @{ n="Shield Pro Advanced"; route="/shield-pro" }
  @{ n="Real Markets Basic"; route="/real-markets" }
  @{ n="Real Markets Pro"; route="/real-markets" }
  @{ n="Real Markets Advanced"; route="/real-markets" }
  @{ n="Shield Map"; route="/shield-map" }
  @{ n="Market Impact"; route="/market-integrity" }
  @{ n="Whale Watch"; route="/market-integrity" }
  @{ n="Angel"; route="/intelligence" }
  @{ n="Risk Indicator"; route="/intelligence" }
)

$results = @()
foreach ($p in $products) {
  $r = @{
    product = $p.n
    route = $p.route
    locales = @()
  }
  foreach ($loc in $locales) {
    try {
      $resp = Invoke-WebRequest -Uri "$base/$loc$($p.route)" -UseBasicParsing -TimeoutSec 30
      $c = [System.Text.Encoding]::UTF8.GetString([System.Text.Encoding]::UTF8.GetBytes($resp.Content))
      $hasNotForSale = $c -match 'NOT.{0,5}FOR.{0,5}SALE|Not for sale|Nicht verkauft|Niedostępne|Niedostepne|nie na sprzedaż'
      $hasFree = $c -match 'Free|Bezp\xc5\x82atnie|Kostenlos'
      $hasBasic = $c -match 'Basic'
      $hasTier = $c -match 'Pro|Advanced'
      $r.locales += @{
        locale = $loc
        status = $resp.StatusCode
        length = $resp.Content.Length
        hasNotForSale = $hasNotForSale
        hasFree = $hasFree
        hasBasic = $hasBasic
        hasTier = $hasTier
      }
    } catch {
      $r.locales += @{
        locale = $loc
        status = "ERR"
        error = $_.Exception.Message
      }
    }
  }
  $results += $r
}

$results | ConvertTo-Json -Depth 10 | Out-File -FilePath $outFile -Encoding UTF8
Write-Host "Saved to $outFile"
Write-Host "Total: $($results.Count) products x 3 locales = $($results.Count * 3) requests"