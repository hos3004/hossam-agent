@echo off
chcp 65001 > nul
title Open-LLM-VTuber (Gemini Edition)
setlocal
cd /d "%~dp0"

echo ============================================================
echo   Open-LLM-VTuber   ^|   Gemini Edition
echo ============================================================
echo.

REM ---- Check uv ----------------------------------------------------------
where uv >nul 2>&1
if errorlevel 1 (
  echo [خطأ] أداة uv غير مثبتة.
  echo ثبّتها بالأمر:
  echo     powershell -c "irm https://astral.sh/uv/install.ps1 ^| iex"
  echo.
  pause
  exit /b 1
)

REM ---- Check conf.yaml ---------------------------------------------------
if not exist "conf.yaml" (
  echo [إعداد] إنشاء conf.yaml من القالب الافتراضي...
  copy "config_templates\conf.default.yaml" "conf.yaml" >nul
  echo [تنبيه] افتح conf.yaml وضع GEMINI_API_KEY في الأماكن المطلوبة.
  echo.
)

REM ---- Sync deps if needed ----------------------------------------------
if not exist ".venv" (
  echo [إعداد] تجهيز بيئة Python لأول مرة ^(قد يستغرق عدة دقائق^)...
  uv sync
  if errorlevel 1 (
    echo [خطأ] فشل تجهيز البيئة.
    pause
    exit /b 1
  )
  echo.
)

REM ---- Open browser after a short delay --------------------------------
start "" /b cmd /c "timeout /t 6 /nobreak >nul && start http://localhost:12393"

echo.
echo ------------------------------------------------------------
echo   الواجهة:  http://localhost:12393
echo.
echo   اضغط Ctrl+C لإيقاف الخادم
echo ------------------------------------------------------------
echo.

uv run run_server.py

echo.
echo [تم الإيقاف]
pause
endlocal
