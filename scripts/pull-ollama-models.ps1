$ErrorActionPreference = 'Stop'

$ollama = Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama.exe'
if (-not (Test-Path $ollama)) {
  throw "Ollama not found at $ollama"
}

$models = @(
  'gemma3:12b',
  'deepseek-r1:14b',
  'qwen2.5-coder:7b',
  'qwen2.5vl',
  'deepseek-ocr',
  'nomic-embed-text-v2-moe',
  'lfm2.5-thinking'
)

$logDir = Join-Path $PSScriptRoot '..\.runtime'
$logDir = [System.IO.Path]::GetFullPath($logDir)
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$logPath = Join-Path $logDir 'ollama-pull.log'
$statePath = Join-Path $logDir 'ollama-pull-state.json'

"[$(Get-Date -Format s)] Starting Ollama pull queue" | Out-File -FilePath $logPath -Encoding utf8

$state = [ordered]@{
  started_at = (Get-Date).ToString('s')
  completed = @()
  failed = @()
  pending = $models
}
$state | ConvertTo-Json -Depth 4 | Out-File -FilePath $statePath -Encoding utf8

foreach ($model in $models) {
  Add-Content -Path $logPath -Value "[$(Get-Date -Format s)] Pulling $model"
  $quotedOllama = '"' + $ollama + '"'
  $cmd = "$quotedOllama pull $model >> `"$logPath`" 2>&1"
  cmd.exe /d /c $cmd | Out-Null
  if ($LASTEXITCODE -eq 0) {
    $state.completed += $model
    $state.pending = @($state.pending | Where-Object { $_ -ne $model })
    $state | ConvertTo-Json -Depth 4 | Out-File -FilePath $statePath -Encoding utf8
    Add-Content -Path $logPath -Value "[$(Get-Date -Format s)] Completed $model"
  } else {
    $state.failed += [ordered]@{
      model = $model
      error = "ollama pull exited with code $LASTEXITCODE"
      failed_at = (Get-Date).ToString('s')
    }
    $state.pending = @($state.pending | Where-Object { $_ -ne $model })
    $state | ConvertTo-Json -Depth 4 | Out-File -FilePath $statePath -Encoding utf8
    Add-Content -Path $logPath -Value "[$(Get-Date -Format s)] Failed $model : exit code $LASTEXITCODE"
  }
}

Add-Content -Path $logPath -Value "[$(Get-Date -Format s)] Pull queue finished"
