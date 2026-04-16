require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { pingDb } = require('./db');
const productsRouter = require('./routes/products');
const cartRouter = require('./routes/cart');

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  }),
);
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    await pingDb();
    return res.json({ status: 'ok' });
  } catch (error) {
    return res.status(503).json({
      status: 'error',
      details: error.message,
    });
  }
});

app.use('/api/products', productsRouter);
app.use('/api/cart', cartRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
