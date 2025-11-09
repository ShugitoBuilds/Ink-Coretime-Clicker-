# Quick Deployment Steps - Polkadot.js Apps UI

## Your Wallet
- Address: WiHuQ9BotHZdtFr1ixaF6oVkuyzD1KqZCqRXXfj6MvDjmgC
- Balance: 20 ASTR ✅

## Contract Files Ready
- `artifacts/rng.contract` (23KB)
- `artifacts/prize_pool.contract` (38KB)

## Deployment Steps

### 1. Deploy RNG Contract
1. Open: https://polkadot.js.org/apps/?rpc=wss://rpc.astar.network
2. Connect wallet → Select your Astar account
3. **Developer** → **Contracts** → **Upload & deploy code**
4. Upload: `artifacts/rng.contract`
5. Deploy → Constructor: `new` → Parameter: `10`
6. Endowment: 2-3 ASTR
7. **Save the contract address!**

### 2. Deploy PrizePool Contract
1. Upload: `artifacts/prize_pool.contract`
2. Deploy → Constructor: `new` → Parameters:
   - admin: `WiHuQ9BotHZdtFr1ixaF6oVkuyzD1KqZCqRXXfj6MvDjmgC`
   - rake_bps: `500`
   - rng_address: `[from step 1]`
   - max_entries_per_draw: `100`
   - max_entry_fee: `1000000000000`
3. Endowment: 3-5 ASTR
4. **Save the contract address!**

### 3. Update Frontend
Create `frontend/.env` with both contract addresses.

