param(
  [string]$Distro = 'Ubuntu',
  [string]$ProjectPath = '/home/vande/popebot-agent',
  [string]$AppUrl = 'http://localhost:3000',
  [string]$ControlTowerPath = '/home/vande/popebot-control-tower',
  [string]$ControlTowerUrl = 'http://localhost:3010/dashboard/system-status',
  [string]$RepoRoot = '/home/vande/popebot-root',
  [switch]$OpenBrowser
)

$ErrorActionPreference = 'Stop'

function Resolve-ReachableUrl {
  param(
    [string]$CandidateUrl,
    [string]$FallbackIp
  )

  if (-not $CandidateUrl) {
    return $CandidateUrl
  }

  try {
    $response = Invoke-WebRequest -Uri $CandidateUrl -Method Head -MaximumRedirection 0 -TimeoutSec 2 -ErrorAction Stop
    if ($response.StatusCode -ge 200) {
      return $CandidateUrl
    }
  } catch {
    if ($_.Exception.Response) {
      return $CandidateUrl
    }
  }

  if (-not $FallbackIp) {
    return $CandidateUrl
  }

  try {
    $uri = [System.Uri]$CandidateUrl
    $builder = New-Object System.UriBuilder($uri)
    $builder.Host = $FallbackIp
    return $builder.Uri.AbsoluteUri.TrimEnd('/')
  } catch {
    return $CandidateUrl
  }
}

function Get-WslIpv4Address {
  param([string]$DistroName)

  try {
    $output = & wsl.exe -d $DistroName -- hostname -I 2>$null
    if (-not $output) {
      return $null
    }

    foreach ($token in ($output -split '\s+')) {
      $candidate = $token.Trim()
      if ($candidate -match '^\d{1,3}(\.\d{1,3}){3}$' -and $candidate -notlike '127.*') {
        return $candidate
      }
    }
  } catch {}

  return $null
}

function Ensure-OllamaForWsl {
  $ollamaPath = Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama.exe'
  if (-not (Test-Path $ollamaPath)) {
    Write-Warning 'Ollama was not found in the default Windows install location. PopeBot chat may fail until Ollama is running.'
    return
  }

  $listener = Get-NetTCPConnection -LocalPort 11434 -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalAddress -in @('0.0.0.0', '::') } |
    Select-Object -First 1

  if ($listener) {
    return
  }

  $existing = Get-Process -Name ollama -ErrorAction SilentlyContinue
  if ($existing) {
    $existing | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
  }

  $command = '$env:OLLAMA_HOST=''0.0.0.0:11434''; Start-Process -FilePath "' + $ollamaPath + '" -ArgumentList ''serve'' -WindowStyle Hidden'
  Start-Process -FilePath 'powershell.exe' -ArgumentList @('-NoProfile', '-WindowStyle', 'Hidden', '-Command', $command) -WindowStyle Hidden | Out-Null

  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 500
    $listener = Get-NetTCPConnection -LocalPort 11434 -State Listen -ErrorAction SilentlyContinue |
      Where-Object { $_.LocalAddress -in @('0.0.0.0', '::') } |
      Select-Object -First 1
    if ($listener) {
      return
    }
  }

  Write-Warning 'Ollama did not come up on 0.0.0.0:11434 in time. PopeBot may not be able to reach local models from WSL yet.'
}

function Convert-ToWslPath {
  param([string]$WindowsPath)

  if ($WindowsPath.StartsWith('/')) {
    return $WindowsPath
  }

  $full = [System.IO.Path]::GetFullPath($WindowsPath)
  if ($full -match '^([A-Za-z]):\\(.*)$') {
    $drive = $matches[1].ToLowerInvariant()
    $rest = $matches[2] -replace '\\', '/'
    return "/mnt/$drive/$rest"
  }

  throw "Unsupported Windows path: $WindowsPath"
}

try {
  $null = Get-Command wsl.exe -ErrorAction Stop
} catch {
  throw 'WSL is not installed. Run `wsl --install` in an elevated PowerShell window first.'
}

$wslList = & wsl.exe -l -q 2>$null
if (-not $wslList) {
  throw 'No WSL distro is installed yet. Install Ubuntu with `wsl --install -d Ubuntu`, reboot, and complete first-launch setup.'
}

$distroExists = $false
foreach ($line in ($wslList -split "`r?`n")) {
  if ($line.Trim() -eq $Distro) {
    $distroExists = $true
    break
  }
}

if (-not $distroExists) {
  throw "WSL distro '$Distro' was not found. Installed distros: $($wslList -join ', ')"
}

Ensure-OllamaForWsl

$wslIp = Get-WslIpv4Address -DistroName $Distro
$resolvedAppUrl = Resolve-ReachableUrl -CandidateUrl $AppUrl -FallbackIp $wslIp
$resolvedControlTowerUrl = Resolve-ReachableUrl -CandidateUrl $ControlTowerUrl -FallbackIp $wslIp

$wslProjectPath = Convert-ToWslPath -WindowsPath $ProjectPath
$wslControlTowerPath = Convert-ToWslPath -WindowsPath $ControlTowerPath
$wslRepoRoot = Convert-ToWslPath -WindowsPath $RepoRoot
$wslScriptPath = Convert-ToWslPath -WindowsPath (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'start-popebot-wsl.sh')
& wsl.exe -d $Distro -- bash $wslScriptPath $wslProjectPath $resolvedAppUrl $wslControlTowerPath $resolvedControlTowerUrl $wslRepoRoot

if ($OpenBrowser) {
  Start-Process $resolvedAppUrl | Out-Null
}
