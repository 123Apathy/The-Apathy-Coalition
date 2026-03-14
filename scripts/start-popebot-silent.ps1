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

function Start-BackgroundLauncher {
  $launcherPath = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) 'start-popebot-wsl.ps1'
  if (-not (Test-Path $launcherPath)) {
    throw "Launcher script not found: $launcherPath"
  }

  $argumentParts = @(
    '-NoProfile'
    '-ExecutionPolicy', 'Bypass'
    '-File', ('"{0}"' -f $launcherPath)
    '-Distro', ('"{0}"' -f $Distro)
    '-ProjectPath', ('"{0}"' -f $ProjectPath)
    '-AppUrl', ('"{0}"' -f $script:ResolvedAppUrl)
    '-ControlTowerPath', ('"{0}"' -f $ControlTowerPath)
    '-ControlTowerUrl', ('"{0}"' -f $script:ResolvedControlTowerUrl)
    '-RepoRoot', ('"{0}"' -f $RepoRoot)
  )

  if ($OpenBrowser) {
    $argumentParts += '-OpenBrowser'
  }

  $argumentString = $argumentParts -join ' '
  Start-Process -FilePath 'powershell.exe' -ArgumentList $argumentString -WindowStyle Hidden | Out-Null
}

function Show-Splash {
  Add-Type -AssemblyName PresentationCore, PresentationFramework, WindowsBase

  [xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Width="680"
        Height="280"
        WindowStartupLocation="CenterScreen"
        WindowStyle="None"
        AllowsTransparency="True"
        Background="Transparent"
        ShowInTaskbar="False"
        Topmost="True"
        ResizeMode="NoResize">
  <Grid Background="Transparent">
    <Border HorizontalAlignment="Center"
            VerticalAlignment="Center"
            CornerRadius="34"
            Padding="26"
            Background="#11000000">
      <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
        <Viewbox Width="124" Height="140" Margin="0,0,18,0">
          <Canvas Width="160" Height="180">
            <Canvas.Effect>
              <DropShadowEffect Color="#AA000000" ShadowDepth="0" BlurRadius="18" Opacity="0.9"/>
            </Canvas.Effect>
            <Ellipse Width="118" Height="158" Canvas.Left="21" Canvas.Top="11" Fill="#17181A"/>
            <Ellipse Width="98" Height="134" Canvas.Left="31" Canvas.Top="23">
              <Ellipse.Fill>
                <LinearGradientBrush StartPoint="0,0.1" EndPoint="1,0.9">
                  <GradientStop Color="#F7F7F7" Offset="0"/>
                  <GradientStop Color="#EFEFEF" Offset="0.62"/>
                  <GradientStop Color="#DADADA" Offset="1"/>
                </LinearGradientBrush>
              </Ellipse.Fill>
            </Ellipse>
            <Path Data="M28,14 C47,32 53,58 50,95 C47,127 57,153 78,173 L34,173 L26,13 Z"
                  Fill="#6F7277"
                  Opacity="0.78"
                  Stretch="Fill"
                  Width="52"
                  Height="160"
                  Canvas.Left="31"
                  Canvas.Top="23"/>
            <Path Data="M44,76 C56,73 69,72 79,72 C74,83 64,88 50,87 C47,84 45,80 44,76 Z"
                  Fill="#101113"
                  Width="35"
                  Height="15"
                  Stretch="Fill"
                  Canvas.Left="42"
                  Canvas.Top="73"/>
            <Path Data="M116,76 C104,73 91,72 81,72 C86,83 96,88 110,87 C113,84 115,80 116,76 Z"
                  Fill="#101113"
                  Width="35"
                  Height="15"
                  Stretch="Fill"
                  Canvas.Left="83"
                  Canvas.Top="73"/>
            <Path Data="M69,124 C76,121 84,121 91,124 C92,126 92,129 90,130 C83,132 76,132 70,131 C68,129 68,126 69,124 Z"
                  Fill="#101113"
                  Width="25"
                  Height="10"
                  Stretch="Fill"
                  Canvas.Left="68"
                  Canvas.Top="122"/>
          </Canvas>
        </Viewbox>
        <StackPanel VerticalAlignment="Center">
          <TextBlock Text="The Apathy Coalition"
                     HorizontalAlignment="Left"
                     FontSize="36"
                     FontWeight="SemiBold"
                     Foreground="#F5F5F5"
                     FontFamily="Segoe UI">
            <TextBlock.Effect>
              <DropShadowEffect Color="#66000000" ShadowDepth="0" BlurRadius="18" Opacity="1"/>
            </TextBlock.Effect>
          </TextBlock>
          <TextBlock Text="Local autonomous engineering workspace"
                     Margin="0,6,0,0"
                     HorizontalAlignment="Left"
                     FontSize="15"
                     Foreground="#C9CDD2"
                     FontFamily="Segoe UI" />
        </StackPanel>
      </StackPanel>
    </Border>
  </Grid>
</Window>
"@

  $reader = New-Object System.Xml.XmlNodeReader $xaml
  $window = [Windows.Markup.XamlReader]::Load($reader)
  $window.Opacity = 0

  $openedAt = [DateTime]::UtcNow
  $minimumDisplayMs = 1200
  $timeoutMs = 30000

  $fadeIn = New-Object Windows.Threading.DispatcherTimer
  $fadeIn.Interval = [TimeSpan]::FromMilliseconds(16)
  $fadeIn.Add_Tick({
    if ($window.Opacity -ge 0.98) {
      $window.Opacity = 1
      $fadeIn.Stop()
    } else {
      $window.Opacity += 0.12
    }
  })

  $fadeOut = New-Object Windows.Threading.DispatcherTimer
  $fadeOut.Interval = [TimeSpan]::FromMilliseconds(16)
  $fadeOut.Add_Tick({
    if ($window.Opacity -le 0.05) {
      $window.Opacity = 0
      $fadeOut.Stop()
      $window.Close()
    } else {
      $window.Opacity -= 0.14
    }
  })

  $poller = New-Object Windows.Threading.DispatcherTimer
  $poller.Interval = [TimeSpan]::FromMilliseconds(500)
  $poller.Add_Tick({
    $elapsedMs = ([DateTime]::UtcNow - $openedAt).TotalMilliseconds
    if ($elapsedMs -ge $timeoutMs) {
      $poller.Stop()
      $fadeOut.Start()
      return
    }

    try {
      $response = Invoke-WebRequest -Uri $script:ResolvedAppUrl -Method Head -MaximumRedirection 0 -TimeoutSec 2 -ErrorAction Stop
      if ($elapsedMs -ge $minimumDisplayMs -and $response.StatusCode -ge 200) {
        $poller.Stop()
        $fadeOut.Start()
      }
    } catch {
      if ($_.Exception.Response -and $elapsedMs -ge $minimumDisplayMs) {
        $poller.Stop()
        $fadeOut.Start()
      }
    }
  })

  $window.Add_ContentRendered({
    $fadeIn.Start()
    $poller.Start()
  })

  $window.ShowDialog() | Out-Null
}

if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) {
  throw 'WSL is required to launch The Apathy Coalition.'
}

$wslIp = Get-WslIpv4Address -DistroName $Distro
$script:ResolvedAppUrl = Resolve-ReachableUrl -CandidateUrl $AppUrl -FallbackIp $wslIp
$script:ResolvedControlTowerUrl = Resolve-ReachableUrl -CandidateUrl $ControlTowerUrl -FallbackIp $wslIp

Start-BackgroundLauncher
Show-Splash
