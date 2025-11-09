import { ApiPromise, WsProvider } from '@polkadot/api';

async function checkBalance() {
  const provider = new WsProvider('wss://paseo-asset-hub-rpc.polkadot.io');
  const api = await ApiPromise.create({ provider });
  const address = 'DMK8RWyf1fPAi3TJ8KW7Q1DpTZ73TSGzPB2gUjpho8ktk38';
  
  try {
    const account = await api.query.system.account(address);
    const balance = account.data.free;
    const reserved = account.data.reserved;
    const frozen = account.data.frozen;
    const total = balance.add(reserved);

    console.log('\n=== Paseo Asset Hub Balance ===');
    console.log('Address:', address);
    console.log('Free Balance:', balance.toHuman(), 'PAS');
    console.log('Reserved:', reserved.toHuman(), 'PAS');
    console.log('Frozen:', frozen.toHuman(), 'PAS');
    console.log('Total Balance:', total.toHuman(), 'PAS');
    console.log('\nFree Balance (raw):', balance.toString());
    
    const minBalance = 5_000_000_000_000n; // 5 PAS
    if (balance.toBigInt() >= minBalance) {
      console.log('\n✅ Sufficient balance for deployment! (Need ~5 PAS)');
    } else {
      console.log('\n⚠️  Balance may be too low. Need at least 5 PAS for deployment.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await api.disconnect();
  }
}

checkBalance();

