# CoreTime Clicker

A simple clicker game with a paid-entry jackpot system, built on Polkadot/Kusama Asset Hub using ink! smart contracts.

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
- `cargo-contract` **v3.2.0** (compatible with ink! 4.3)
- Node.js ≥ 18 with npm

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

#### Kusama Asset Hub

1. Upload `artifacts/prize_pool.contract` using `cargo-contract upload` or [Polkadot.js Apps UI](https://polkadot.js.org/apps/?rpc=wss://kusama-asset-hub-rpc.polkadot.io)
2. Upload `artifacts/rng.contract` similarly
3. Instantiate PrizePool with constructor parameters:
   - `admin`: Your admin account address
   - `rake_bps`: Rake in basis points (e.g., 500 = 5%)
   - `rng_address`: The RNG contract address
   - `max_entries_per_draw`: Maximum entries per draw (e.g., 100)
   - `max_entry_fee`: Maximum entry fee in planck units
4. Record the deployed contract addresses

#### Polkadot Asset Hub (Future)

When ink! contracts are enabled on Polkadot Asset Hub:
1. Update `VITE_RPC_ENDPOINT` to Polkadot Asset Hub RPC
2. Deploy contracts using the same process
3. No code changes needed - fully environment-driven

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
VITE_RPC_ENDPOINT=wss://kusama-asset-hub-rpc.polkadot.io

# Contract Addresses
VITE_PRIZE_POOL_ADDRESS=<deployed_prize_pool_address>
VITE_RNG_ADDRESS=<deployed_rng_address>

# Configuration
VITE_ENTRY_FEE=1000000000000
VITE_REVEAL_WINDOW_BLOCKS=10
VITE_RAKE_BPS=500
VITE_TOKEN_DECIMALS=12
VITE_TOKEN_SYMBOL=KSM

# Optional: Use mock mode if contracts not deployed
# VITE_USE_MOCK=true
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_RPC_ENDPOINT` | RPC endpoint for Kusama/Polkadot Asset Hub | `wss://kusama-asset-hub-rpc.polkadot.io` |
| `VITE_PRIZE_POOL_ADDRESS` | Deployed PrizePool contract address | (required) |
| `VITE_RNG_ADDRESS` | Deployed RNG contract address | (required) |
| `VITE_ENTRY_FEE` | Default entry fee in planck units | `1000000000000` |
| `VITE_REVEAL_WINDOW_BLOCKS` | Minimum blocks before reveal | `10` |
| `VITE_RAKE_BPS` | Rake in basis points (500 = 5%) | `500` |
| `VITE_TOKEN_DECIMALS` | Token decimals | `12` |
| `VITE_TOKEN_SYMBOL` | Token symbol | `KSM` |
| `VITE_USE_MOCK` | Use mock mode (no contract calls) | `true` if no addresses set |

## Contract Metadata

After rebuilding contracts, update the frontend metadata files:
- `frontend/src/contracts/prize_pool.json` - Copy from `artifacts/prize_pool.json`
- `frontend/src/contracts/rng.json` - Copy from `artifacts/rng.json`

## Deployment

### Testnet Deployment

See [Testnet Deployment Guide](.cursor/plans/plan-6-testnet-deployment-guide.md) for detailed instructions.

**Quick Steps:**
1. Deploy RNG contract to testnet (Paseo Asset Hub recommended, or Kusama Asset Hub for direct testing)
2. Deploy PrizePool contract with RNG address
3. Update frontend `.env` with contract addresses
4. Test end-to-end functionality

### Production Deployment

See [Production Deployment Guide](.cursor/plans/plan-8-production-deployment-guide.md) for detailed instructions.

**Quick Steps:**
1. Complete [Production Preparation Checklist](.cursor/plans/plan-7-production-preparation-checklist.md)
2. Deploy contracts to Kusama Asset Hub
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

## Support

For issues, questions, or contributions, please open an issue on the repository.
