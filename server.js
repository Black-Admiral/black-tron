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

// Home route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});