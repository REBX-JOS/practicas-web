const express = require('express');
const { pool } = require('../db');
const router = express.Router();

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildOrderReceiptXml(order, items) {
  const itemsXml = items
    .map(
      (item) => `    <item>
      <productId>${item.productId}</productId>
      <name>${escapeXml(item.name)}</name>
      <category>${escapeXml(item.category)}</category>
      <quantity>${item.quantity}</quantity>
      <unitPrice>${Number(item.unitPrice).toFixed(2)}</unitPrice>
      <subtotal>${Number(item.subtotal).toFixed(2)}</subtotal>
    </item>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<receipt>
  <meta>
    <orderId>${escapeXml(order.orderId)}</orderId>
    <captureId>${escapeXml(order.captureId || '')}</captureId>
    <status>${escapeXml(order.status || '')}</status>
    <payerEmail>${escapeXml(order.payerEmail || '')}</payerEmail>
    <generatedAt>${new Date().toISOString()}</generatedAt>
  </meta>
  <summary>
    <totalItems>${items.reduce((acc, item) => acc + Number(item.quantity), 0)}</totalItems>
    <total>${Number(order.amount).toFixed(2)}</total>
    <currency>${escapeXml(order.currencyCode || 'MXN')}</currency>
  </summary>
  <items>
${itemsXml}
  </items>
</receipt>`;
}

function readEnv(name) {
  if (process.env[name]) {
    return process.env[name];
  }

  const looseKey = Object.keys(process.env).find((key) => key.trim() === name);
  return looseKey ? process.env[looseKey] : undefined;
}

async function ensurePaypalOrdersTable(connection) {
  await connection.query(
    `CREATE TABLE IF NOT EXISTS paypal_orders (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      cart_id INT UNSIGNED NULL,
      paypal_order_id VARCHAR(64) NOT NULL,
      paypal_capture_id VARCHAR(64) NULL,
      status VARCHAR(32) NOT NULL,
      payer_email VARCHAR(160) NULL,
      amount DECIMAL(10, 2) NOT NULL,
      currency_code VARCHAR(8) NOT NULL DEFAULT 'MXN',
      raw_response JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT uq_paypal_order_id UNIQUE (paypal_order_id),
      CONSTRAINT fk_paypal_orders_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE SET NULL
    )`,
  );
}

async function getAccessToken() {
  const clientId = readEnv('PAYPAL_CLIENT_ID');
  const clientSecret = readEnv('PAYPAL_CLIENT_SECRET');
  const baseUrl = readEnv('PAYPAL_BASE_URL') || 'https://api-m.sandbox.paypal.com';

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials missing in environment');
  }

  const auth = Buffer.from(
    `${clientId}:${clientSecret}`
  ).toString('base64');

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`PayPal auth failed: ${err}`);
  }

  const data = await response.json();
  return data.access_token;
}

// POST /api/paypal/create-order
router.post('/create-order', async (req, res) => {
  try {
    const { cartId, total } = req.body;
    const baseUrl = readEnv('PAYPAL_BASE_URL') || 'https://api-m.sandbox.paypal.com';

    if (total === undefined || total <= 0) {
      return res.status(400).json({ error: 'Total inválido' });
    }

    const accessToken = await getAccessToken();

    const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'MXN',
              value: Number(total).toFixed(2),
            },
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('PayPal create-order error:', data);
      return res.status(response.status).json({ error: data });
    }

    const connection = await pool.getConnection();
    try {
      await ensurePaypalOrdersTable(connection);
      await connection.query(
        `INSERT INTO paypal_orders (cart_id, paypal_order_id, status, amount, currency_code, raw_response)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           cart_id = VALUES(cart_id),
           status = VALUES(status),
           amount = VALUES(amount),
           currency_code = VALUES(currency_code),
           raw_response = VALUES(raw_response)`,
        [
          Number.isInteger(Number(cartId)) ? Number(cartId) : null,
          data.id,
          data.status,
          Number(total),
          'MXN',
          JSON.stringify(data),
        ],
      );
    } finally {
      connection.release();
    }

    return res.json({ id: data.id, status: data.status });
  } catch (error) {
    console.error('Error creating PayPal order:', error);
    return res.status(500).json({ error: 'Error al crear la orden de PayPal' });
  }
});

