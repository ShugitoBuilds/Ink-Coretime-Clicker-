# CoreTime Clicker

A simple clicker game with a paid-entry jackpot system, built on Astar Network (Polkadot parachain) using ink! smart contracts.

## Overview

CoreTime Clicker is an MVP clicker game where players:
1. Click a button to accumulate points
2. Complete a session
3. Optionally enter the jackpot by paying an entry fee
4. Winners are selected via provably fair commit-reveal randomness
5. Winners can claim their prizes

The system includes:
- **PrizePool Contract**: Manages jackpot entries, rake, draws, and claims
- **RNG Contract**: Provides commit-reveal randomness for provably fair draws
- **React Frontend**: Vite + React + Tailwind with wallet integration

## Quickstart

### Prerequisites

- Rust toolchain (`rustup`, `cargo`) with:
  - `wasm32-unknown-unknown` target
  - `rust-src` component
- `cargo-contract` **v3.2.0** (compatible with ink! 4.3) - for building contracts
- Node.js ≥ 18 with npm
- **Swanky CLI** (for deployment) - install via: `npm install -g @astar-network/swanky-cli`

### Build Contracts

```bash
# Build both contracts
./scripts/build_contract.sh --release

# Test contracts
./scripts/test_contract.sh
```

Build outputs are in `contracts/*/target/ink/` and copied to `artifacts/`:
- `prize_pool.contract`, `prize_pool.wasm`, `prize_pool.json`
- `rng.contract`, `rng.wasm`, `rng.json`

### Deploy Contracts

#### Astar Network (Polkadot Parachain)

**Prerequisites for Deployment:**
- Ensure contracts are built (see Build Contracts section above)
- Have ASTR tokens in your deployment account (configured in `swanky.config.json`)
- Swanky CLI installed: `npm install -g @astar-network/swanky-cli`

**Using Swanky CLI (Recommended - Windows Native):**

**PowerShell (Windows):**
```powershell
# 1. Deploy RNG contract
.\scripts\deploy_rng.ps1

# 2. Deploy PrizePool contract (replace with actual RNG address)
.\scripts\deploy_prize_pool.ps1 <RNG_CONTRACT_ADDRESS>
```

**Bash (Linux/WSL):**
```bash
# 1. Deploy RNG contract
./scripts/deploy_rng.sh

# 2. Deploy PrizePool contract (replace with actual RNG address)
./scripts/deploy_prize_pool.sh <RNG_CONTRACT_ADDRESS>
```

**Manual Swanky CLI Commands:**
```bash
# Deploy RNG
swanky contract deploy rng --network astar --account deployer --constructorName new --args 10

# Deploy PrizePool (replace <RNG_ADDRESS> with actual address)
swanky contract deploy prize_pool --network astar --account deployer --constructorName new \
  --args WiHuQ9BotHZdtFr1ixaF6oVkuyzD1KqZCqRXXfj6MvDjmgC \
  --args 500 \
  --args <RNG_ADDRESS> \
  --args 100 \
  --args 1000000000000
```

**Configuration:**
- Account and network settings are configured in `swanky.config.json`
- Default admin address: `WiHuQ9BotHZdtFr1ixaF6oVkuyzD1KqZCqRXXfj6MvDjmgC`
- Network: Astar mainnet (`wss://rpc.astar.network`)

### Frontend Setup

```bash
cd frontend
npm install
npm run dev    # development server
npm run build  # production bundle
```

Create `.env` in `frontend/`:

```env
# RPC Endpoint
VITE_RPC_ENDPOINT=wss://rpc.astar.network

# Contract Addresses
VITE_PRIZE_POOL_ADDRESS=<deployed_prize_pool_address>
VITE_RNG_ADDRESS=<deployed_rng_address>

# Configuration
VITE_ENTRY_FEE=1000000000000
VITE_REVEAL_WINDOW_BLOCKS=10
VITE_RAKE_BPS=500
VITE_TOKEN_DECIMALS=18
VITE_TOKEN_SYMBOL=ASTR

# Optional: Use mock mode if contracts not deployed
# VITE_USE_MOCK=true
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_RPC_ENDPOINT` | RPC endpoint for Astar Network | `wss://rpc.astar.network` |
| `VITE_PRIZE_POOL_ADDRESS` | Deployed PrizePool contract address | (required) |
| `VITE_RNG_ADDRESS` | Deployed RNG contract address | (required) |
| `VITE_ENTRY_FEE` | Default entry fee in planck units | `1000000000000` |
| `VITE_REVEAL_WINDOW_BLOCKS` | Minimum blocks before reveal | `10` |
| `VITE_RAKE_BPS` | Rake in basis points (500 = 5%) | `500` |
| `VITE_TOKEN_DECIMALS` | Token decimals | `18` |
| `VITE_TOKEN_SYMBOL` | Token symbol | `ASTR` |
| `VITE_USE_MOCK` | Use mock mode (no contract calls) | `true` if no addresses set |

## Contract Metadata

After rebuilding contracts, update the frontend metadata files:
- `frontend/src/contracts/prize_pool.json` - Copy from `artifacts/prize_pool.json`
- `frontend/src/contracts/rng.json` - Copy from `artifacts/rng.json`

## Deployment

### Testnet Deployment

See [Testnet Deployment Guide](.cursor/plans/plan-6-testnet-deployment-guide.md) for detailed instructions.

**Quick Steps:**
1. Deploy RNG contract to Astar Network mainnet (or Shibuya testnet if available)
2. Deploy PrizePool contract with RNG address
3. Update frontend `.env` with contract addresses
4. Test end-to-end functionality

### Production Deployment

See [Production Deployment Guide](.cursor/plans/plan-8-production-deployment-guide.md) for detailed instructions.

