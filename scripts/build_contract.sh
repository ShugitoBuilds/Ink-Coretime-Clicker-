#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Build PrizePool contract
echo "Building PrizePool contract..."
cargo contract build --manifest-path "$ROOT_DIR/contracts/prize_pool/Cargo.toml" "$@"
if [ $? -eq 0 ]; then
    echo "Copying PrizePool artifacts..."
    mkdir -p "$ROOT_DIR/artifacts"
    cp "$ROOT_DIR/contracts/prize_pool/target/ink/prize_pool.contract" "$ROOT_DIR/artifacts/" 2>/dev/null || true
    cp "$ROOT_DIR/contracts/prize_pool/target/ink/prize_pool.wasm" "$ROOT_DIR/artifacts/" 2>/dev/null || true
    cp "$ROOT_DIR/contracts/prize_pool/target/ink/metadata.json" "$ROOT_DIR/artifacts/prize_pool.json" 2>/dev/null || true
fi

# Build RNG contract
echo "Building RNG contract..."
cargo contract build --manifest-path "$ROOT_DIR/contracts/rng/Cargo.toml" "$@"
if [ $? -eq 0 ]; then
    echo "Copying RNG artifacts..."
    mkdir -p "$ROOT_DIR/artifacts"
    cp "$ROOT_DIR/contracts/rng/target/ink/rng.contract" "$ROOT_DIR/artifacts/" 2>/dev/null || true
    cp "$ROOT_DIR/contracts/rng/target/ink/rng.wasm" "$ROOT_DIR/artifacts/" 2>/dev/null || true
    cp "$ROOT_DIR/contracts/rng/target/ink/metadata.json" "$ROOT_DIR/artifacts/rng.json" 2>/dev/null || true
fi

echo "Build complete!"
