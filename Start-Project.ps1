# ============================================================
#  Digital Identity System -- Full Project Startup Script
#  Right-click -> Run with PowerShell
# ============================================================

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Definition

function Write-Step($msg) {
    Write-Host ""
    Write-Host "  $msg" -ForegroundColor Cyan
}

function Write-OK($msg) {
    Write-Host "  [OK] $msg" -ForegroundColor Green
}

function Write-Warn($msg) {
    Write-Host "  [!!] $msg" -ForegroundColor Yellow
}

function Write-Fail($msg) {
    Write-Host "  [XX] $msg" -ForegroundColor Red
}

function Open-ServiceWindow {
    param($title, $workDir, $command)
    $args = "-NoExit -Command `"Set-Location '$workDir'; `$host.UI.RawUI.WindowTitle = '$title'; $command`""
    Start-Process powershell -ArgumentList $args -WindowStyle Normal
}

Clear-Host
Write-Host ""
Write-Host "  ================================================" -ForegroundColor DarkCyan
Write-Host "   Digital Identity System - Starting Services   " -ForegroundColor White
Write-Host "  ================================================" -ForegroundColor DarkCyan

# ---- 1. Docker check -------------------------------------------
Write-Step "Step 1/6 -- Checking Docker..."
docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Docker is not running. Please start Docker Desktop first, then re-run this script."
    Read-Host "Press Enter to exit"
    exit 1
}
Write-OK "Docker is running"

# ---- 2. Database containers ------------------------------------
Write-Step "Step 2/6 -- Starting database containers (MSSQL, MongoDB, Redis)..."
Set-Location "$ROOT\backend"
docker-compose up -d 2>&1 | Out-Null
Start-Sleep -Seconds 3

$dbContainers = @("did_mssql", "did_mongodb", "did_redis")
foreach ($c in $dbContainers) {
    $status = docker inspect -f '{{.State.Status}}' $c 2>&1
    if ($status -eq "running") {
        Write-OK "$c is running"
    } else {
        Write-Warn "$c status: $status"
    }
}

# ---- 3. Hyperledger Fabric containers --------------------------
Write-Step "Step 3/6 -- Starting Hyperledger Fabric blockchain..."
$fabricContainers = @("peer0.org1.example.com", "peer0.org2.example.com", "orderer.example.com")
$missing = @()

foreach ($c in $fabricContainers) {
    $exists = docker ps -a --format "{{.Names}}" 2>&1 | Where-Object { $_ -eq $c }
    if ($exists) {
        docker start $c 2>&1 | Out-Null
        Write-OK "$c started"
    } else {
        $missing += $c
    }
}

if ($missing.Count -gt 0) {
    Write-Warn "Fabric containers not found: $($missing -join ', ')"
    Write-Warn "Run network.sh up createChannel first if this is a fresh environment."
} else {
    Write-OK "Fabric network is online"
}

# ---- 4. Backend API --------------------------------------------
Write-Step "Step 4/6 -- Starting Backend API (port 3001)..."
Open-ServiceWindow "Backend API :3001" "$ROOT\backend" "npm start"
Start-Sleep -Seconds 5

$backendOk = $false
for ($i = 0; $i -lt 6; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $backendOk = $true; break }
    } catch {}
    Start-Sleep -Seconds 2
}
if ($backendOk) { Write-OK "Backend API is responding on :3001" }
else            { Write-Warn "Backend not responding yet -- check its window for errors" }

# ---- 5. Biometric Service --------------------------------------
Write-Step "Step 5/6 -- Starting Biometric Service (port 5001)..."
Open-ServiceWindow "Biometric Service :5001" "$ROOT\biometric" "python app.py"
Start-Sleep -Seconds 5

$bioOk = $false
for ($i = 0; $i -lt 6; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:5001/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { $bioOk = $true; break }
    } catch {}
    Start-Sleep -Seconds 2
}
if ($bioOk) { Write-OK "Biometric Service is responding on :5001" }
else        { Write-Warn "Biometric Service not responding yet -- check its window for errors" }

# ---- 6. React Portals ------------------------------------------
Write-Step "Step 6/6 -- Starting React portals..."
Open-ServiceWindow "Admin Portal :3000"   "$ROOT\web\admin-portal"   "npm start"
Start-Sleep -Seconds 2
Open-ServiceWindow "Citizen Portal :3002" "$ROOT\web\citizen-portal" "npm start"
Start-Sleep -Seconds 2
Open-ServiceWindow "Org Portal :3003"     "$ROOT\web\org-portal"     "npm start"
Write-OK "Portal windows opened (allow ~30s to compile)"

# ---- Summary ---------------------------------------------------
Write-Host ""
Write-Host "  ================================================" -ForegroundColor DarkCyan
Write-Host "   All services launched!                        " -ForegroundColor White
Write-Host "  ================================================" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "   Admin Portal   ->  http://localhost:3000" -ForegroundColor White
Write-Host "   Citizen Portal ->  http://localhost:3002" -ForegroundColor White
Write-Host "   Org Portal     ->  http://localhost:3003" -ForegroundColor White
Write-Host "   Backend API    ->  http://localhost:3001/health" -ForegroundColor White
Write-Host "   Biometric Svc  ->  http://localhost:5001/health" -ForegroundColor White
Write-Host ""
Write-Host "   Admin login: admin / Admin@2025" -ForegroundColor DarkGray
Write-Host ""

Read-Host "  Press Enter to close this window"
