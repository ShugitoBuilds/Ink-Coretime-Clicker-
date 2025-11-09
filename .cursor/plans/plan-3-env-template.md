# Frontend Environment Variables Template

Copy this template to `frontend/.env` and fill in the values after deploying contracts.

```env
# ============================================
# RPC Endpoint Configuration
# ============================================
# Kusama Asset Hub (default)
VITE_RPC_ENDPOINT=wss://kusama-asset-hub-rpc.polkadot.io

# ============================================
# Contract Addresses (REQUIRED)
# ============================================
# Set these after deploying contracts
VITE_PRIZE_POOL_ADDRESS=
VITE_RNG_ADDRESS=

# ============================================
# Game Configuration
# ============================================
VITE_ENTRY_FEE=1000000000000
VITE_REVEAL_WINDOW_BLOCKS=10
VITE_RAKE_BPS=500

# ============================================
# Token Configuration
# ============================================
VITE_TOKEN_DECIMALS=12
VITE_TOKEN_SYMBOL=KSM

# ============================================
# Admin Configuration (Optional)
# ============================================
VITE_ADMIN_ADDRESS=
```

See `.cursor/plans/plan-3-contract-instantiation-params.md` for detailed documentation.

