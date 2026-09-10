Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("_VELMERE_BACKUP/VELMERE_FULL_CURRENT_REPOSITORY_CONTROL_2026-08-28.zip")
$entries = $zip.Entries | Where-Object { $_.FullName -like "*_velmere/pass35*" }
Write-Output "Found: $($entries.Count)"
foreach ($e in $entries) {
    Write-Output $e.FullName
    $dest = $e.FullName
    $dir = Split-Path $dest
    if ($dir -and !(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($e, $dest, $true)
}
$zip.Dispose()
Write-Output "Extraction complete"
