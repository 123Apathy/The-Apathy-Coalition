@echo off
setlocal

set "OLLAMA=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"
set "LOGDIR=%~dp0..\.runtime"
set "LOG=%LOGDIR%\ollama-pull.log"

if not exist "%LOGDIR%" mkdir "%LOGDIR%"

echo [%date% %time%] Starting Ollama pull queue>> "%LOG%"

call :pull gemma3:12b
call :pull deepseek-r1:14b
call :pull qwen2.5-coder:7b
call :pull qwen2.5vl
call :pull deepseek-ocr
call :pull nomic-embed-text-v2-moe
call :pull lfm2.5-thinking

echo [%date% %time%] Pull queue finished>> "%LOG%"
exit /b 0

:pull
echo [%date% %time%] Pulling %~1>> "%LOG%"
"%OLLAMA%" pull %~1 >> "%LOG%" 2>&1
if errorlevel 1 (
  echo [%date% %time%] Failed %~1>> "%LOG%"
) else (
  echo [%date% %time%] Completed %~1>> "%LOG%"
)
exit /b 0
