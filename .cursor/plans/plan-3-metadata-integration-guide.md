# Contract Metadata Integration Guide

## Overview

This guide explains how to integrate contract metadata with the frontend after building contracts.

## Prerequisites

1. Contracts must be built using `cargo-contract build --release`
2. Build artifacts should be in `artifacts/` directory:
   - `artifacts/prize_pool.json` (metadata)
   - `artifacts/rng.json` (metadata)

## Step-by-Step Process

### 1. Build Contracts

```bash
# Build both contracts
./scripts/build_contract.sh --release

# Or build individually
cd contracts/prize_pool
cargo contract build --release

cd ../rng
cargo contract build --release
```

### 2. Copy Metadata to Frontend

**Option A: Using the copy script (recommended)**

```bash
# Linux/Mac
./scripts/copy_metadata.sh

# Windows PowerShell
.\scripts\copy_metadata.ps1
```

**Option B: Manual copy**

```bash
# Copy PrizePool metadata
cp artifacts/prize_pool.json frontend/src/contracts/prize_pool.json

# Copy RNG metadata
cp artifacts/rng.json frontend/src/contracts/rng.json
```

### 3. Verify Metadata Structure

The metadata files should be valid JSON with the following structure:

```json
{
  "source": {
    "hash": "...",
    "language": "ink! 4.3",
    "compiler": "..."
  },
  "contract": {
    "name": "prize_pool",
    "version": "0.1.0"
  },
  "V3": {
    "spec": {
      "constructors": [...],
      "messages": [...],
      "events": [...]
    }
  }
}
```

### 4. Verify Frontend Integration

The frontend automatically loads metadata from:
- `frontend/src/contracts/prize_pool.json`
- `frontend/src/contracts/rng.json`

These are imported in `frontend/src/lib/polkadot.ts`:

```typescript
import prizePoolMetadata from "../contracts/prize_pool.json";
import rngMetadata from "../contracts/rng.json";
```

## Error Handling

### Missing Contract Address

If `VITE_PRIZE_POOL_ADDRESS` or `VITE_RNG_ADDRESS` is not set:
- Frontend automatically enables mock mode
- Contract calls are no-ops
- No errors thrown

### Invalid Metadata

If metadata is invalid JSON:
- TypeScript compilation will fail
- Fix: Rebuild contracts and copy fresh metadata

### Network Connection Errors

If RPC endpoint is unreachable:
- `getApi()` will throw an error
- Error is caught and displayed to user
- Frontend falls back to mock mode if configured

## Testing Metadata Integration

### 1. Test Contract Client Initialization

```typescript
// In browser console or test file
import { PrizePoolClient } from './lib/prizePoolClient';

const client = new PrizePoolClient();
try {
  await client.init();
  console.log('✓ Contract client initialized');
} catch (error) {
  console.error('✗ Initialization failed:', error);
}
```

### 2. Test Metadata Loading

```typescript
import { getPrizePoolContract } from './lib/polkadot';

try {
  const contract = await getPrizePoolContract();
  console.log('✓ Contract metadata loaded');
  console.log('Contract address:', contract.address);
} catch (error) {
  console.error('✗ Metadata loading failed:', error);
}
```

### 3. Test Query Methods

```typescript
const client = new PrizePoolClient();
await client.init();

try {
  const poolInfo = await client.getPoolInfo();
  console.log('✓ Pool info query successful:', poolInfo);
} catch (error) {
  console.error('✗ Query failed:', error);
}
```

## Common Issues

### Issue: "Cannot find module '../contracts/prize_pool.json'"

**Solution**: Ensure metadata files exist in `frontend/src/contracts/`

### Issue: "Invalid metadata structure"

**Solution**: Rebuild contracts and copy fresh metadata files

### Issue: "Contract address not set"

**Solution**: Set `VITE_PRIZE_POOL_ADDRESS` and `VITE_RNG_ADDRESS` in `.env`

### Issue: "Metadata version mismatch"

**Solution**: Ensure contracts are built with ink! 4.3 and metadata matches

## Verification Checklist

- [ ] Contracts built successfully
- [ ] Metadata files exist in `artifacts/`
- [ ] Metadata copied to `frontend/src/contracts/`
- [ ] Frontend builds without errors
- [ ] Contract client initializes correctly
- [ ] Query methods work (or mock mode works)
- [ ] Error handling works gracefully

## Next Steps

After metadata integration:
1. Deploy contracts to Kusama Asset Hub
2. Set contract addresses in `.env`
3. Test with real contracts
4. Verify all contract methods work correctly

