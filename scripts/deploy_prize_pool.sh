#!/bin/bash
# Deploy PrizePool Contract to Astar Network using Swanky CLI
# Usage: ./deploy_prize_pool.sh <RNG_CONTRACT_ADDRESS>

if [ -z "$1" ]; then
    echo 'Error: RNG contract address required'
    echo 'Usage: ./deploy_prize_pool.sh <RNG_CONTRACT_ADDRESS>'
    exit 1
fi

RNG_ADDRESS="$1"
ADMIN_ADDRESS="WiHuQ9BotHZdtFr1ixaF6oVkuyzD1KqZCqRXXfj6MvDjmgC"

echo '=== Deploying PrizePool Contract to Astar Network ==='
echo "Admin Address: $ADMIN_ADDRESS"
echo "RNG Address: $RNG_ADDRESS"
echo 'Parameters: rake_bps=500, max_entries_per_draw=100, max_entry_fee=1000000000000'
echo 'Network: Astar Network (Polkadot Parachain - use small amounts of real ASTR)'
echo 'RPC: wss://rpc.astar.network'
echo 'Using Swanky CLI for deployment'
echo ''

swanky contract deploy prize_pool \
  --network astar \
  --account deployer \
  --constructorName new \
  --args "$ADMIN_ADDRESS" \
  --args "500" \
  --args "$RNG_ADDRESS" \
  --args "100" \
  --args "1000000000000"

echo ''
echo '=== IMPORTANT: Save the PrizePool contract address from the output above ==='

