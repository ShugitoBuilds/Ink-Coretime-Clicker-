# Plan 6: Testnet Deployment & Testing

## Overview
Deploy contracts to testnet and perform end-to-end testing.

## Tasks

### 1. Prepare Testnet Deployment
- Set up testnet accounts (Paseo Asset Hub recommended, or Kusama Asset Hub for direct testing)
- Fund testnet accounts with test tokens (PAS for Paseo, or small amounts of KSM for Kusama)
- Prepare deployment parameters:
  - Admin address
  - Rake BPS (e.g., 500 = 5%)
  - Max entries per draw (e.g., 100)
  - Max entry fee
  - Min reveal blocks (e.g., 10)

### 2. Deploy Contracts
- Deploy RNG contract first
- Record RNG contract address
- Deploy PrizePool contract with RNG address
- Record PrizePool contract address
- Verify contracts on block explorer

### 3. Update Frontend Configuration
- Create testnet `.env` file
- Set `VITE_RPC_ENDPOINT` to testnet RPC
- Set `VITE_PRIZE_POOL_ADDRESS` to deployed address
- Set `VITE_RNG_ADDRESS` to deployed address
- Set `VITE_USE_MOCK=false`

### 4. End-to-End Testing
- Test complete user flow: click → session → entry → draw → claim
- Test admin functions: pause, withdraw rake, set rake BPS
- Test edge cases:
  - Max entries reached
  - Entry fee too high
  - Claiming prize as non-winner
  - Paused contract behavior
- Test with multiple users
- Verify events are emitted correctly
- Check block subscriptions work

### 5. Gas Cost Analysis
- Measure gas costs for all contract calls
- Document gas costs for users
- Optimize if costs are too high

## Success Criteria
- ✅ Contracts deployed to testnet
- ✅ Frontend connects to testnet contracts
- ✅ All user flows work end-to-end
- ✅ Admin functions work correctly
- ✅ Edge cases handled properly
- ✅ Gas costs documented

## Estimated Time
4-6 hours