**Quick Steps:**
1. Complete [Production Preparation Checklist](.cursor/plans/plan-7-production-preparation-checklist.md)
2. Deploy contracts to Astar Network (Polkadot parachain)
3. Deploy frontend to hosting platform
4. Verify all functionality
5. Monitor for issues

### Deployment Runbook

See [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md) for operational procedures and troubleshooting.

## Security

See [SECURITY.md](SECURITY.md) for comprehensive security documentation, including:
- Security considerations
- Known limitations
- Best practices
- Upgrade paths

## Legal

- [Terms of Service](TERMS_OF_SERVICE.md) - User agreement
- [Privacy Policy](PRIVACY_POLICY.md) - Privacy information

**Important**: These are templates. Consult with legal counsel before using in production.

### Contract Tests

```bash
# Test both contracts
./scripts/test_contract.sh

# Test individual contracts
cd contracts/prize_pool && cargo test
cd contracts/rng && cargo test
```

### Manual Testing Checklist

After deploying contracts and configuring frontend:

1. **Wallet Connection**: Connect Polkadot.js extension, verify address appears
2. **Play Session**: Click the button, verify click counter increments
3. **Enter Jackpot**: Complete session, click "Enter Jackpot", verify transaction succeeds
4. **Jackpot Page**: Check pool size, entry count, next draw ETA
5. **Draw Execution**: (Admin) Execute draw, verify winner selected
6. **Claim Prize**: (Winner) Claim prize, verify funds transferred
7. **Admin Functions**: (Admin) Pause/unpause, withdraw rake, set rake BPS

## Warnings & Limitations

### Commit-Reveal RNG (v1)

The current MVP uses commit-reveal randomness, which has limitations:

- **Reveal Window**: Requires waiting for the reveal block before randomness is available
- **Predictability**: While provably fair, randomness is not available until reveal
- **Upgrade Path**: Planned upgrade to attested VRF (Verifiable Random Function) for better security and instant randomness

**How it works:**
1. User commits a hash of a secret
2. After `REVEAL_WINDOW_BLOCKS`, the secret is revealed
3. Random number is generated from secret + block data
4. Verification: `hash(secret) == commit_hash`

### Security Considerations

- **Pause Circuit Breaker**: Admin can pause/unpause for emergency situations
- **Entry Caps**: Maximum entries per draw prevents abuse
- **Entry Fee Caps**: Maximum entry fee prevents excessive gas costs
- **Rake Management**: Rake is isolated and withdrawable by admin only

### Upgrade Path

Future versions will include:
- Attested VRF for improved randomness
- Cross-chain message (XCM) support for multi-chain entries
- Enhanced fairness verification tools
- Additional security audits

## Repository Structure

```
.
├── contracts/
│   ├── prize_pool/          # PrizePool contract
│   ├── rng/                  # RNG commit-reveal contract
│   └── coretime_clicker/     # Legacy contract (reference)
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── context/          # React contexts
│   │   ├── lib/              # Contract clients
│   │   └── styles/           # Theme CSS
│   └── public/assets/        # Art placeholders
├── scripts/                  # Build/test scripts
└── artifacts/                # Build outputs
```

## Development

### Adding New Features

1. Update contracts in `contracts/*/src/lib.rs`
2. Rebuild and test: `./scripts/test_contract.sh`
3. Update frontend contract metadata if ABI changes
4. Update frontend components as needed

### Theming

Theme variables are in `frontend/src/styles/theme.css`. Update CSS variables to reskin the app quickly:
- Colors: `--color-primary`, `--color-bg-dark`, etc.
- Spacing: `--spacing-*`
- Border radius: `--radius-*`
- Shadows: `--shadow-*`

## License

This project is open source. See LICENSE file for details.

## User Guide

### Getting Started

1. **Install Polkadot.js Extension**
   - Download from [polkadot.js.org/extension](https://polkadot.js.org/extension/)
   - Create or import an account
   - Make sure you're on Astar Network

2. **Get ASTR Tokens**
   - Purchase ASTR from exchanges (Coinbase, Binance, Kraken, etc.)
   - Or use Polkaswap to swap other tokens for ASTR
   - Transfer ASTR to your wallet address

3. **Connect Wallet**
   - Open the CoreTime Clicker app
   - Click "Connect Wallet"
   - Select your account from the Polkadot.js extension

4. **Play the Game**
   - Click "Start Session"
   - Click the button to accumulate points
   - Click "End Session" when done
   - Enter the jackpot by paying the entry fee

5. **Check Jackpot**
   - Navigate to the "Jackpot" tab
   - View current pool balance and entries
   - Winners are selected via provably fair randomness

### Troubleshooting

**Wallet Connection Issues:**
- Ensure Polkadot.js extension is installed and unlocked
- Refresh the page and try connecting again
- Check that you're connected to Astar Network in the extension

**Transaction Failures:**
- Verify you have sufficient ASTR balance (need ~0.001 ASTR for gas + entry fee)
- Check that the contract is not paused (admin can pause for maintenance)
- Ensure you're not exceeding max entries per draw

**Balance Not Updating:**
- Refresh the page
- Check your wallet balance on [Astar Explorer](https://astar.subscan.io/)
- Verify contract addresses are correct in `.env`

**Getting ASTR Tokens:**
- **Exchanges**: Coinbase, Binance, Kraken, Gate.io
- **DEX**: Polkaswap (swap DOT/USDC/etc. for ASTR)
- **Bridge**: Use Astar Portal to bridge from other chains

**Network Issues:**
- If RPC endpoint is slow, try alternative: `wss://astar-rpc.dwellir.com`
- Check [Astar Network Status](https://status.astar.network/)

## Support

For issues, questions, or contributions, please open an issue on the repository.
