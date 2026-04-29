require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { pingDb } = require('./db');
const productsRouter = require('./modules/products');
const cartRouter = require('./modules/cart');
const paypalRouter = require('./modules/paypal');

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
app.use('/api/paypal', paypalRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
