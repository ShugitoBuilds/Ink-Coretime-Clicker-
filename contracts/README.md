# Coretime Clicker Contracts

This directory hosts the ink! smart-contract code for Coretime Clicker.

## Prerequisites

- Rust toolchain with `cargo` available.
- `cargo-contract` CLI (`cargo install cargo-contract --force --version 3.2.0`).
- `wasm32-unknown-unknown` target (`rustup target add wasm32-unknown-unknown`).

## Common Tasks

- **Build the contract**

  ```bash
  ./scripts/build_contract.sh --release
  ```

- **Run unit tests**

  ```bash
  ./scripts/test_contract.sh
  ```

Both scripts delegate to `cargo contract build` and `cargo test` with the manifest located at `contracts/coretime_clicker/Cargo.toml`.
