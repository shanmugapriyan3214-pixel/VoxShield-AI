# VoxShield AI — Dev Server Startup Script
# Starts both FastAPI backend and Vite frontend concurrently.
# Run from D:\voiceREG: npm run dev

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Definition

$PYTHON  = Join-Path $ROOT ".venv\Scripts\python.exe"
$BACKEND = Join-Path $ROOT "backend"
$FRONTEND= Join-Path $ROOT "frontend"

# Validate prerequisites
if (-not (Test-Path $PYTHON)) {
    Write-Error "[ERROR] Python venv not found at $PYTHON`nRun: python -m venv .venv && .venv\Scripts\pip install -r backend\requirements.txt"
    exit 1
}
if (-not (Test-Path (Join-Path $FRONTEND "node_modules"))) {
    Write-Error "[ERROR] Frontend node_modules missing. Run: npm install --prefix frontend"
    exit 1
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " VOXSHIELD AI — Development Server Startup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host " Backend  -> http://127.0.0.1:8000" -ForegroundColor Green
Write-Host " Frontend -> http://127.0.0.1:5173" -ForegroundColor Green
Write-Host " API Docs -> http://127.0.0.1:8000/docs" -ForegroundColor Green
Write-Host ""
Write-Host " Press Ctrl+C to stop both servers." -ForegroundColor Yellow
Write-Host ""

# Launch backend in a background job
$backendJob = Start-Job -Name "VoxShield-Backend" -ScriptBlock {
    param($python, $backend)
    Set-Location $backend
    & $python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload 2>&1
} -ArgumentList $PYTHON, $BACKEND

# Launch frontend in a background job
$frontendJob = Start-Job -Name "VoxShield-Frontend" -ScriptBlock {
    param($frontend)
    Set-Location $frontend
    npm run dev 2>&1
} -ArgumentList $FRONTEND

Write-Host "[*] Both servers starting... Streaming logs below:" -ForegroundColor Cyan
Write-Host ""

# Stream output from both jobs until Ctrl+C
try {
    while ($true) {
        # Check if jobs died
        $deadBackend  = $backendJob  | Where-Object State -ne "Running"
        $deadFrontend = $frontendJob | Where-Object State -ne "Running"

        # Stream backend output
        $backendOut = Receive-Job -Job $backendJob -ErrorAction SilentlyContinue
        foreach ($line in $backendOut) {
            Write-Host "[BACKEND ] $line" -ForegroundColor DarkCyan
        }

        # Stream frontend output
        $frontendOut = Receive-Job -Job $frontendJob -ErrorAction SilentlyContinue
        foreach ($line in $frontendOut) {
            Write-Host "[FRONTEND] $line" -ForegroundColor DarkMagenta
        }

        if ($deadBackend) {
            Write-Host "[ERROR] Backend job stopped unexpectedly." -ForegroundColor Red
            Receive-Job -Job $backendJob -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "[BACKEND ] $_" -ForegroundColor Red }
            break
        }
        if ($deadFrontend) {
            Write-Host "[ERROR] Frontend job stopped unexpectedly." -ForegroundColor Red
            Receive-Job -Job $frontendJob -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "[FRONTEND] $_" -ForegroundColor Red }
            break
        }

        Start-Sleep -Milliseconds 500
    }
} finally {
    Write-Host ""
    Write-Host "[*] Stopping VoxShield servers..." -ForegroundColor Yellow
    Stop-Job  -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
    Remove-Job -Job $backendJob, $frontendJob -Force -ErrorAction SilentlyContinue
    Write-Host "[*] All servers stopped." -ForegroundColor Yellow
}
