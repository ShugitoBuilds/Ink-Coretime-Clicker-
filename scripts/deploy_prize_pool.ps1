# Deploy PrizePool Contract to Astar Network using Swanky CLI
# PowerShell script for Windows-native deployment
# Usage: .\deploy_prize_pool.ps1 <RNG_CONTRACT_ADDRESS>

param(
    [Parameter(Mandatory=$true)]
    [string]$RngAddress
)

$AdminAddress = "WiHuQ9BotHZdtFr1ixaF6oVkuyzD1KqZCqRXXfj6MvDjmgC"

Write-Host "=== Deploying PrizePool Contract to Astar Network ===" -ForegroundColor Cyan
Write-Host "Admin Address: $AdminAddress"
Write-Host "RNG Address: $RngAddress"
Write-Host "Parameters: rake_bps=500, max_entries_per_draw=100, max_entry_fee=1000000000000"
Write-Host "Network: Astar Network (Polkadot Parachain - use small amounts of real ASTR)"
Write-Host "RPC: wss://rpc.astar.network"
Write-Host "Using Swanky CLI for deployment"
Write-Host ""

try {
    swanky contract deploy prize_pool `
        --network astar `
        --account deployer `
        --constructorName new `
        --args $AdminAddress `
        --args "500" `
        --args $RngAddress `
        --args "100" `
        --args "1000000000000"

    Write-Host ""
    Write-Host "=== IMPORTANT: Save the PrizePool contract address from the output above ===" -ForegroundColor Yellow
} catch {
    Write-Host "Error deploying PrizePool contract: $_" -ForegroundColor Red
    exit 1
}

