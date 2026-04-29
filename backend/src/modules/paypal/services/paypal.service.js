const { PAYPAL_CONFIG } = require('../config/paypal.config');

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

async function getAccessToken() {
  const auth = Buffer.from(
    `${PAYPAL_CONFIG.clientId}:${PAYPAL_CONFIG.clientSecret}`
  ).toString('base64');

  const response = await fetch(`${PAYPAL_CONFIG.baseUrl}/v1/oauth2/token`, {
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

async function createPaypalOrder(total) {
  const accessToken = await getAccessToken();

  const response = await fetch(`${PAYPAL_CONFIG.baseUrl}/v2/checkout/orders`, {
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
    throw new Error(`PayPal create order failed: ${JSON.stringify(data)}`);
  }

  return data;
}

async function capturePaypalOrder(orderId) {
  const accessToken = await getAccessToken();

  const response = await fetch(
    `${PAYPAL_CONFIG.baseUrl}/v2/checkout/orders/${orderId}/capture`,
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
    throw new Error(`PayPal capture order failed: ${JSON.stringify(data)}`);
  }

  return data;
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

module.exports = {
  escapeXml,
  buildOrderReceiptXml,
  getAccessToken,
  createPaypalOrder,
  capturePaypalOrder,
  ensurePaypalOrdersTable,
};
