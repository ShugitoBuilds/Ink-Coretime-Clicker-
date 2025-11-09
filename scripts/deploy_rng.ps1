# Deploy RNG Contract to Astar Network using Swanky CLI
# PowerShell script for Windows-native deployment

Write-Host "=== Deploying RNG Contract to Astar Network ===" -ForegroundColor Cyan
Write-Host "Constructor parameter: min_reveal_blocks = 10"
Write-Host "Network: Astar Network (Polkadot Parachain - use small amounts of real ASTR)"
Write-Host "RPC: wss://rpc.astar.network"
Write-Host "Using Swanky CLI for deployment"
Write-Host ""

try {
    swanky contract deploy rng `
        --network astar `
        --account deployer `
        --constructorName new `
        --args 10

    Write-Host ""
    Write-Host "=== IMPORTANT: Save the contract address from the output above ===" -ForegroundColor Yellow
} catch {
    Write-Host "Error deploying RNG contract: $_" -ForegroundColor Red
    exit 1
}

