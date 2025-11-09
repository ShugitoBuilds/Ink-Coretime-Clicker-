# Deployment Guide - Swanky CLI

## Overview

This project uses **Swanky CLI** for contract deployment, which runs natively on Windows and avoids WSL networking issues. Swanky uses `cargo-contract` under the hood, so existing contracts remain compatible.

## Prerequisites

1. **Swanky CLI installed**: `npm install -g @astar-network/swanky-cli`
2. **Contracts built**: Run `./scripts/build_contract.sh --release` (or use WSL for building)
3. **ASTR tokens**: Have ASTR tokens in your deployment account
4. **Configuration**: `swanky.config.json` is configured with your account and network settings

## Configuration

The `swanky.config.json` file contains:
- Contract definitions (`rng` and `prize_pool`)
- Account configuration (mnemonic for deployer account)
- Network configuration (Astar mainnet endpoint)

**Important**: The mnemonic in `swanky.config.json` is your deployment account seed phrase. Keep it secure!

## Deployment Steps

### Step 1: Deploy RNG Contract

**PowerShell (Windows):**
```powershell
.\scripts\deploy_rng.ps1
```

**Bash (Linux/WSL):**
```bash
./scripts/deploy_rng.sh
```

**Manual Command:**
```bash
swanky contract deploy rng --network astar --account deployer --constructorName new --args 10
```

**Parameters:**
- Constructor: `new`
- `min_reveal_blocks`: `10`

**Save the contract address** from the output - you'll need it for PrizePool deployment.

### Step 2: Deploy PrizePool Contract

**PowerShell (Windows):**
```powershell
.\scripts\deploy_prize_pool.ps1 <RNG_CONTRACT_ADDRESS>
```

**Bash (Linux/WSL):**
```bash
./scripts/deploy_prize_pool.sh <RNG_CONTRACT_ADDRESS>
```

**Manual Command:**
```bash
swanky contract deploy prize_pool --network astar --account deployer --constructorName new \
  --args WiHuQ9BotHZdtFr1ixaF6oVkuyzD1KqZCqRXXfj6MvDjmgC \
  --args 500 \
  --args <RNG_CONTRACT_ADDRESS> \
  --args 100 \
  --args 1000000000000
```

**Parameters:**
- Constructor: `new`
- `admin`: `WiHuQ9BotHZdtFr1ixaF6oVkuyzD1KqZCqRXXfj6MvDjmgC`
- `rake_bps`: `500` (5%)
- `rng_address`: RNG contract address from Step 1
- `max_entries_per_draw`: `100`
- `max_entry_fee`: `1000000000000` (1 ASTR with 18 decimals)

**Save the PrizePool contract address** from the output.

### Step 3: Update Frontend Configuration

Create `frontend/.env`:

```env
VITE_RPC_ENDPOINT=wss://rpc.astar.network
VITE_PRIZE_POOL_ADDRESS=<PrizePool address from Step 2>
VITE_RNG_ADDRESS=<RNG address from Step 1>
VITE_TOKEN_DECIMALS=18
VITE_TOKEN_SYMBOL=ASTR
VITE_ADMIN_ADDRESS=WiHuQ9BotHZdtFr1ixaF6oVkuyzD1KqZCqRXXfj6MvDjmgC
VITE_ENTRY_FEE=1000000000000
VITE_REVEAL_WINDOW_BLOCKS=10
VITE_RAKE_BPS=500
VITE_USE_MOCK=false
```

### Step 4: Test Frontend

```bash
cd frontend
npm run dev
```

Connect your wallet and test the deployment!

## Troubleshooting

### "Cannot read properties of undefined (reading 'rng')"
- Ensure `swanky.config.json` has the `contracts` section with `rng` and `prize_pool` entries
- Verify contract names match exactly

### "Network is unreachable" or connection errors
- Swanky runs natively on Windows, avoiding WSL networking issues
- Check your internet connection
- Verify the RPC endpoint: `wss://rpc.astar.network`

### "Insufficient balance"
- Ensure you have ASTR tokens in your deployment account
- Check balance: `swanky account balance deployer --network astar`

### Contract not found
- Ensure contracts are built: `./scripts/build_contract.sh --release`
- Check that artifacts exist in `artifacts/` directory

## Alternative: Building Contracts

If you need to build contracts and WSL networking works:
```bash
# In WSL
./scripts/build_contract.sh --release
```

If WSL networking doesn't work, you can:
1. Build contracts on a Linux machine
2. Copy artifacts to Windows
3. Deploy using Swanky CLI on Windows

## Notes

- Swanky CLI runs natively on Windows (via npm), avoiding WSL networking issues
- Contracts are built with `cargo-contract` (can use WSL for building)
- Swanky uses the built artifacts from `artifacts/` directory
- All deployment happens via Swanky CLI, which handles RPC connections natively

