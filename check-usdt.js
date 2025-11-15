require('dotenv').config();
const TronWeb = require('tronweb');

const fullNode = process.env.NILE_FULL_NODE;
const solidityNode = process.env.NILE_SOLIDITY_NODE;
const eventServer = process.env.NILE_EVENT_SERVER;
const privateKey = process.env.PRIVATE_KEY;

const tronWeb = new TronWeb(fullNode, solidityNode, eventServer, privateKey);
const usdtContractAddress = 'TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf'; // Nile USDT

(async () => {
  try {
    const usdtContract = await tronWeb.contract().at(usdtContractAddress);
    const address = tronWeb.address.fromPrivateKey(privateKey);
    const balance = await usdtContract.balanceOf(address).call();
    console.log(`USDT Balance: ${balance / 1_000_000} USDT`); // 6 decimals
  } catch (error) {
    console.error('Error:', error.message);
  }
})();