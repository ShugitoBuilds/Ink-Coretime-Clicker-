# PowerShell script to copy contract metadata to frontend after building contracts
# Usage: .\scripts\copy_metadata.ps1

$ROOT_DIR = Split-Path -Parent $PSScriptRoot

Write-Host "Copying contract metadata to frontend..." -ForegroundColor Cyan

# Copy PrizePool metadata
$prizePoolMetadata = Join-Path $ROOT_DIR "artifacts\prize_pool.json"
if (Test-Path $prizePoolMetadata) {
    Write-Host "Copying PrizePool metadata..." -ForegroundColor Green
    Copy-Item $prizePoolMetadata -Destination (Join-Path $ROOT_DIR "frontend\src\contracts\prize_pool.json") -Force
    Write-Host "✓ PrizePool metadata copied" -ForegroundColor Green
} else {
    Write-Host "⚠ Warning: artifacts/prize_pool.json not found. Build contracts first." -ForegroundColor Yellow
}

# Copy RNG metadata
$rngMetadata = Join-Path $ROOT_DIR "artifacts\rng.json"
if (Test-Path $rngMetadata) {
    Write-Host "Copying RNG metadata..." -ForegroundColor Green
    Copy-Item $rngMetadata -Destination (Join-Path $ROOT_DIR "frontend\src\contracts\rng.json") -Force
    Write-Host "✓ RNG metadata copied" -ForegroundColor Green
} else {
    Write-Host "⚠ Warning: artifacts/rng.json not found. Build contracts first." -ForegroundColor Yellow
}

Write-Host "Metadata copy complete!" -ForegroundColor Cyan

