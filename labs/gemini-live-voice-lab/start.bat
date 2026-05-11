@echo off
chcp 65001 > nul
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
  echo [خطأ] Node.js غير مثبت.
  echo حمّله من https://nodejs.org/  (الإصدار 20 أو أحدث)
  echo.
  pause
  exit /b 1
)

REM ---- Check .env --------------------------------------------------------
if not exist ".env" (
  echo [خطأ] ملف .env غير موجود.
  echo أنشئ ملف .env وضع فيه:
  echo     GEMINI_API_KEY=your_key_here
  echo     PORT=3000
  echo.
  pause
  exit /b 1
)

REM ---- Install deps if missing ------------------------------------------
if not exist "node_modules\concurrently" (
  echo [إعداد] جاري تثبيت الحزم لأول مرة ^(قد يستغرق دقيقة^)...
  call npm install
  if errorlevel 1 (
    echo [خطأ] فشل تثبيت الحزم.
    pause
    exit /b 1
  )
  echo.
)

REM ---- Open browser after a short delay (in a separate window) ---------
start "" /b cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:5173"

echo.
echo ------------------------------------------------------------
echo   الواجهة:  http://localhost:5173
echo   الخادم:   http://localhost:3000   (WS: /ws)
echo.
echo   اضغط Ctrl+C لإيقاف الخوادم
echo ------------------------------------------------------------
echo.

call npm run dev

echo.
echo [تم الإيقاف]
pause
endlocal
