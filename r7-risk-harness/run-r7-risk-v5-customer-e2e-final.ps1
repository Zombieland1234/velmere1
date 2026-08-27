$ErrorActionPreference = 'Stop'
$Source = Join-Path $PSScriptRoot 'run-r7-risk-v5-customer-e2e.ps1'
$Runtime = Join-Path $env:RUNNER_TEMP 'run-r7-risk-v5-customer-e2e-final-runtime.ps1'
$Text = Get-Content -LiteralPath $Source -Raw
$Old = 'https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/r7-risk-v5-e2e-oidc'
$New = 'https://yljjyowcvjgjcamffnvd.supabase.co/functions/v1/r7-risk-v5-e2e-final-oidc'
$Count = ([regex]::Matches($Text, [regex]::Escape($Old))).Count
if ($Count -ne 1) { throw "risk_final_helper_anchor_mismatch:$Count" }
$Text = $Text.Replace($Old, $New)
[IO.File]::WriteAllText($Runtime, $Text, [Text.UTF8Encoding]::new($false))
& pwsh -NoProfile -File $Runtime
if ($LASTEXITCODE -ne 0) { throw "risk_final_customer_e2e_failed:$LASTEXITCODE" }
