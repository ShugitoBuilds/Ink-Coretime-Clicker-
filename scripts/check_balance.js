#!/usr/bin/env node
// Simple balance checker for Paseo Asset Hub
// Usage: node check_balance.js <address>

const { ApiPromise, WsProvider } = require('@polkadot/api');

async function checkBalance(address) {
  const provider = new WsProvider('wss://paseo-asset-hub-rpc.polkadot.io');
  const api = await ApiPromise.create({ provider });

  try {
    // Get account info
    const accountInfo = await api.query.system.account(address);
    const balance = accountInfo.data.free;
    const reserved = accountInfo.data.reserved;
    const frozen = accountInfo.data.frozen;
    const total = balance.add(reserved);

    console.log('\n=== Paseo Asset Hub Balance ===');
    console.log(`Address: ${address}`);
    console.log(`Free: ${balance.toHuman()} PAS`);
    console.log(`Reserved: ${reserved.toHuman()} PAS`);
    console.log(`Frozen: ${frozen.toHuman()} PAS`);
    console.log(`Total: ${total.toHuman()} PAS`);
    console.log(`\nFree Balance (raw): ${balance.toString()}`);
    
    // Check if balance is sufficient for deployment (need at least 5 PAS = 5_000_000_000_000 planck)
    const minBalance = 5_000_000_000_000n;
    if (balance.toBigInt() >= minBalance) {
      console.log('\n✅ Sufficient balance for deployment!');
    } else {
      console.log('\n⚠️  Balance may be too low for deployment. Need at least 5 PAS.');
    }
  } catch (error) {
    console.error('Error checking balance:', error.message);
  } finally {
    await api.disconnect();
  }
}

const address = process.argv[2] || 'DMK8RWyf1fPAi3TJ8KW7Q1DpTZ73TSGzPB2gUjpho8ktk38';
checkBalance(address);

