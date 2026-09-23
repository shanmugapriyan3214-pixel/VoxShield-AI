@echo off
setlocal enabledelayedexpansion
title VOXSHIELD AI - One-Click Launcher

echo ==============================================================================
echo                       VOXSHIELD AI DEFENSE SYSTEM
echo            Real-Time Voice Authenticity ^& Deepfake Shield
echo ==============================================================================
echo.

:: ── Resolve absolute paths regardless of where the .bat was launched from ──
set "ROOT_DIR=%~dp0"
:: Strip trailing backslash so paths stay clean
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

set "BACKEND_DIR=%ROOT_DIR%\backend"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"
set "PYTHON_EXE=%ROOT_DIR%\.venv\Scripts\python.exe"
set "UVICORN_EXE=%ROOT_DIR%\.venv\Scripts\uvicorn.exe"

:: ── 1. Verify Python Virtual Environment ────────────────────────────────────
if not exist "%PYTHON_EXE%" (
    echo.
    echo  [ERROR] Python virtual environment not found at:
    echo          %PYTHON_EXE%
    echo.
    echo  To create it, open a terminal in %ROOT_DIR% and run:
    echo    python -m venv .venv
    echo    .venv\Scripts\pip install -r backend\requirements.txt
    echo.
    pause
    exit /b 1
)

:: ── 2. Verify uvicorn is installed inside .venv ──────────────────────────────
"%PYTHON_EXE%" -c "import uvicorn" 2>nul
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] uvicorn is not installed in the virtual environment.
    echo.
    echo  Fix it by running:
    echo    %ROOT_DIR%\.venv\Scripts\pip install -r backend\requirements.txt
    echo.
    pause
    exit /b 1
)

:: ── 3. Verify Node.js ────────────────────────────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Node.js was not found in your system PATH.
    echo  Please install Node.js v18+ from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: ── 4. Verify Frontend node_modules ─────────────────────────────────────────
if not exist "%FRONTEND_DIR%\node_modules" (
    echo.
    echo  [ERROR] Frontend dependencies not installed.
    echo.
    echo  Fix it by running:
    echo    cd /d "%FRONTEND_DIR%"
    echo    npm install
    echo.
    pause
    exit /b 1
)

:: ── 5. Verify frontend entry point ──────────────────────────────────────────
if not exist "%FRONTEND_DIR%\package.json" (
    echo.
    echo  [ERROR] Frontend package.json not found at %FRONTEND_DIR%
    echo  The project structure may be corrupted.
    echo.
    pause
    exit /b 1
)

echo  [OK] All prerequisites verified.
echo.

:: ── Kill any stale processes on ports 8000 / 5173 ───────────────────────────
echo  [*] Clearing ports 8000 and 5173 (if occupied)...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8000 " ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173 " ^| findstr LISTENING') do (
    taskkill /PID %%a /F >nul 2>&1
)

:: ── 6. Launch FastAPI Backend ────────────────────────────────────────────────
echo  [*] Starting VOXSHIELD FastAPI Backend on port 8000...
start "VOXSHIELD  Backend  [FastAPI :8000]" cmd /k ^
    "title VOXSHIELD Backend [FastAPI :8000] ^&^& ^
     cd /d ""%BACKEND_DIR%"" ^&^& ^
     ""%PYTHON_EXE%"" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: ── 7. Wait for backend to be healthy (poll up to 60 s) ─────────────────────
echo  [*] Waiting for backend to initialize (loads AI models, ~8-10 s)...
set /a BACKEND_ATTEMPTS=0
:wait_backend
set /a BACKEND_ATTEMPTS+=1
if %BACKEND_ATTEMPTS% gtr 60 (
    echo.
    echo  [ERROR] Backend did not become available within 60 seconds.
    echo  Check the "VOXSHIELD Backend" console window for errors.
    echo.
    pause
    exit /b 1
)
curl.exe -s -o nul -w "%%{http_code}" http://127.0.0.1:8000/docs 2>nul | findstr /c:"200" >nul 2>&1
if %errorlevel% neq 0 (
    timeout /t 1 /nobreak >nul
    goto wait_backend
)
echo  [OK] Backend is up and healthy.
echo.

:: ── 8. Launch React/Vite Frontend ───────────────────────────────────────────
echo  [*] Starting VOXSHIELD React/Vite Frontend on port 5173...
start "VOXSHIELD  Frontend  [Vite :5173]" cmd /k ^
    "title VOXSHIELD Frontend [Vite :5173] ^&^& ^
     cd /d ""%FRONTEND_DIR%"" ^&^& ^
     npm run dev"

:: ── 9. Wait for frontend to be healthy (poll up to 30 s) ────────────────────
echo  [*] Waiting for frontend dev server to start...
set /a FRONTEND_ATTEMPTS=0
:wait_frontend
set /a FRONTEND_ATTEMPTS+=1
if %FRONTEND_ATTEMPTS% gtr 30 (
    echo.
    echo  [ERROR] Frontend did not become available within 30 seconds.
    echo  Check the "VOXSHIELD Frontend" console window for errors.
    echo.
    pause
    exit /b 1
)
curl.exe -s -o nul -w "%%{http_code}" http://localhost:5173 2>nul | findstr /c:"200" >nul 2>&1
if %errorlevel% neq 0 (
    timeout /t 1 /nobreak >nul
    goto wait_frontend
)
echo  [OK] Frontend is up and serving.
echo.

:: ── 10. Open browser ────────────────────────────────────────────────────────
echo  [*] Opening VOXSHIELD AI in your default browser...
start "" "http://localhost:5173"

:: ── Done ─────────────────────────────────────────────────────────────────────
echo.
echo  ==============================================================================
echo   [SUCCESS] VOXSHIELD AI is fully running!
echo  ==============================================================================
echo   Backend API  :  http://127.0.0.1:8000
echo   API Docs     :  http://127.0.0.1:8000/docs
echo   Frontend App :  http://localhost:5173
echo.
echo   Both services are running in their own console windows.
echo   To stop VoxShield, simply close each server window.
echo  ==============================================================================
echo.
exit /b 0
