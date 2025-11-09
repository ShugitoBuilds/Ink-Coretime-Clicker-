# Resource Exploration & Deployment Attempts Summary

## ✅ Completed Actions

### 1. Studied inkathon Deployment Patterns
- **Cloned inkathon repository** (both v6 and v1 branches)
- **Analyzed deployment scripts**: inkathon v1 uses `@scio-labs/use-inkathon` helper library
- **Key finding**: inkathon uses proven deployment patterns but we're hitting the same ContractTrapped error

### 2. Set Up DRink! Testing Framework
- ✅ Added `drink = "0.8"` to both RNG and PrizePool `Cargo.toml` dev-dependencies
- ✅ Created `contracts/rng/tests/drink_tests.rs` with basic DRink! test structure
- **Next**: Complete DRink! test implementation to test contracts locally

### 3. Created New Deployment Scripts
- ✅ `scripts/deploy_rng_inkathon_pattern.js` - Uses inkathon patterns with higher gas limits
- ✅ Tested with various gas limits (200B → 300B → 500B refTime)
- ✅ Tested with various endowments (1 ASTR → 2 ASTR → 5 ASTR → dynamic)
- **Result**: Still getting `ContractTrapped` error (error code: `0x0c000000`)

### 4. Swanky CLI Investigation
- ✅ Discovered Swanky commands: `swanky contract deploy CONTRACTNAME --network astar --account deployer --constructorName new --args 10`
- ⚠️ Swanky has artifact path issue (looking for `undefined.json`)
- **Next**: Fix Swanky config or try manual Swanky deployment

## 🔍 Key Discoveries

### ContractTrapped Error Persists
- **Error Code**: `0x0c000000` (module 70 = contracts pallet)
- **Occurs**: During contract instantiation (constructor execution)
- **Affects**: 
  - Our RNG contract (ink! 4.2.0)
  - Our PrizePool contract (ink! 4.2.0)
  - Minimal test contract (ink! 4.0.0)
  - Minimal test contract (ink! 4.2.0)

### What We've Tried
1. ✅ Fixed TypeInfo derivation (conditional `#[cfg_attr]`)
2. ✅ Aligned ink! versions (both contracts use 4.2.0)
3. ✅ Increased gas limits (up to 500B refTime, 500k proofSize)
4. ✅ Varied endowments (1-5 ASTR)
5. ✅ Different deployment scripts (custom, inkathon patterns)
6. ✅ Different API approaches (Polkadot.js API directly)

### What We Haven't Tried Yet
1. ⏳ **DRink! local testing** - Test contracts in-memory before deployment
2. ⏳ **Swanky CLI deployment** - Astar's official tool (needs config fix)
3. ⏳ **Polkadot.js Apps UI** - Manual deployment via web interface
4. ⏳ **Different RPC endpoint** - Try alternative Astar RPC nodes
5. ⏳ **Astar Discord response** - Awaiting official guidance

## 📊 Error Progression

1. **First attempts**: `ContractTrapped` with 200B refTime, 2-3 ASTR endowment
2. **Balance error**: `TransferFailed` when trying to use too much balance
3. **Back to ContractTrapped**: Even with 1 ASTR endowment and reasonable gas

**Conclusion**: The issue is NOT about gas limits or endowment amounts. It's a fundamental runtime compatibility issue.

## 💡 Insights from Resources

### inkathon v1
- Uses `@scio-labs/use-inkathon` helper library
- Uses `@polkadot/api` v12 (we're using v11)
- Has proven deployment patterns
- **But**: We're hitting the same error even with their patterns

### DRink! Testing
- **Purpose**: Test contracts locally without network deployment
- **Benefit**: Can catch ContractTrapped errors in development
- **Status**: Partially set up, needs test completion

### Successful Gaming dApps on Astar
- **Lucky Lotto**: Confirms Astar DOES support ink! contracts
- **Implication**: Our issue is likely deployment method or configuration, not network incompatibility

## 🎯 Recommended Next Steps

### Immediate (While Waiting for Astar Discord Response)
1. **Complete DRink! tests** - Verify contracts work locally
2. **Fix Swanky CLI config** - Try Astar's official deployment tool
3. **Try Polkadot.js Apps UI** - Manual deployment to rule out script issues

### Short-term
1. **Test on Shibuya testnet** - See if issue is mainnet-specific
2. **Try alternative RPC endpoints** - Different Astar nodes
3. **Check Astar runtime version** - Verify compatibility with ink! 4.2.0

### Long-term
1. **Consider alternative networks** if Astar issue persists:
   - Phala Network (Khala) - 6,000+ ink! contracts
   - Aleph Zero - Strong ink! support
2. **Upgrade to ink! 6.0** if/when Astar supports PolkaVM

## 📁 Files Created/Modified

### New Files
- ✅ `scripts/deploy_rng_inkathon_pattern.js` - Deployment using inkathon patterns
- ✅ `scripts/deploy_test_contract.js` - Minimal contract deployment test
- ✅ `contracts/rng/tests/drink_tests.rs` - DRink! test structure
- ✅ `.cursor/resource-exploration-summary.md` - This document

### Modified Files
- ✅ `contracts/rng/Cargo.toml` - Added DRink! dependency
- ✅ `contracts/prize_pool/Cargo.toml` - Added DRink! dependency
- ✅ `scripts/deploy_rng_node.js` - Increased gas limits

## 🔗 Useful Resources Found

1. **ink! Dev Hub**: https://github.com/inkdevhub
   - DRink! testing framework
   - Swanky CLI tools
   - Example contracts

2. **inkathon Boilerplate**: https://github.com/scio-labs/inkathon
   - v1 branch: Traditional WASM deployment patterns
   - v6 branch: PolkaVM/ink! 6.0 patterns

3. **Astar Documentation**: https://docs.astar.network/
   - ink! development guides
   - Deployment instructions

4. **Successful Games on Astar**: https://astar.network/ecosystem
   - Lucky Lotto and other games prove Astar supports ink!

## ⚠️ Current Blocker

**ContractTrapped Error** persists across all deployment attempts:
- Different gas limits ❌
- Different endowments ❌
- Different deployment scripts ❌
- Different ink! versions (4.0.0, 4.2.0) ❌
- Even minimal test contracts ❌

**This strongly suggests**: Runtime compatibility issue that requires Astar Network team input.

## 📝 Notes for Astar Discord Discussion

When discussing with Astar admins, mention:
- Error code: `0x0c000000` (contracts.ContractTrapped)
- Affects ALL ink! contracts (even minimal bool storage)
- Tested with ink! 4.0.0 and 4.2.0
- Code upload succeeds, instantiation fails
- Contracts compile and pass unit tests
- Network: Astar Mainnet (`wss://rpc.astar.network`)
- Example transactions: Multiple failed attempts documented
