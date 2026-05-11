@echo off
title Open-LLM-VTuber (Gemini Edition)
setlocal
cd /d "%~dp0"

echo ============================================================
echo   Open-LLM-VTuber  ^|  Gemini Edition
echo ============================================================
echo.

REM ---- Check uv ----------------------------------------------------------
where uv >nul 2>&1
if errorlevel 1 (
  echo [ERROR] uv is not installed.
  echo Install with:
  echo     powershell -c "irm https://astral.sh/uv/install.ps1 ^| iex"
  echo.
  pause
  exit /b 1
)

REM ---- Check conf.yaml ---------------------------------------------------
if not exist "conf.yaml" (
  echo [SETUP] Creating conf.yaml from the default template...
  copy "config_templates\conf.default.yaml" "conf.yaml" >nul
  echo [NOTICE] Open conf.yaml and put your GEMINI_API_KEY in the required slots.
  echo.
)

REM ---- Sync deps if needed ----------------------------------------------
if not exist ".venv" (
  echo [SETUP] Preparing Python venv for the first time ^(may take a few minutes^)...
  uv sync
  if errorlevel 1 (
    echo [ERROR] Failed to set up the environment.
    pause
    exit /b 1
  )
  echo.
)

REM ---- Open browser after a short delay --------------------------------
start "" /b cmd /c "timeout /t 6 /nobreak >nul && start http://localhost:12393"

echo.
echo ------------------------------------------------------------
echo   Web:           http://localhost:12393
echo   Live Mode:     floating button (bottom-right of the page)
echo.
echo   Press Ctrl+C to stop the server.
echo ------------------------------------------------------------
echo.

uv run run_server.py

echo.
echo [Stopped]
pause
endlocal