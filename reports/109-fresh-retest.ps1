#!/usr/bin/env pwsh
# §109.21 — Fresh retest with different inputs (no fixes applied yet)

$ErrorActionPreference = "Stop"
$base = "http://localhost:3000"
$outFile = "C:\Users\marci\Desktop\Nowy folder\reports\109-fresh-retest.json"

# Fresh inputs (different from §109 run)
$customers = @(
  @{ id="FR01"; persona="Expert trader (fresh)"; product="Audit"; tier="Basic"; input="0x55d398326f990f9900a383dF5f5fFb5f5F5F5F5F"; chain="bsc"; locale="pl"; viewport="desktop" }
  @{ id="FR02"; persona="Defi auditor (fresh)"; product="Audit"; tier="Pro"; input="0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"; chain="bsc"; locale="en"; viewport="desktop" }
  @{ id="FR03"; persona="Risk analyst (fresh)"; product="Shield"; tier="Basic"; input="ALGO"; locale="en"; viewport="desktop" }
  @{ id="FR04"; persona="Mobile trader (fresh)"; product="Shield"; tier="Basic"; input="DOT"; locale="en"; viewport="mobile" }
  @{ id="FR05"; persona="Search tester (fresh)"; product="Browser"; tier="Basic"; input="ETH"; locale="en"; viewport="desktop" }
  @{ id="FR06"; persona="Angel skeptic (fresh)"; product="Angel"; tier="Basic"; input="What are common rug pull patterns?"; locale="en"; viewport="desktop" }
  @{ id="FR07"; persona="Audit skeptic (fresh)"; product="Audit"; tier="Basic"; input="0xMalicious"; chain="bsc"; locale="de"; viewport="desktop" }
  @{ id="FR08"; persona="EU customer (fresh)"; product="Real Markets"; tier="Basic"; input="SPY"; locale="de"; viewport="desktop" }
)

$results = @()
foreach ($c in $customers) {
  $r = @{
    customerId = $c.id
    persona = $c.persona
    product = $c.product
    tier = $c.tier
    input = $c.input
    chain = $c.chain
    viewport = $c.viewport
    locale = $c.locale
    timestamp = (Get-Date).ToString("o")
  }

  $route = switch ($c.product) {
    "Audit" { "/security/audits" }
    "Shield" { if ($c.tier -eq "Basic") { "/shield" } else { "/shield-pro" } }
    "Browser" { "/browser" }
    "Real Markets" { "/real-markets" }
    "Angel" { "/intelligence" }
  }

  $ua = if ($c.viewport -eq "mobile") {
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
  } else {
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  }

  try {
    $resp = Invoke-WebRequest -Uri "$base/$($c.locale)$route" -UseBasicParsing -TimeoutSec 30 -Headers @{"User-Agent" = $ua}
    $r.uiStatus = $resp.StatusCode
    $r.uiBytes = $resp.Content.Length
    $r.uiHasStopSell = $resp.Content -match 'NOT.{0,5}FOR.{0,5}SALE|Not for sale|nie na sprzeda'
  } catch {
    $r.uiStatus = "ERR"
  }

  # API test where applicable
  if ($c.product -in @("Audit", "Angel")) {
    $body = @{
      "Audit" = @{ chain = $c.chain; address = $c.input } | ConvertTo-Json
      "Angel" = @{ message = $c.input; locale = $c.locale } | ConvertTo-Json
    }[$c.product]
    try {
      $apiResp = Invoke-WebRequest -Uri "$base/api/$($c.product.ToLower())/$($c.tier.ToLower())/case" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 30
      $r.apiStatus = $apiResp.StatusCode
    } catch {
      $code = if ($_.Exception.Response) { $_.Exception.Response.StatusCode.Value__ } else { "ERR" }
      $r.apiStatus = $code
    }
  }

  $results += $r
}

$results | ConvertTo-Json -Depth 5 | Out-File -FilePath $outFile -Encoding UTF8
Write-Host "Saved $($results.Count) fresh retest customers"