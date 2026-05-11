@echo off
title Hossam Agent (Desktop Companion)
setlocal
cd /d "%~dp0"

echo ============================================================
echo   Hossam Agent  ^|  Desktop Companion (Electron)
echo ============================================================
echo.

REM ---- Check Node.js -----------------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo Download Node.js 20+ from https://nodejs.org/
  echo.
  pause
  exit /b 1
)

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

REM ---- Install Electron deps if missing ---------------------------------
if not exist "node_modules\electron" (
  echo [SETUP] Installing Electron dependencies for the first time...
  echo This downloads ~280 MB. It will only happen once.
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
  echo.
)

echo.
echo ------------------------------------------------------------
echo   Backend will boot automatically.
echo   Companion window opens once http://localhost:12393 is up.
echo   Right-click the tray icon for menu options.
echo ------------------------------------------------------------
echo.

call npm start

echo.
echo [Stopped]
pause
endlocal