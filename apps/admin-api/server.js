const express = require('express');
const { Client } = require('pg');

const app = express();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

client.connect();

app.get('/', (req, res) => {
  res.send('Hello from Node.js in Docker!');
});

app.get('/db-test', async (req, res) => {
  try {
    const result = await client.query('SELECT NOW()');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