// POST /api/paypal/capture-order
router.post('/capture-order', async (req, res) => {
  try {
    const { orderId } = req.body;
    const baseUrl = readEnv('PAYPAL_BASE_URL') || 'https://api-m.sandbox.paypal.com';

    if (!orderId) {
      return res.status(400).json({ error: 'orderId requerido' });
    }

    const accessToken = await getAccessToken();

    const response = await fetch(
      `${baseUrl}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('PayPal capture-order error:', data);
      return res.status(response.status).json({ error: data });
    }

    const captureId = data?.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;
    const payerEmail = data?.payer?.email_address ?? null;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await ensurePaypalOrdersTable(connection);

      const [orderRows] = await connection.query(
        'SELECT cart_id FROM paypal_orders WHERE paypal_order_id = ? LIMIT 1',
        [orderId],
      );
      const cartId = orderRows.length ? orderRows[0].cart_id : null;

      await connection.query(
        `INSERT INTO paypal_orders (cart_id, paypal_order_id, paypal_capture_id, status, payer_email, amount, currency_code, raw_response)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           paypal_capture_id = VALUES(paypal_capture_id),
           status = VALUES(status),
           payer_email = VALUES(payer_email),
           raw_response = VALUES(raw_response)`,
        [
          cartId,
          orderId,
          captureId,
          data.status,
          payerEmail,
          Number(data?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ?? 0),
          data?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.currency_code ?? 'MXN',
          JSON.stringify(data),
        ],
      );

      if (cartId) {
        await connection.query(`UPDATE carts SET status = 'checked_out' WHERE id = ?`, [cartId]);
        await connection.query(`INSERT INTO carts (status) VALUES ('active')`);
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return res.json({ status: data.status, details: data });
  } catch (error) {
    console.error('Error capturing PayPal order:', error);
    return res.status(500).json({ error: 'Error al capturar la orden de PayPal' });
  }
});

router.get('/orders/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const connection = await pool.getConnection();
  try {
    await ensurePaypalOrdersTable(connection);
    const [rows] = await connection.query(
      `SELECT paypal_order_id AS orderId, paypal_capture_id AS captureId, status, payer_email AS payerEmail,
              amount, currency_code AS currencyCode, cart_id AS cartId, created_at AS createdAt, updated_at AS updatedAt
       FROM paypal_orders
       WHERE paypal_order_id = ?
       LIMIT 1`,
      [orderId],
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo consultar la orden', details: error.message });
  } finally {
    connection.release();
  }
});

router.get('/orders/:orderId/receipt.xml', async (req, res) => {
  const { orderId } = req.params;
  const connection = await pool.getConnection();
  try {
    await ensurePaypalOrdersTable(connection);

    const [orderRows] = await connection.query(
      `SELECT
        paypal_order_id AS orderId,
        paypal_capture_id AS captureId,
        status,
        payer_email AS payerEmail,
        amount,
        currency_code AS currencyCode,
        cart_id AS cartId
      FROM paypal_orders
      WHERE paypal_order_id = ?
      LIMIT 1`,
      [orderId],
    );

    if (!orderRows.length) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    const order = orderRows[0];

    if (!order.cartId) {
      return res.status(404).json({ error: 'No hay carrito asociado a la orden' });
    }

    const [items] = await connection.query(
      `SELECT
        ci.product_id AS productId,
        p.name,
        p.category,
        ci.quantity,
        ci.unit_price AS unitPrice,
        (ci.quantity * ci.unit_price) AS subtotal
      FROM cart_items ci
      INNER JOIN products p ON p.id = ci.product_id
      WHERE ci.cart_id = ?
      ORDER BY ci.id ASC`,
      [order.cartId],
    );

    const xml = buildOrderReceiptXml(order, items);
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="recibo-${orderId}.xml"`);
    return res.status(200).send(xml);
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo generar el recibo XML de la orden', details: error.message });
  } finally {
    connection.release();
  }
});

module.exports = router;
