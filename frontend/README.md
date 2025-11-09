# Coretime Clicker Frontend

React + Vite interface for interacting with the Coretime Clicker ink! contract.

## Getting Started

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Create a `.env` file in this directory with:

```bash
# For Astar Network (Polkadot Parachain)
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

`VITE_CONTRACT_METADATA` is optional; it defaults to the curated metadata shipped at `src/contracts/coretime_clicker.json`. If you rebuild the contract with schema changes, overwrite that file or point the env variable at a new JSON artifact.

If you do not have a contract deployed yet, omit the address and the app will run in local mock mode.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — create a production build
- `npm run preview` — preview the production build locally

Production assets land in `dist/`; deploy that directory to your preferred static host.
