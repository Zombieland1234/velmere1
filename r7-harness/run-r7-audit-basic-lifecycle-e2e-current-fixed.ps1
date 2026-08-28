$ErrorActionPreference = 'Stop'

$Source = Join-Path $PSScriptRoot 'run-r7-audit-basic-lifecycle-e2e-current.ps1'
$Fixed = Join-Path $env:RUNNER_TEMP 'run-r7-audit-basic-lifecycle-e2e-current-fixed-runtime.ps1'
$Text = Get-Content -LiteralPath $Source -Raw

$BrokenReturn = 'return[pscustomobject]@{'
$CorrectReturn = 'return [pscustomobject]@{'
$ReturnCount = ([regex]::Matches($Text, [regex]::Escape($BrokenReturn))).Count
if ($ReturnCount -ne 1) { throw "audit_lifecycle_return_anchor_mismatch:$ReturnCount" }
$Text = $Text.Replace($BrokenReturn, $CorrectReturn)

$BrokenDepth = 'ConvertTo-Json -Depth20'
$CorrectDepth = 'ConvertTo-Json -Depth 20'
$DepthCount = ([regex]::Matches($Text, [regex]::Escape($BrokenDepth))).Count
if ($DepthCount -ne 2) { throw "audit_lifecycle_depth_anchor_mismatch:$DepthCount" }
$Text = $Text.Replace($BrokenDepth, $CorrectDepth)

# Customer bridge response v4 keeps report fields under Body.data. Repair only the
# three legacy lifecycle read anchors; do not change bridge/product semantics.
$ShapeRepairs = @(
  @{ Old = '$Read.Body.pdfDigest'; New = '$Read.Body.data.pdfDigest'; Label = 'read_pdf_digest' },
  @{ Old = '$Read.Body.pdfBase64'; New = '$Read.Body.data.pdfBase64'; Label = 'read_pdf_base64' },
  @{ Old = '$Read2.Body.pdfBase64'; New = '$Read2.Body.data.pdfBase64'; Label = 'read2_pdf_base64' }
)
foreach ($Repair in $ShapeRepairs) {
  $Count = ([regex]::Matches($Text, [regex]::Escape([string]$Repair.Old))).Count
  if ($Count -ne 1) { throw "audit_lifecycle_response_shape_anchor_mismatch:$($Repair.Label):$Count" }
  $Text = $Text.Replace([string]$Repair.Old, [string]$Repair.New)
}

[IO.File]::WriteAllText($Fixed, $Text, [Text.UTF8Encoding]::new($false))

& pwsh -NoProfile -File $Fixed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
