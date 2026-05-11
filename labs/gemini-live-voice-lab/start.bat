@echo off
title Gemini Live Voice Lab
setlocal
cd /d "%~dp0"

echo ============================================================
echo   Gemini Live Voice Lab
echo ============================================================
echo.

REM ---- Check Node.js -----------------------------------------------------
where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo Download it from https://nodejs.org/  ^(version 20 or newer^)
  echo.
  pause
  exit /b 1
)

REM ---- Check .env --------------------------------------------------------
if not exist ".env" (
  echo [ERROR] .env file is missing.
  echo Create .env with:
  echo     GEMINI_API_KEY=your_key_here
  echo     PORT=3000
  echo.
  pause
  exit /b 1
)

REM ---- Install deps if missing ------------------------------------------
if not exist "node_modules\concurrently" (
  echo [SETUP] Installing packages for the first time ^(may take a minute^)...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
  echo.
)

REM ---- Open browser after a short delay --------------------------------
start "" /b cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:5173"

echo.
echo ------------------------------------------------------------
echo   Web:    http://localhost:5173
echo   API:    http://localhost:3000   ^(WS: /ws^)
echo.
echo   Press Ctrl+C to stop both servers.
echo ------------------------------------------------------------
echo.

call npm run dev

echo.
echo [Stopped]
pause
endlocal