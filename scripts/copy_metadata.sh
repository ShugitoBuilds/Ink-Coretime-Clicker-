#!/usr/bin/env bash

# Script to copy contract metadata to frontend after building contracts
# Usage: ./scripts/copy_metadata.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Copying contract metadata to frontend..."

# Copy PrizePool metadata
if [ -f "$ROOT_DIR/artifacts/prize_pool.json" ]; then
    echo "Copying PrizePool metadata..."
    cp "$ROOT_DIR/artifacts/prize_pool.json" "$ROOT_DIR/frontend/src/contracts/prize_pool.json"
    echo "✓ PrizePool metadata copied"
else
    echo "⚠ Warning: artifacts/prize_pool.json not found. Build contracts first."
fi

# Copy RNG metadata
if [ -f "$ROOT_DIR/artifacts/rng.json" ]; then
    echo "Copying RNG metadata..."
    cp "$ROOT_DIR/artifacts/rng.json" "$ROOT_DIR/frontend/src/contracts/rng.json"
    echo "✓ RNG metadata copied"
else
    echo "⚠ Warning: artifacts/rng.json not found. Build contracts first."
fi

echo "Metadata copy complete!"

