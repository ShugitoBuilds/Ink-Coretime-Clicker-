# Astar Network Deployment Summary

## Changes Made

All project files have been updated to target **Astar Network** (Polkadot parachain) instead of Kusama Asset Hub.

### Updated Files

1. **Deployment Scripts**
   - `scripts/deploy_rng.sh` - Updated to use `wss://rpc.astar.network`
   - `scripts/deploy_prize_pool.sh` - Updated to use `wss://rpc.astar.network`

2. **Frontend Configuration**
   - `frontend/src/config.ts` - Default RPC: `wss://rpc.astar.network`, Token: `ASTR`, Decimals: `18`
   - `frontend/README.md` - Updated environment variable examples

3. **Documentation**
   - `README.md` - Updated deployment instructions for Astar Network
   - `.cursor/plans/plan-6-testnet-deployment-guide.md` - Complete rewrite for Astar Network

### Key Configuration Changes

| Setting | Old Value | New Value |
|---------|-----------|-----------|
| RPC Endpoint | `wss://kusama-asset-hub-rpc.polkadot.io` | `wss://rpc.astar.network` |
| Token Symbol | `KSM` | `ASTR` |
| Token Decimals | `12` | `18` |
| Network Type | Kusama Asset Hub (no ink! support) | Astar Network (Polkadot parachain with ink! support) |

### Important Notes

1. **Token Decimals**: ASTR has 18 decimals (vs KSM's 12 decimals)
   - Entry fee `1000000000000` planck units = 0.000001 ASTR (very small)
   - Adjust `max_entry_fee` if needed for your use case

2. **Getting ASTR Tokens**:
   - Mainnet: Purchase from exchanges (Coinbase, Binance, Kraken, etc.)
   - Testnet (Shibuya): May have faucet issues - check Astar Discord/Telegram

3. **Network Compatibility**:
   - ✅ Standard `pallet-contracts` support
   - ✅ Standard ink! contracts work without modification
   - ✅ Polkadot.js Extension compatible
   - ✅ Full Polkadot ecosystem integration

### Next Steps

1. **Get ASTR Tokens**: Purchase small amount from exchange for testing
2. **Deploy Contracts**: Run `./scripts/deploy_rng.sh` then `./scripts/deploy_prize_pool.sh`
3. **Update Frontend**: Set contract addresses in `frontend/.env`
4. **Test**: Verify all functionality works on Astar Network

### Resources

- **Astar Network Docs**: https://docs.astar.network/
- **Astar Explorer**: https://astar.subscan.io/
- **Polkadot.js Apps**: https://polkadot.js.org/apps/?rpc=wss://rpc.astar.network
- **Astar Developer Portal**: https://astar.network/developers

