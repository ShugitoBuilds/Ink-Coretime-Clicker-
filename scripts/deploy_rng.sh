#!/bin/bash
# Deploy RNG Contract to Astar Network using Swanky CLI
# This script will be executed when you have ASTR tokens

echo '=== Deploying RNG Contract to Astar Network ==='
echo 'Constructor parameter: min_reveal_blocks = 10'
echo 'Network: Astar Network (Polkadot Parachain - use small amounts of real ASTR)'
echo 'RPC: wss://rpc.astar.network'
echo 'Using Swanky CLI for deployment'
echo ''

swanky contract deploy rng \
  --network astar \
  --account deployer \
  --constructorName new \
  --args 10

echo ''
echo '=== IMPORTANT: Save the contract address from the output above ==='

