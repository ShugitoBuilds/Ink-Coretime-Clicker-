# Plan 3: Contract Metadata & Frontend Integration

## Overview
Ensure contract metadata is properly structured and frontend can connect to contracts correctly.

## Tasks

### 1. Build Contracts and Extract Metadata
- Run `./scripts/build_contract.sh --release`
- Verify artifacts are created:
  - `artifacts/prize_pool.contract`
  - `artifacts/prize_pool.json`
  - `artifacts/rng.contract`
  - `artifacts/rng.json`

### 2. Update Frontend Contract Metadata
- Copy `artifacts/prize_pool.json` to `frontend/src/contracts/prize_pool.json`
- Copy `artifacts/rng.json` to `frontend/src/contracts/rng.json`
- Verify metadata structure is valid JSON
- Check that all message signatures match contract code

### 3. Test Contract Client Initialization
- Verify `PrizePoolClient.init()` works
- Verify `getPrizePoolContract()` loads metadata correctly
- Test error handling for missing contract addresses
- Test error handling for invalid metadata

### 4. Test Contract Client Methods (Mock Mode)
- Test `getPoolInfo()` returns correct structure
- Test `enterJackpot()` handles mock mode
- Test `claimPrize()` handles mock mode
- Test `executeDraw()` handles mock mode
- Test `withdrawRake()` handles mock mode
- Test `setPaused()` handles mock mode
- Test `setRakeBps()` handles mock mode

### 5. Verify Error Handling
- Test missing contract address error
- Test invalid metadata error
- Test network connection errors
- Test transaction failure handling

## Success Criteria
- ✅ Contract metadata files are valid and up-to-date
- ✅ Frontend can initialize contract clients
- ✅ All contract client methods work in mock mode
- ✅ Error handling is graceful and user-friendly
- ✅ No runtime errors when contracts are not deployed

## Estimated Time
1-2 hours

