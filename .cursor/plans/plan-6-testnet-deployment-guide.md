# Testnet Deployment Guide

## Overview
This guide walks through deploying the CoreTime Clicker contracts to Astar Network and testing the complete system. 

**Recommended Options:**
1. **Astar Network Mainnet** (Recommended) - Production Polkadot parachain with standard ink! contract support
2. **Shibuya Testnet** (Optional) - Astar's testnet (may have faucet issues)

**Note:** Astar Network is a Polkadot parachain that supports standard ink! smart contracts via `pallet-contracts`. This is different from Asset Hub chains which don't currently support ink! contracts.

## Prerequisites

1. **Testnet Account Setup**
   - Install Polkadot.js extension
   - Create or import testnet account
   - Fund account with test tokens (use faucet if needed)

2. **Network RPC Endpoints**
   - **Astar Network Mainnet**: `wss://rpc.astar.network`
   - **Shibuya Testnet**: `wss://rpc.shiden.astar.network` (if available)
   - **Local Testnet**: `ws://127.0.0.1:9944`

3. **Required Tools**
   - `cargo-contract` v3.2.0 installed
   - Contracts built (`./scripts/build_contract.sh --release`)
   - Frontend dependencies installed (`cd frontend && npm install`)

## Step 1: Prepare Deployment Parameters

### RNG Contract Parameters
- **min_reveal_blocks**: `10` (minimum blocks before reveal allowed)

### PrizePool Contract Parameters
- **admin**: Your testnet admin account address
- **rake_bps**: `500` (5% rake)
- **rng_address**: Will be set after RNG deployment
- **max_entries_per_draw**: `100`
- **max_entry_fee**: `1000000000000` (1 ASTR with 18 decimals = 1,000,000,000,000,000,000 planck units)

## Step 2: Deploy RNG Contract

### Using cargo-contract CLI

**For Astar Network Mainnet (Recommended):**
```bash
# Navigate to project root
cd /path/to/Ink-Coretime-Clicker-

# Deploy RNG contract to Astar Network
# Use the provided deployment script:
./scripts/deploy_rng.sh

# Or manually:
cargo contract instantiate \
  --manifest-path contracts/rng/Cargo.toml \
  --constructor new \
  --args "10" \
  --suri "YOUR_SEED_PHRASE" \
  --url wss://rpc.astar.network \
  --execute
```

**Note:** You'll need ASTR tokens for deployment. Use small amounts for testing.

### Using Polkadot.js Apps UI

