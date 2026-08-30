$ErrorActionPreference='Stop'
if([string]::IsNullOrWhiteSpace($env:GEMINI_API_KEY) -or $env:GEMINI_API_KEY.Length -lt 16){ throw 'angel_gemini_secret_not_configured' }
$model = if([string]::IsNullOrWhiteSpace($env:GEMINI_MODEL)){'gemini-2.5-flash'}else{$env:GEMINI_MODEL}
$cases=@(
  @{locale='pl';prompt='Ile to 2 + 2? Odpowiedz tylko: 4.';kind='exact';value='4'},
  @{locale='pl';prompt='Ile dni ma tydzień? Odpowiedz tylko liczbą.';kind='exact';value='7'},
  @{locale='pl';prompt='Jaka jest stolica Polski? Odpowiedz jednym słowem.';kind='word';value='warszawa'},
  @{locale='pl';prompt='Ile minut ma godzina? Odpowiedz tylko liczbą.';kind='exact';value='60'},
  @{locale='en';prompt='What is 2 + 2? Answer only: 4.';kind='exact';value='4'},
  @{locale='en';prompt='How many days are in a week? Answer only with the number.';kind='exact';value='7'},
  @{locale='en';prompt='What is the capital of Germany? Answer with one word.';kind='word';value='berlin'},
  @{locale='en';prompt='How many minutes are in an hour? Answer only with the number.';kind='exact';value='60'},
  @{locale='de';prompt='Was ist 2 + 2? Antworte nur: 4.';kind='exact';value='4'},
  @{locale='de';prompt='Wie viele Tage hat eine Woche? Antworte nur mit der Zahl.';kind='exact';value='7'},
  @{locale='de';prompt='Was ist die Hauptstadt von Österreich? Antworte mit einem Wort.';kind='word';value='wien'},
  @{locale='de';prompt='Wie viele Minuten hat eine Stunde? Antworte nur mit der Zahl.';kind='exact';value='60'}
)
function Test-Answer([string]$Text,[string]$Kind,[string]$Value){$t=($Text.ToLowerInvariant().Trim()-replace '\s+',' ');if($Kind -eq 'exact'){return [regex]::IsMatch($t,"(^|\D)$Value($|\D)")};return [regex]::IsMatch($t,"(^|[^a-zà-ÿ])$Value([^a-zà-ÿ]|$)")}
function Invoke-Gemini([string]$Prompt){
  $payload=@{contents=@(@{parts=@(@{text=$Prompt})});generationConfig=@{temperature=0;maxOutputTokens=80}}|ConvertTo-Json -Depth 10 -Compress
  $uri="https://generativelanguage.googleapis.com/v1beta/models/$model`:generateContent"
  $last=''
  for($attempt=1;$attempt -le 4;$attempt++){
    try{
      $r=Invoke-WebRequest -Uri $uri -Method Post -Headers @{'x-goog-api-key'=$env:GEMINI_API_KEY} -ContentType 'application/json' -Body $payload -SkipHttpErrorCheck -TimeoutSec 60
      $status=[int]$r.StatusCode
      if($status -eq 200){return @{status=200;content=$r.Content;attempt=$attempt}}
      $last="http_${status}:"+([string]$r.Content).Substring(0,[Math]::Min(350,[string]$r.Content.Length))
      if($status -notin 429,500,502,503,504){break}
    }catch{$last=$_.Exception.Message}
    Start-Sleep -Seconds ([int][Math]::Pow(2,$attempt-1))
  }
  return @{status=0;content='';attempt=4;error=$last}
}
$results=@()
foreach($c in $cases){
  $call=Invoke-Gemini $c.prompt
  $status='PASS';$hash='';$error=$null;$text=''
  if($call.status -ne 200){$status='FAIL';$error=$call.error}else{
    try{$p=$call.content|ConvertFrom-Json -Depth 50;$text=(@($p.candidates[0].content.parts|ForEach-Object{[string]$_.text})-join ' ').Trim();if([string]::IsNullOrWhiteSpace($text)){throw 'gemini_empty_output'};$bytes=[Text.Encoding]::UTF8.GetBytes($text);$hash=(-join([Security.Cryptography.SHA256]::HashData($bytes)|ForEach-Object{$_.ToString('x2')}));if(-not(Test-Answer $text $c.kind $c.value)){$status='FAIL';$error='objective_answer_mismatch'}}catch{$status='FAIL';$error=$_.Exception.Message}
  }
  $results+=,[pscustomobject]@{locale=$c.locale;status=$status;outputHash=$hash;attempt=$call.attempt;error=$error}
}
$pass=@($results|Where-Object status -eq 'PASS').Count;$fail=$results.Count-$pass
New-Item -ItemType Directory -Force -Path 'artifacts/r7/angel'|Out-Null
[ordered]@{schemaVersion='velmere.r7.angel-real-provider-probe.v2';providerExecuted=($results.Count -gt 0);providerModel=$model;providerCallCount=$results.Count;providerPassCount=$pass;providerFailureCount=$fail;rawProviderPayloadReturned=$false;outputHashesOnly=$true;cases=$results;githubRunId=$env:GITHUB_RUN_ID;githubHeadSha=$env:GITHUB_SHA}|ConvertTo-Json -Depth 30|Set-Content 'artifacts/r7/angel/R7_ANGEL_GEMINI_PROVIDER_PROBE_V2.json' -Encoding utf8
if($fail -ne 0){throw "angel_gemini_probe_failed:$fail"}