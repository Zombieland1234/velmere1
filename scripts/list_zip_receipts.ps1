Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("_VELMERE_BACKUP/VELMERE_FULL_CURRENT_REPOSITORY_CONTROL_2026-08-28.zip")
$entries = $zip.Entries | Where-Object { $_.FullName -like "*PASS35*" -or $_.FullName -like "*RECEIPT*" }
Write-Output "Found: $($entries.Count)"
foreach ($e in $entries | Select-Object -First 30) {
    Write-Output "  $($e.FullName)"
}
$zip.Dispose()
