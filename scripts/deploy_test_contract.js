const { ApiPromise, WsProvider, Keyring } = require('../frontend/node_modules/@polkadot/api');
const fs = require('fs');
const path = require('path');

async function deployTestContract() {
  console.log('=== Deploying Minimal Test Contract to Astar Network ===');
  
  // Connect to Astar Network
  const provider = new WsProvider('wss://rpc.astar.network');
  const api = await ApiPromise.create({ provider });
  
  console.log('Connected to Astar Network');
  
  // Load contract files
  const contractPath = path.join(__dirname, '..', 'contracts', 'test_minimal', 'test_contract', 'target', 'ink', 'test_contract.contract');
  const contractData = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
  const wasmPath = path.join(__dirname, '..', 'contracts', 'test_minimal', 'test_contract', 'target', 'ink', 'test_contract.wasm');
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
  const uploadTx = api.tx.contracts.uploadCode(wasmHex, null, 'Enforced');
  const uploadHash = await uploadTx.signAndSend(deployer);
  console.log('Code upload transaction hash:', uploadHash.toString());
  
  // Wait for upload to be included
  await new Promise(resolve => setTimeout(resolve, 12000));
  
  // Get code hash from contract metadata
  const codeHash = contractData.source.hash;
  console.log('Code hash:', codeHash);
  
  // Instantiate contract
  console.log('Instantiating contract with init_value = false...');
  
  // Get constructor info from metadata
  const constructor = contractData.spec.constructors.find(c => c.label === 'new');
  if (!constructor) {
    throw new Error('Constructor "new" not found in contract metadata');
  }
  
  const constructorSelector = constructor.selector;
  console.log('Constructor selector:', constructorSelector);
  
  // Encode constructor args: init_value = false (bool)
  const argsEncoded = api.createType('bool', false).toHex().slice(2);
  const data = constructorSelector + argsEncoded.padStart(2, '0');
  console.log('Encoded constructor data:', data);
  
  // Use high gas limit
  const gasLimitV2 = api.registry.createType('WeightV2', {
    refTime: 300000000000,
    proofSize: 300000
  });
  
  console.log('Using gas limit:', {
    refTime: gasLimitV2.refTime.toString(),
    proofSize: gasLimitV2.proofSize.toString()
  });

  // Create the actual instantiate transaction
  const instantiateTx = api.tx.contracts.instantiate(
    '3000000000000000000', // 3 ASTR endowment
    gasLimitV2,
    null,
    codeHash,
    data,
    '0x'
  );
  
  console.log('Submitting instantiate transaction...');
  
  // Use signAndSend with callback
  const instantiatePromise = new Promise((resolve, reject) => {
    instantiateTx.signAndSend(deployer, { nonce: -1 }, (result) => {
      if (result.status.isInBlock || result.status.isFinalized) {
        console.log('Transaction included in block:', result.status.asInBlock.toString());
        
        let contractAddress = null;
        let hasError = false;
        let errorInfo = null;
        
        console.log('\nEvents received:', result.events.length);
        result.events.forEach(({ event }, index) => {
          console.log(`  Event ${index + 1}:`, event.section + '.' + event.method);
          
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
                errorInfo = `${decoded.section}.${decoded.name}: ${decoded.docs}`;
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
          resolve(contractAddress);
        } else {
          console.log('⚠️  Contract address not found in events.');
          console.log('Transaction hash:', result.status.asInBlock.toString());
          console.log('View on explorer: https://astar.subscan.io/extrinsic/' + result.status.asInBlock.toString());
          
          // Query events from API
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
              resolve(foundAddress);
            } else if (foundError) {
              reject(new Error(foundError));
            } else {
              reject(new Error('Could not determine transaction status'));
            }
          }).catch((err) => {
            reject(new Error('Could not query events: ' + err.message));
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

deployTestContract()
  .then((address) => {
    console.log('\n✅ Test Contract deployed successfully!');
    console.log('Contract address:', address);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });

