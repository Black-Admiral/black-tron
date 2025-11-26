require('dotenv').config();
const express = require('express');
const TronWeb = require('tronweb');
const path = require('path');
const multer = require('multer');
const rateLimit = require('express-rate-limit');

const app = express();

// === CONFIG ===
const FULL_NODE = process.env.FULL_NODE || 'https://api.trongrid.io';
const SOLIDITY_NODE = process.env.SOLIDITY_NODE || 'https://api.trongrid.io';
const EVENT_SERVER = process.env.EVENT_SERVER || 'https://api.trongrid.io';
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const TRONGRID_API_KEY = process.env.TRONGRID_API_KEY || '';

const tronWeb = new TronWeb(
  FULL_NODE + (TRONGRID_API_KEY ? `?apikey=${TRONGRID_API_KEY}` : ''),
  SOLIDITY_NODE + (TRONGRID_API_KEY ? `?apikey=${TRONGRID_API_KEY}` : ''),
  EVENT_SERVER + (TRONGRID_API_KEY ? `?apikey=${TRONGRID_API_KEY}` : ''),
  PRIVATE_KEY
);

const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'; // Mainnet USDT

// === MIDDLEWARE ===
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Rate limit
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: { error: "Too many requests – try again later" }
});
app.use(limiter);

// Multer for proof upload
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// In-memory orders (replace with MongoDB later)
let orders = [];

// === ROUTES ===

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Create order (Buy or Sell USDT)
app.post('/api/order', upload.single('proof'), async (req, res) => {
  const { type, amount, phone, name } = req.body; // type = "buy" or "sell"

  if (!['buy', 'sell'].includes(type) || !amount || !phone) {
    return res.status(400).json({ error: "Invalid data" });
  }

  const order = {
    id: Date.now().toString(),
    type,
    amount: parseFloat(amount),
    phone,
    name: name || 'Anonymous',
    proof: req.file ? `/uploads/${req.file.filename}` : null,
    status: 'pending',
    createdAt: new Date()
  };

  orders.push(order);
  res.json({ success: true, orderId: order.id });
});

// Get all orders (admin only – protect later with password)
app.get('/api/orders', (req, res) => {
  res.json(orders);
});

// Approve order → send USDT
app.post('/api/approve', async (req, res) => {
  const { orderId, userAddress } = req.body;

  const order = orders.find(o => o.id === orderId && o.status === 'pending');
  if (!order || order.type !== 'buy') {
    return res.status(400).json({ error: "Invalid order" });
  }

  try {
    const contract = await tronWeb.contract().at(USDT_CONTRACT);
    const tx = await contract.transfer(
      userAddress,
      order.amount * 1_000_000 // 6 decimals
    ).send({ feeLimit: 40_000_000 });

    order.status = 'completed';
    order.txid = tx;
    order.userAddress = userAddress;

    res.json({ success: true, txid: tx });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`OKLEIN – Simply Crypto running on port ${PORT}`);
  console.log(`Visit: http://localhost:${PORT}`);
});
// === ADMIN DASHBOARD ===
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'oklein2025';

app.get('/admin', (req, res) => {
  if (req.query.pass !== ADMIN_PASSWORD) {
    return res.status(403).send('<h1>Access Denied</h1>');
  }
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Get pending orders only
app.get('/api/admin/orders', (req, res) => {
  if (req.query.pass !== ADMIN_PASSWORD) return res.status(403).json({ error: 'Forbidden' });
  const pending = orders.filter(o => o.status === 'pending');
  res.json(pending);
});

// Approve & send USDT
app.post('/api/admin/approve', async (req, res) => {
  if (req.query.pass !== ADMIN_PASSWORD) return res.status(403).json({ error: 'Forbidden' });

  const { orderId, userAddress } = req.body;
  const order = orders.find(o => o.id === orderId && o.status === 'pending');
  if (!order || order.type !== 'buy') return res.status(400).json({ error: 'Invalid order' });

  try {
    const contract = await tronWeb.contract().at(USDT_CONTRACT);
    const tx = await contract.transfer(
      userAddress,
      order.amount * 1_000_000
    ).send({ feeLimit: 40_000_000 });

    order.status = 'completed';
    order.txid = tx;
    order.userAddress = userAddress;
    order.completedAt = new Date();

    res.json({ success: true, txid: tx, explorer: `https://tronscan.org/#/transaction/${tx}` });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Transaction failed' });
  }
});