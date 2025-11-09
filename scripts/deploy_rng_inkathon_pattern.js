const { ApiPromise, WsProvider } = require('../frontend/node_modules/@polkadot/api');
const { Keyring } = require('../frontend/node_modules/@polkadot/keyring');
const fs = require('fs');
const path = require('path');

/**
 * Deployment script using patterns from inkathon v1
 * Uses @polkadot/api directly (similar to inkathon's approach)
 */
async function deployRNGWithInkathonPattern() {
  console.log('=== Deploying RNG Contract using inkathon patterns ===');
  
  // Connect to Astar Network
  const provider = new WsProvider('wss://rpc.astar.network');
  const api = await ApiPromise.create({ provider });
  
  console.log('Connected to Astar Network');
  
  // Load contract files
  const contractPath = path.join(__dirname, '..', 'artifacts', 'rng', 'rng.contract');
  const contractData = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  const wasmPath = path.join(__dirname, '..', 'artifacts', 'rng', 'rng.wasm');
  const wasmHex = '0x' + fs.readFileSync(wasmPath).toString('hex');
  
  // Create keyring from mnemonic
  const keyring = new Keyring({ type: 'sr25519' });
  const deployer = keyring.addFromMnemonic('audit segment job dentist coil tissue broken oil habit scan fire nerve');
  
  console.log('Deployer address:', deployer.address);
  
  // Get balance
  const balance = await api.query.system.account(deployer.address);
  const freeBalance = balance.data.free;
  const reservedBalance = balance.data.reserved;
  const availableBalance = freeBalance.sub(reservedBalance);
  console.log('Balance:', {
    free: freeBalance.toString(),
    reserved: reservedBalance.toString(),
    available: availableBalance.toString()
  });
  
  // Calculate safe endowment (leave 1 ASTR for fees)
  const oneAstr = api.registry.createType('Balance', '1000000000000000000');
  const safeEndowment = availableBalance.sub(oneAstr);
  console.log('Safe endowment (available - 1 ASTR for fees):', safeEndowment.toString());
  
  // Check if account needs mapping (inkathon pattern)
  console.log('Checking account mapping...');
  const accountId = api.createType('AccountId', deployer.address);
  
  // Upload code
  console.log('Uploading contract code...');
  const uploadTx = api.tx.contracts.uploadCode(wasmHex, null, 'Enforced');
  
  const uploadHash = await new Promise((resolve, reject) => {
    uploadTx.signAndSend(deployer, (result) => {
      if (result.status.isInBlock || result.status.isFinalized) {
        console.log('Code uploaded in block:', result.status.asInBlock.toString());
        resolve(result.status.asInBlock);
      } else if (result.isError) {
        reject(new Error('Upload failed: ' + result.toString()));
      }
    });
  });
  
  // Wait for upload to be included
  await new Promise(resolve => setTimeout(resolve, 12000));
  
  // Get code hash from contract metadata
  const codeHash = contractData.source.hash;
  console.log('Code hash:', codeHash);
  
  // Instantiate contract
  console.log('Instantiating contract with min_reveal_blocks = 10...');
  
  // Get constructor info from metadata
  const constructor = contractData.spec.constructors.find(c => c.label === 'new');
  if (!constructor) {
    throw new Error('Constructor "new" not found in contract metadata');
  }
  
  const constructorSelector = constructor.selector;
  console.log('Constructor selector:', constructorSelector);
  
  // Encode constructor args: min_reveal_blocks = 10 (u32)
  const argsEncoded = api.createType('u32', 10).toHex().slice(2);
  const data = constructorSelector + argsEncoded.padStart(8, '0');
  console.log('Encoded constructor data:', data);
  
  // Use WeightV2 for gas limit (inkathon pattern) - reduced for balance
  const gasLimit = api.registry.createType('WeightV2', {
    refTime: 300000000000, // 300 billion (reduced from 500)
    proofSize: 300000 // 300k proofSize (reduced from 500k)
  });
  
  // Endowment (storage deposit) - use reasonable fixed amount
  // Leave plenty of balance for gas fees
  const endowment = api.registry.createType('Balance', '1000000000000000000'); // 1 ASTR (fixed, reasonable amount)
  console.log('Using endowment:', endowment.toString(), '(1 ASTR)');
  
  console.log('Using gas limit:', {
    refTime: gasLimit.refTime.toString(),
    proofSize: gasLimit.proofSize.toString()
  });
  console.log('Endowment:', endowment.toString());

  // Create instantiate transaction
  const instantiateTx = api.tx.contracts.instantiate(
    endowment,
    gasLimit,
    null, // storageDepositLimit - let runtime determine
    codeHash,
    data,
    '0x' // salt
  );
  
  console.log('Submitting instantiate transaction...');
  
  // Use signAndSend with callback (inkathon pattern)
  return new Promise((resolve, reject) => {
    instantiateTx.signAndSend(deployer, { nonce: -1 }, (result) => {
      if (result.status.isInBlock || result.status.isFinalized) {
        console.log('Transaction included in block:', result.status.asInBlock.toString());
        
        let contractAddress = null;
        let hasError = false;
        let errorInfo = null;
        
        console.log('\nProcessing events...');
        result.events.forEach(({ event }, index) => {
          const eventStr = `${event.section}.${event.method}`;
          console.log(`  Event ${index + 1}: ${eventStr}`);
          
          if (event.section === 'contracts' && event.method === 'Instantiated') {
            const instantiated = event.data;
            contractAddress = instantiated[1].toString();
            console.log('✅ Contract instantiated at address:', contractAddress);
          }
          
          if (event.section === 'system' && event.method === 'ExtrinsicFailed') {
            hasError = true;
            const [dispatchError] = event.data;
            errorInfo = dispatchError.toString();
            if (dispatchError.isModule) {
              try {
                const decoded = api.registry.findMetaError(dispatchError.asModule);
                errorInfo = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
              } catch (e) {
                // Fallback
              }
            }
            console.error('❌ Transaction failed:', errorInfo);
          }
          
          if (event.section === 'contracts' && event.method === 'ContractTrapped') {
            hasError = true;
            errorInfo = 'ContractTrapped: Contract execution failed';
            console.error('❌ Contract execution trapped:', event.data.toString());
          }
        });
        
        if (hasError) {
          reject(new Error(`Transaction failed: ${errorInfo || 'Unknown error'}`));
          return;
        }
        
        if (contractAddress) {
          console.log('\n🎉 Deployment successful!');
          console.log('Contract address:', contractAddress);
          console.log('Transaction hash:', result.status.asInBlock.toString());
          console.log('View on explorer: https://astar.subscan.io/extrinsic/' + result.status.asInBlock.toString());
          resolve(contractAddress);
        } else {
          // Query block events for contract address
          console.log('\nQuerying block events...');
          const blockHash = result.status.asInBlock;
          api.query.system.events.at(blockHash).then((events) => {
            let foundAddress = null;
            let foundError = null;
            
            events.forEach((record, index) => {
              const { event } = record;
              const eventStr = `${event.section}.${event.method}`;
              console.log(`  Block Event ${index + 1}: ${eventStr}`);
              
              if (event.section === 'contracts' && event.method === 'Instantiated') {
                const instantiated = event.data;
                const addr = instantiated[1].toString();
                console.log('✅ Found contract address:', addr);
                foundAddress = addr;
              }
              
              if (event.section === 'system' && event.method === 'ExtrinsicFailed') {
                const [dispatchError] = event.data;
                console.error('\n❌ Transaction failed!');
                console.error('Error data:', dispatchError.toString());
                
                if (dispatchError.isModule) {
                  try {
                    const decoded = api.registry.findMetaError(dispatchError.asModule);
                    console.error(`Error: ${decoded.section}.${decoded.name}`);
                    console.error(`Docs: ${decoded.docs.join(' ')}`);
                    foundError = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
                  } catch (e) {
                    foundError = dispatchError.toString();
                  }
                }
              }
              
              if (event.section === 'contracts' && event.method === 'ContractTrapped') {
                console.error('❌ ContractTrapped error:', event.data.toString());
                foundError = 'ContractTrapped: ' + event.data.toString();
              }
            });
            
            if (foundAddress) {
              console.log('\n🎉 Deployment successful!');
              console.log('Contract address:', foundAddress);
              resolve(foundAddress);
            } else if (foundError) {
              reject(new Error(foundError));
            } else {
              reject(new Error('Contract address not found in events'));
            }
          }).catch(reject);
        }
      } else if (result.isError) {
        console.error('Transaction error:', result.toString());
        reject(new Error('Transaction error: ' + result.toString()));
      }
    });
  }).finally(() => {
    api.disconnect();
  });
}

deployRNGWithInkathonPattern()
  .then((address) => {
    console.log('\n✅ RNG Contract deployed successfully!');
    console.log('Contract address:', address);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });

