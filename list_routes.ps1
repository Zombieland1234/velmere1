Set-Location "C:\Users\marci\Desktop\Nowy folder"
Get-ChildItem -Path "app" -Recurse -File | ForEach-Object { $_.FullName } | Out-File -Encoding utf8 "C:\Users\marci\Desktop\Nowy folder\naprawa\app_files.txt"

