require('dotenv').config();
const TronWeb = require('tronweb');

// v5.3.1: Use separate parameters
const fullNode = 'https://api.shasta.trongrid.io';
const solidityNode = 'https://api.shasta.trongrid.io';
const eventServer = 'https://api.shasta.trongrid.io';

(async () => {
  try {
    const tronWeb = new TronWeb(fullNode, solidityNode, eventServer);

    const account = await tronWeb.createAccount();

    console.log('SHASHA TEST WALLET GENERATED');
    console.log('Address:', account.address.base58);
    console.log('Private Key:', account.privateKey);
    console.log('\nNEXT STEPS:');
    console.log('1. Copy Address');
    console.log('2. Go: https://nileex.io/faucet');
    console.log('3. Select "Shasta" → Paste → Submit');
    console.log('4. Paste Private Key into .env');
    console.log(`\nPRIVATE_KEY=${account.privateKey}`);
  } catch (error) {
    console.error('Error:', error.message);
  }
})();