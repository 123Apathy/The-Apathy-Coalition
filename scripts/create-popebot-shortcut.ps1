param(
  [string]$ShortcutName = 'PopeBot (WSL)',
  [string]$ProjectRoot = '/home/vande/popebot-agent',
  [string]$Distro = 'Ubuntu',
  [string]$AppUrl = 'http://localhost:3000',
  [string]$ControlTowerPath = '/home/vande/popebot-control-tower',
  [string]$ControlTowerUrl = 'http://localhost:3010/dashboard/system-status',
  [string]$RepoRoot = '/home/vande/popebot-root'
)

$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$launcherPath = Join-Path $scriptRoot 'start-popebot-silent.vbs'

if (-not (Test-Path $launcherPath)) {
  throw "Launcher script not found: $launcherPath"
}

$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop ($ShortcutName + '.lnk')

$targetPath = Join-Path $env:SystemRoot 'System32\wscript.exe'
$arguments = "`"$launcherPath`" -Distro `"$Distro`" -ProjectPath `"$ProjectRoot`" -AppUrl `"$AppUrl`" -ControlTowerPath `"$ControlTowerPath`" -ControlTowerUrl `"$ControlTowerUrl`" -RepoRoot `"$RepoRoot`" -OpenBrowser"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetPath
$shortcut.Arguments = $arguments
$shortcut.WorkingDirectory = (Split-Path -Parent $launcherPath)
$shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,220"
$shortcut.Description = 'Launch The Apathy Coalition inside WSL without showing a console window.'
$shortcut.Save()

Write-Host "Created shortcut: $shortcutPath"
