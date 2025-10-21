# Coretime Clicker

Coretime Clicker is an ink! smart-contract and Vite/React frontend that demonstrates Polkadot coretime rental mechanics as an on-chain idle game. The repository is split into a contract workspace (`contracts/`) and a web client (`frontend/`) plus helper scripts.

## Repository Layout

- `contracts/coretime_clicker/` – ink! v4.3 contract crate with unit tests and release bundle.
- `frontend/` – Vite + React + Tailwind web app that connects to the contract with `@polkadot/api`.
- `scripts/` – helper scripts for building/testing the contract.
- `artifacts/` – copies of the latest `.contract`, `.wasm`, and metadata JSON generated from the release build.

## Prerequisites

- Rust toolchain (`rustup`, `cargo`) with:
  - `wasm32-unknown-unknown` target
  - `rust-src` component
- `cargo-contract` **v3.2.0** (compatible with ink! 4.3).
- Node.js ≥ 18 with npm.

## Contract Workflow

```bash
# run from repo root
./scripts/test_contract.sh
./scripts/build_contract.sh --release
```

Outputs land in `contracts/coretime_clicker/target/ink/` and are copied to `artifacts/` for convenience:

- `coretime_clicker.contract`
- `coretime_clicker.wasm`
- `coretime_clicker.json`

### Deploying

1. Upload `artifacts/coretime_clicker.contract` using `cargo-contract upload` or the Polkadot.js Apps UI.
2. Instantiate the code with your chosen admin account and initial balance (no constructor parameters are required).
3. Record the deployed contract address for the frontend environment (`VITE_CONTRACT_ADDRESS`).

## Frontend Workflow

```bash
cd frontend
npm install
npm run dev    # development server
npm run build  # production bundle in frontend/dist
```

Create `.env` in `frontend/` with:

```
VITE_RPC_ENDPOINT=wss://rpc.shibuya.astar.network   # or your custom endpoint
VITE_CONTRACT_ADDRESS=<deployed_address>
```

The frontend ships with the latest contract metadata at `src/contracts/coretime_clicker.json`. Update this file if you rebuild the contract with schema changes.

## Manual Smoke Test Checklist

After deploying the contract and configuring the frontend:

1. **Wallet connection** – open the app, connect via the Polkadot.js extension, ensure address appears in the top bar.
2. **Rent core** – click “Rent Core 🚀”; confirm the transaction submits and the status panel increments “Cores rented.”
3. **Progress accrual** – wait ~10 simulated blocks (or the on-chain equivalent), verify the progress bar and pending reward increase.
4. **Claim rewards** – click “Collect Rewards,” check that balance increments and pending reward resets.
5. **Elastic Boom** – optionally simulate multiple claims to observe the multiplier banner; confirm boom claims decrement after each reward.
6. **Leaderboard update** – ensure your address appears in the leaderboard list with the updated total reward.

## Notes & Warnings

- ink! emits `__ink_dylint_*` warnings during builds; they are harmless in this context but can be silenced by upgrading ink! or adding the suggested cfg flags if desired.
- `npm audit` currently reports two moderate advisories from upstream Polkadot dependencies; monitor updates from the Substrate ecosystem for patches.

For deeper design context refer to `CoretimeClicker_design.md`.