**For Astar Network:**
1. Navigate to [Polkadot.js Apps - Astar](https://polkadot.js.org/apps/?rpc=wss://rpc.astar.network)
2. Connect to Astar Network
3. Go to **Developer** → **Contracts** → **Upload & deploy code**
4. Upload `artifacts/rng.contract`
5. Select `new` constructor
6. Enter parameter: `min_reveal_blocks = 10`
7. Set endowment (storage deposit): ~2-3 ASTR tokens
8. Submit and sign transaction
9. **Record the deployed contract address**

**Note:** Make sure you have ASTR tokens in your account. You can get them from exchanges or use the Astar faucet if available.

## Step 3: Deploy PrizePool Contract

### Using cargo-contract CLI

**For Astar Network Mainnet:**
```bash
# Use the provided deployment script:
./scripts/deploy_prize_pool.sh <RNG_CONTRACT_ADDRESS>

# Or manually:
cargo contract instantiate \
  --manifest-path contracts/prize_pool/Cargo.toml \
  --constructor new \
  --args "YOUR_ADMIN_ADDRESS" \
  --args "500" \
  --args "RNG_CONTRACT_ADDRESS" \
  --args "100" \
  --args "1000000000000" \
  --suri "YOUR_SEED_PHRASE" \
  --url wss://rpc.astar.network \
  --execute
```

### Using Polkadot.js Apps UI

1. Upload `artifacts/prize_pool.contract`
2. Select `new` constructor
3. Enter parameters:
   - `admin`: Your admin address
   - `rake_bps`: `500`
   - `rng_address`: RNG contract address from Step 2
   - `max_entries_per_draw`: `100`
   - `max_entry_fee`: `1000000000000` (1 ASTR = 1,000,000,000,000,000,000 planck units)
4. Set endowment: ~3-5 ASTR tokens
5. Submit and sign transaction
6. **Record the deployed contract address**

## Step 4: Update Frontend Configuration

Create `frontend/.env`:

```env
# Astar Network Configuration
VITE_RPC_ENDPOINT=wss://rpc.astar.network
VITE_PRIZE_POOL_ADDRESS=<deployed_prize_pool_address>
VITE_RNG_ADDRESS=<deployed_rng_address>
VITE_ENTRY_FEE=1000000000000
VITE_REVEAL_WINDOW_BLOCKS=10
VITE_RAKE_BPS=500
VITE_TOKEN_DECIMALS=18
VITE_TOKEN_SYMBOL=ASTR
VITE_ADMIN_ADDRESS=<your_admin_address>
VITE_USE_MOCK=false
```

**Note**: ASTR has 18 decimals, so `1000000000000` planck units = 0.000001 ASTR (very small amount).

## Step 5: Copy Contract Metadata

```bash
# Copy metadata to frontend
./scripts/copy_metadata.sh
# Or on Windows:
.\scripts\copy_metadata.ps1
```

## Step 6: Test Frontend Connection

```bash
cd frontend
npm run dev
```

1. Open browser to `http://localhost:5173`
2. Connect wallet with testnet account
3. Verify contract addresses are loaded
4. Check that pool info loads correctly

## Step 7: End-to-End Testing Checklist

### User Flow Testing

- [ ] **Wallet Connection**
  - Connect wallet successfully
  - Switch between accounts
  - Verify address displays correctly

- [ ] **Play Session**
  - Start session
  - Click button multiple times
  - Verify click counter increments
  - End session
  - Verify session duration displays

- [ ] **Enter Jackpot**
  - Click "Enter Jackpot" button
  - Approve transaction in wallet
  - Verify transaction succeeds
  - Check toast notification appears
  - Verify pool balance updates
  - Verify entry count increases

- [ ] **Jackpot Page**
  - View current pool balance
  - View entry count
  - View next draw ETA
  - View user entries (if implemented)

- [ ] **Admin Functions** (as admin)
  - Execute draw
  - Verify winner selected
  - Verify pool resets
  - Pause contract
  - Verify entries blocked when paused
  - Unpause contract
  - Withdraw rake
  - Verify rake balance decreases
  - Set rake BPS
  - Verify rake BPS updates

- [ ] **Claim Prize** (as winner)
  - Claim prize for winning draw
  - Verify transaction succeeds
  - Verify balance increases
  - Verify prize marked as claimed

### Edge Case Testing

- [ ] **Max Entries**
  - Fill draw to max entries (100)
  - Attempt additional entry
  - Verify "Max Entries Reached" error

- [ ] **Entry Fee Too High**
  - Attempt entry with fee > max_entry_fee
  - Verify "Entry Fee Too High" error

- [ ] **Insufficient Balance**
  - Attempt entry with insufficient balance
  - Verify error message

- [ ] **Paused Contract**
  - Pause contract
  - Attempt entry
  - Verify "Contract Paused" error
  - Attempt claim
  - Verify "Contract Paused" error

- [ ] **Double Claim**
  - Claim prize
  - Attempt to claim again
  - Verify "Already Claimed" error

- [ ] **Non-Winner Claim**
  - Attempt to claim prize as non-winner
  - Verify "Not Winner" error

### Multi-User Testing

- [ ] **Multiple Entries**
  - Enter jackpot from multiple accounts
  - Verify all entries recorded
  - Verify entry count correct

- [ ] **Draw with Multiple Entries**
  - Enter from 3+ accounts
  - Execute draw
  - Verify winner selected fairly
  - Verify all entries counted

## Step 8: Gas Cost Analysis

Measure gas costs for each operation:

| Operation | Gas Cost | Notes |
|-----------|----------|-------|
| Enter Jackpot | ~XXX | Depends on entry fee |
| Execute Draw | ~XXX | Depends on entry count |
| Claim Prize | ~XXX | Standard transfer |
| Withdraw Rake | ~XXX | Standard transfer |
| Set Paused | ~XXX | Simple state change |
| Set Rake BPS | ~XXX | Simple state change |

**Documentation**: Record actual gas costs in `GAS_COSTS.md`

## Step 9: Event Verification

Verify events are emitted correctly:

- [ ] `EntrySubmitted` events emitted
- [ ] `DrawExecuted` events emitted
- [ ] `PrizeClaimed` events emitted
- [ ] `RakeWithdrawn` events emitted
- [ ] `Paused`/`Unpaused` events emitted

Use block explorer or event query tools to verify.

## Step 10: Block Subscription Testing

- [ ] Verify block height updates in UI
- [ ] Verify block subscriptions work
- [ ] Test reconnection after network interruption

## Getting Test Tokens

### Astar Network (ASTR tokens)
- **Mainnet**: Obtain ASTR from exchanges (Coinbase, Binance, Kraken, etc.)
- **Testnet (Shibuya)**: May have faucet issues - check Astar Discord/Telegram for current status
- **Recommendation**: Use mainnet with small amounts for testing (recommended: < 1 ASTR per test)
- ASTR has 18 decimals, so very small amounts can be used for testing
- Check [Astar Network Explorer](https://astar.subscan.io/) for network status

## Troubleshooting

### Contract Deployment Issues

**Error: "Insufficient balance"**
- Ensure account has enough tokens for storage deposit
- Check gas costs
- For Paseo: Request more PAS tokens from faucet
- For Kusama: Ensure you have sufficient KSM

**Error: "Code already uploaded"**
- Use existing code hash or upload new code
- Check if contract already exists

**Error: "Network not found"**
- Verify RPC endpoint is correct
- Check if network is accessible
- Try alternative RPC endpoint

### Frontend Connection Issues

**Error: "Contract address not set"**
- Verify `.env` file exists
- Check environment variables are loaded
- Restart dev server

**Error: "RPC endpoint unreachable"**
- Verify RPC endpoint is correct
- Check network connectivity
- Try alternative RPC endpoint

### Transaction Issues

**Error: "Transaction failed"**
- Check account balance
- Verify contract is not paused
- Check gas limits
- Review error message in block explorer

## Next Steps

After successful testnet deployment:
1. Document any issues found
2. Fix bugs if discovered
3. Optimize gas costs if needed
4. Proceed to Plan 7: Production Preparation

