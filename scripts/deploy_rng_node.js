const { ApiPromise, WsProvider, Keyring } = require('../frontend/node_modules/@polkadot/api');
const fs = require('fs');
const path = require('path');

async function deployRNG() {
  console.log('=== Deploying RNG Contract to Astar Network ===');
  
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
  console.log('Balance:', balance.data.free.toString());
  
  // Upload code
  console.log('Uploading contract code...');
  // uploadCode(code, storageDepositLimit, determinism)
  const uploadTx = api.tx.contracts.uploadCode(wasmHex, null, 'Enforced');
  const uploadHash = await uploadTx.signAndSend(deployer);
  console.log('Code upload transaction hash:', uploadHash.toString());
  
  // Wait for upload to be included
  await new Promise(resolve => setTimeout(resolve, 12000));
  
  // Get code hash from contract metadata
  const codeHash = contractData.source.hash;
  console.log('Code hash:', codeHash);
  
  // Instantiate contract with proper gas estimation
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
  
  // Create instantiate call for gas estimation
  const instantiateCall = api.tx.contracts.instantiate(
    '2000000000000000000', // value (endowment) - 2 ASTR
    null, // gasLimit - will estimate
    null, // storageDepositLimit
    codeHash,
    data,
    '0x' // salt
  );
  
  // Estimate gas properly
  console.log('Estimating gas...');
  const gasInfo = await instantiateCall.paymentInfo(deployer);
  console.log('Payment info:', JSON.stringify(gasInfo, null, 2));
  
  // Get actual weight estimate by dry-running the call
  // Use a high gas limit for dry-run to get accurate estimate
  const dryRunGasLimit = api.registry.createType('WeightV2', {
    refTime: 100000000000, // High limit for dry run
    proofSize: 100000
  });
  
  const dryRunCall = api.tx.contracts.instantiate(
    '2000000000000000000',
    dryRunGasLimit,
    null,
    codeHash,
    data,
    '0x'
  );
  
  // Use a much higher gas limit to avoid ContractTrapped errors
  // Based on typical ink! contract deployments, we need substantial gas
  const gasLimitV2 = api.registry.createType('WeightV2', {
    refTime: 300000000000, // 300 billion refTime (increased from 200)
    proofSize: 300000 // 300k proofSize (increased from 200k)
  });
  
  console.log('Using gas limit:', {
    refTime: gasLimitV2.refTime.toString(),
    proofSize: gasLimitV2.proofSize.toString()
  });

  // Create the actual instantiate transaction
  const instantiateTx = api.tx.contracts.instantiate(
    '3000000000000000000', // 3 ASTR endowment (increased from 2)
    gasLimitV2,
    null, // storageDepositLimit - let runtime determine
    codeHash,
    data,
    '0x' // salt
  );
  
  console.log('Submitting instantiate transaction...');
  
  // Use signAndSend with callback to get events directly
  const instantiatePromise = new Promise((resolve, reject) => {
    instantiateTx.signAndSend(deployer, { nonce: -1 }, (result) => {
      if (result.status.isInBlock || result.status.isFinalized) {
        console.log('Transaction included in block:', result.status.asInBlock.toString());
        
        // Extract contract address from events
        let contractAddress = null;
        let hasError = false;
        let errorInfo = null;
        
        console.log('\nEvents received:', result.events.length);
        if (result.events.length === 0) {
          console.log('⚠️  No events found. This might indicate a failed transaction.');
        }
        result.events.forEach(({ event }, index) => {
          console.log(`  Event ${index + 1}:`, event.section + '.' + event.method, JSON.stringify(event.data.toJSON ? event.data.toJSON() : event.data.toString()));
          
          // Check for contract instantiation
          if (event.section === 'contracts' && event.method === 'Instantiated') {
            const instantiated = event.data;
            // event.data is [deployer, contract, codeHash]
            contractAddress = instantiated[1].toString();
            console.log('✅ Contract instantiated at address:', contractAddress);
          }
          
          // Check for errors
          if (event.section === 'system' && event.method === 'ExtrinsicFailed') {
            hasError = true;
            const [dispatchError] = event.data;
            errorInfo = dispatchError.toString();
            if (dispatchError.isModule) {
              try {
                const decoded = api.registry.findMetaError(dispatchError.asModule);
                errorInfo = `${decoded.section}.${decoded.name}: ${decoded.docs}`;
              } catch (e) {
                // Fallback to string representation
              }
            }
            console.error('❌ Transaction failed:', errorInfo);
          }
          
          // Check for contract trapped error
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
          console.log('⚠️  Contract address not found in events.');
          console.log('Transaction hash:', result.status.asInBlock.toString());
          console.log('View on explorer: https://astar.subscan.io/extrinsic/' + result.status.asInBlock.toString());
          
          // Try to query the transaction status directly
          console.log('\nQuerying transaction status from API...');
          const blockHash = result.status.asInBlock;
          api.query.system.events.at(blockHash).then((events) => {
            let foundAddress = null;
            let foundError = null;
            
            events.forEach((record, index) => {
              const { event } = record;
              console.log(`  API Event ${index + 1}:`, event.section + '.' + event.method);
              
              if (event.section === 'contracts' && event.method === 'Instantiated') {
                const instantiated = event.data;
                const addr = instantiated[1].toString();
                console.log('✅ Found contract address:', addr);
                foundAddress = addr;
              }
              
              if (event.section === 'system' && event.method === 'ExtrinsicFailed') {
                const [dispatchError, dispatchInfo] = event.data;
                console.error('\n❌ Transaction failed!');
                console.error('Error data:', dispatchError.toString());
                
                // Try to decode the error
                if (dispatchError.isModule) {
                  try {
                    const decoded = api.registry.findMetaError(dispatchError.asModule);
                    console.error(`Error: ${decoded.section}.${decoded.name}`);
                    console.error(`Docs: ${decoded.docs.join(' ')}`);
                    foundError = `${decoded.section}.${decoded.name}: ${decoded.docs.join(' ')}`;
                  } catch (e) {
                    console.error('Could not decode error:', e.message);
                    foundError = dispatchError.toString();
                  }
                } else if (dispatchError.isToken) {
                  console.error('Token error:', dispatchError.asToken.toString());
                  foundError = 'Token error: ' + dispatchError.asToken.toString();
                } else if (dispatchError.isArithmetic) {
                  console.error('Arithmetic error:', dispatchError.asArithmetic.toString());
                  foundError = 'Arithmetic error: ' + dispatchError.asArithmetic.toString();
                }
              }
              
              // Check for ContractTrapped specifically
              if (event.section === 'contracts' && event.method === 'ContractTrapped') {
                console.error('❌ ContractTrapped error:', event.data.toString());
                foundError = 'ContractTrapped: ' + event.data.toString();
              }
            });
            
            if (foundAddress) {
              resolve(foundAddress);
            } else if (foundError) {
              reject(new Error(foundError));
            } else {
              console.log('Please check the explorer for transaction status.');
              resolve(null);
            }
          }).catch((err) => {
            console.log('Could not query events from API:', err.message);
            reject(new Error('Could not query transaction status: ' + err.message));
          });
        }
      } else if (result.isError) {
        console.error('Transaction error:', result.toString());
        reject(new Error('Transaction error: ' + result.toString()));
      }
    });
  });
  
  const contractAddress = await instantiatePromise;
  
  await api.disconnect();
  return contractAddress;
}

deployRNG()
  .then((address) => {
    if (address) {
      console.log('\n✅ RNG Contract deployed successfully!');
      console.log('Contract address:', address);
      process.exit(0);
    } else {
      console.log('\n⚠️  Deployment transaction submitted. Please check Subscan for status.');
      process.exit(0);
    }
  })
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });

