@echo off
setlocal

set "OLLAMA=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
set "LOGDIR=%~dp0..\.runtime"
set "LOG=%LOGDIR%\ollama-pull-popebot.log"
set "MIN_FREE_GB=10"

if not exist "%LOGDIR%" mkdir "%LOGDIR%"

echo [%date% %time%] Starting PopeBot Ollama pull queue>> "%LOG%"
echo [%date% %time%] Minimum free space guard: %MIN_FREE_GB% GB>> "%LOG%"

call :pull qwen2.5-coder:7b
call :pull nomic-embed-text-v2-moe
call :pull lfm2.5-thinking
call :pull deepseek-r1:14b
call :pull qwen2.5vl
call :pull deepseek-ocr

echo [%date% %time%] PopeBot pull queue finished>> "%LOG%"
exit /b 0

:checkfree
for /f %%A in ('powershell -NoProfile -Command "[math]::Floor((Get-PSDrive C).Free / 1GB)"') do set "FREE_GB=%%A"
if not defined FREE_GB set "FREE_GB=0"
if %FREE_GB% LSS %MIN_FREE_GB% (
  echo [%date% %time%] Stopping queue because free space dropped below %MIN_FREE_GB% GB. Current free: %FREE_GB% GB>> "%LOG%"
  exit /b 1
)
exit /b 0

:pull
call :checkfree
if errorlevel 1 exit /b 1
echo [%date% %time%] Pulling %~1>> "%LOG%"
"%OLLAMA%" pull %~1 >> "%LOG%" 2>&1
if errorlevel 1 (
  echo [%date% %time%] Failed %~1>> "%LOG%"
  exit /b 1
) else (
  echo [%date% %time%] Completed %~1>> "%LOG%"
)
exit /b 0
