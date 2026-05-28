Write-Host ""
Write-Host "  Spicy Care Intelligence — Go Live" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot

# 1. Build frontend (skip if dist is fresh)
$distIndex = "$root\frontend\dist\index.html"
$srcMtime  = (Get-ChildItem "$root\frontend\src" -Recurse | Measure-Object -Property LastWriteTime -Maximum).Maximum
$distMtime = if (Test-Path $distIndex) { (Get-Item $distIndex).LastWriteTime } else { [datetime]::MinValue }

if ($srcMtime -gt $distMtime) {
    Write-Host "[1/3] Building frontend..." -ForegroundColor Yellow
    Set-Location "$root\frontend"
    npm run build | Out-Null
    Write-Host "      Built OK" -ForegroundColor Green
} else {
    Write-Host "[1/3] Frontend build is up to date, skipping." -ForegroundColor DarkGray
}

# 2. Start FastAPI backend in background
Write-Host "[2/3] Starting backend on port 8000..." -ForegroundColor Yellow
$backend = Start-Process -FilePath "python" `
    -ArgumentList "-m uvicorn main:app --host 0.0.0.0 --port 8000" `
    -WorkingDirectory "$root\backend" `
    -PassThru -WindowStyle Minimized
Start-Sleep 3
Write-Host "      Backend PID $($backend.Id)" -ForegroundColor Green

# 3. Start Cloudflare tunnel
Write-Host "[3/3] Opening Cloudflare tunnel..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Your public URL will appear below (look for https://...trycloudflare.com)" -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop everything." -ForegroundColor DarkGray
Write-Host ""

try {
    & "$root\cloudflared.exe" tunnel --url http://localhost:8000
} finally {
    Write-Host "`nShutting down backend..." -ForegroundColor Yellow
    Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
}
