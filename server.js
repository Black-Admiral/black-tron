require('dotenv').config();
const express = require('express');
const TronWeb = require('tronweb');

const app = express();
app.use(express.json());

// 1. TronWeb Init (Mainnet)
const fullNode = process.env.FULL_NODE;
const solidityNode = process.env.SOLIDITY_NODE;
const eventServer = process.env.EVENT_SERVER;
const privateKey = process.env.PRIVATE_KEY;

const tronWeb = new TronWeb(
  fullNode + `?apikey=${process.env.TRONGRID_API_KEY}`,
  solidityNode + `?apikey=${process.env.TRONGRID_API_KEY}`,
  eventServer + `?apikey=${process.env.TRONGRID_API_KEY}`,
  privateKey
);

// Root
app.get('/', (req, res) => {
  res.json({ 
    message: 'TRON Mainnet Server LIVE!', 
    network: 'TRON Mainnet',
    usdt_contract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
  });
});

// 1. Get TRX Balance
app.get('/balance/:address', async (req, res) => {
  const { address } = req.params;
  if (!tronWeb.isAddress(address)) {
    return res.status(400).json({ error: 'Invalid TRON address' });
  }
  try {
    const balance = await tronWeb.trx.getBalance(address);
    res.json({
      address,
      balanceTRX: balance / 1_000_000,
      balanceSun: balance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Send TRX
app.post('/send', async (req, res) => {
  const { to, amount } = req.body; // amount in TRX
  if (!to || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Missing/invalid to or amount' });
  }
  if (!tronWeb.isAddress(to)) {
    return res.status(400).json({ error: 'Invalid recipient address' });
  }
  try {
    const sender = tronWeb.address.fromPrivateKey(privateKey);
    const tx = await tronWeb.transactionBuilder.sendTrx(to, amount * 1_000_000, sender);
    const signedTx = await tronWeb.trx.sign(tx, privateKey);
    const result = await tronWeb.trx.sendRawTransaction(signedTx);
    if (result.result) {
      res.json({
        success: true,
        txid: result.txid,
        message: `Sent ${amount} TRX to ${to}`,
        explorer: `https://shasta.tronscan.org/#/transaction/${result.txid}`
      });
    } else {
      res.status(400).json({ error: 'TX failed', details: result });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Send USDT (TRC20) – For Binance Deposits
app.post('/send-usdt', async (req, res) => {
  const { to, amount } = req.body; // amount in USDT
  if (!to || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Missing/invalid to or amount' });
  }
  if (!tronWeb.isAddress(to)) {
    return res.status(400).json({ error: 'Invalid recipient address' });
  }
  try {
    const usdtContractAddress = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; // MAINNET USDT
    const usdtContract = await tronWeb.contract().at(usdtContractAddress);
    const result = await usdtContract.transfer(to, amount * 1_000_000).send({ // 6 decimals
      feeLimit: 100_000_000 // 100 TRX max fee
    });
    res.json({
      success: true,
      txid: result,
      message: `Sent ${amount} USDT to ${to} (Binance TRC20 ready!)`,
      explorer: `https://shasta.tronscan.org/#/transaction/${result}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Generate Wallet
app.get('/generate-wallet', async (req, res) => {
  try {
    const account = await tronWeb.createAccount();
    res.json({
      message: 'New Shasta wallet generated!',
      address: account.address.base58,
      privateKey: account.privateKey,
      warning: 'Keep privateKey secret! Fund via faucet.'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});
app.listen(PORT, () => {
  console.log(`TRON Server on http://localhost:${PORT}`);
  console.log(`Test: GET /balance/${tronWeb.address.fromPrivateKey(privateKey)}`);
});

const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per IP
  message: { error: 'Too many requests, please try again later.' }
});

app.use('/send', limiter);
app.use('/send-usdt', limiter);