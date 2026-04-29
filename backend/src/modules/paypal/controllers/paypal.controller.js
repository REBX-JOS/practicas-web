const { pool } = require('../../../db');
const {
  buildOrderReceiptXml,
  createPaypalOrder,
  capturePaypalOrder,
  ensurePaypalOrdersTable,
} = require('../services/paypal.service');

exports.createOrder = async (req, res) => {
  try {
    const { cartId, total } = req.body;

    if (total === undefined || total <= 0) {
      return res.status(400).json({ error: 'Total inválido' });
    }

    const data = await createPaypalOrder(total);

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
};

exports.captureOrder = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'orderId requerido' });
    }

    const data = await capturePaypalOrder(orderId);

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
};

exports.getOrder = async (req, res) => {
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
};

exports.getOrderReceiptXml = async (req, res) => {
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
};
