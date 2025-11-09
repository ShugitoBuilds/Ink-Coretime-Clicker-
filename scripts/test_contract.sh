#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Test PrizePool contract
echo "Testing PrizePool contract..."
cargo test --manifest-path "$ROOT_DIR/contracts/prize_pool/Cargo.toml" "$@"

# Test RNG contract
echo "Testing RNG contract..."
cargo test --manifest-path "$ROOT_DIR/contracts/rng/Cargo.toml" "$@"
