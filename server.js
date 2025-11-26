require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Home page (Sign up)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Temporary placeholder API (won’t crash)
app.get('/api/rate', (req, res) => {
  res.json({ rate: 137.50 });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`OKLEIN – Simply Crypto`);
  console.log(`Live at https://black-tron.onrender.com`);
  console.log(`Sign-up page: /`);
  console.log(`Login page: /login`);
});