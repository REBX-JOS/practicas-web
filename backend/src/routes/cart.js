const express = require('express');
const { pool } = require('../db');
const { sendError, toNumber } = require('../utils/errors');

const router = express.Router();

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildReceiptXml(snapshot) {
  const generatedAt = new Date().toISOString();
  const itemsXml = snapshot.items
    .map(
      (item) => `    <item>
      <productId>${item.productId}</productId>
      <name>${escapeXml(item.name)}</name>
      <category>${escapeXml(item.category)}</category>
      <quantity>${item.quantity}</quantity>
      <unitPrice>${item.unitPrice.toFixed(2)}</unitPrice>
      <subtotal>${item.subtotal.toFixed(2)}</subtotal>
    </item>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<receipt>
  <meta>
    <cartId>${snapshot.id}</cartId>
    <generatedAt>${generatedAt}</generatedAt>
  </meta>
  <summary>
    <totalItems>${snapshot.totalItems}</totalItems>
    <total>${snapshot.total.toFixed(2)}</total>
  </summary>
  <items>
${itemsXml}
  </items>
</receipt>`;
}

async function getActiveCartId(connection) {
  const [rows] = await connection.query(
    `SELECT id FROM carts WHERE status = 'active' ORDER BY id ASC LIMIT 1`,
  );

  if (rows.length) {
    return rows[0].id;
  }

  const [insertResult] = await connection.query(
    `INSERT INTO carts (status) VALUES ('active')`,
  );

  return insertResult.insertId;
}

async function getCartSnapshot(connection, cartId) {
  const [items] = await connection.query(
    `SELECT
       ci.product_id AS productId,
       p.name,
       p.image_url AS imageUrl,
       p.category,
       ci.quantity,
       ci.unit_price AS unitPrice,
       (ci.quantity * ci.unit_price) AS subtotal
     FROM cart_items ci
     INNER JOIN products p ON p.id = ci.product_id
     WHERE ci.cart_id = ?
     ORDER BY ci.id ASC`,
    [cartId],
  );

  const normalizedItems = items.map((item) => ({
    productId: item.productId,
    name: item.name,
    imageUrl: item.imageUrl,
    category: item.category,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    subtotal: Number(item.subtotal),
  }));

  const total = normalizedItems.reduce((acc, item) => acc + item.subtotal, 0);
  const totalItems = normalizedItems.reduce((acc, item) => acc + item.quantity, 0);

  return {
    id: cartId,
    totalItems,
    total,
    items: normalizedItems,
  };
}

router.get('/', async (_req, res) => {
  const connection = await pool.getConnection();
  try {
    const cartId = await getActiveCartId(connection);
    const snapshot = await getCartSnapshot(connection, cartId);
    return res.json(snapshot);
  } catch (error) {
    return sendError(res, 500, 'No se pudo obtener el carrito', error.message);
  } finally {
    connection.release();
  }
});

router.get('/receipt.xml', async (_req, res) => {
  const connection = await pool.getConnection();
  try {
    const cartId = await getActiveCartId(connection);
    const snapshot = await getCartSnapshot(connection, cartId);
    const xml = buildReceiptXml(snapshot);

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="recibo-carrito.xml"');
    return res.status(200).send(xml);
  } catch (error) {
    return sendError(res, 500, 'No se pudo generar el recibo XML', error.message);
  } finally {
    connection.release();
  }
});

router.post('/items', async (req, res) => {
  const productId = toNumber(req.body?.productId);
  const quantityRaw = req.body?.quantity ?? 1;
  const quantity = toNumber(quantityRaw);

  if (!Number.isInteger(productId) || productId <= 0) {
    return sendError(res, 400, 'productId invalido');
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return sendError(res, 400, 'quantity debe ser entero mayor a 0');
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [productRows] = await connection.query(
      'SELECT id, price, in_stock FROM products WHERE id = ?',
      [productId],
    );

    if (!productRows.length) {
      await connection.rollback();
      return sendError(res, 404, 'Producto no encontrado');
    }

    if (!productRows[0].in_stock) {
      await connection.rollback();
      return sendError(res, 409, 'Producto sin stock');
    }

    const cartId = await getActiveCartId(connection);
    const unitPrice = Number(productRows[0].price);

    const [existingItemRows] = await connection.query(
      `SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?`,
      [cartId, productId],
    );

    if (existingItemRows.length) {
      await connection.query(
        `UPDATE cart_items
         SET quantity = quantity + ?, unit_price = ?
         WHERE cart_id = ? AND product_id = ?`,
        [quantity, unitPrice, cartId, productId],
      );
    } else {
      await connection.query(
        `INSERT INTO cart_items (cart_id, product_id, quantity, unit_price)
         VALUES (?, ?, ?, ?)`,
        [cartId, productId, quantity, unitPrice],
      );
    }

    await connection.commit();

    const snapshot = await getCartSnapshot(connection, cartId);
    return res.status(201).json(snapshot);
  } catch (error) {
    await connection.rollback();
    return sendError(res, 500, 'No se pudo agregar al carrito', error.message);
  } finally {
    connection.release();
  }
});

router.patch('/items/:productId', async (req, res) => {
  const productId = toNumber(req.params.productId);
  const quantity = toNumber(req.body?.quantity);

  if (!Number.isInteger(productId) || productId <= 0) {
    return sendError(res, 400, 'productId invalido');
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return sendError(res, 400, 'quantity debe ser entero mayor a 0');
  }

  const connection = await pool.getConnection();
  try {
    const cartId = await getActiveCartId(connection);

    const [result] = await connection.query(
      `UPDATE cart_items
       SET quantity = ?
       WHERE cart_id = ? AND product_id = ?`,
      [quantity, cartId, productId],
    );

    if (!result.affectedRows) {
      return sendError(res, 404, 'Item no encontrado en carrito');
    }

    const snapshot = await getCartSnapshot(connection, cartId);
    return res.json(snapshot);
  } catch (error) {
    return sendError(res, 500, 'No se pudo actualizar cantidad', error.message);
  } finally {
    connection.release();
  }
});

router.delete('/items/:productId', async (req, res) => {
  const productId = toNumber(req.params.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    return sendError(res, 400, 'productId invalido');
  }

  const connection = await pool.getConnection();
  try {
    const cartId = await getActiveCartId(connection);
    const [result] = await connection.query(
      `DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?`,
      [cartId, productId],
    );

    if (!result.affectedRows) {
      return sendError(res, 404, 'Item no encontrado en carrito');
    }

    const snapshot = await getCartSnapshot(connection, cartId);
    return res.json(snapshot);
  } catch (error) {
    return sendError(res, 500, 'No se pudo eliminar item del carrito', error.message);
  } finally {
    connection.release();
  }
});

router.delete('/items', async (_req, res) => {
  const connection = await pool.getConnection();
  try {
    const cartId = await getActiveCartId(connection);
    await connection.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
    const snapshot = await getCartSnapshot(connection, cartId);
    return res.json(snapshot);
  } catch (error) {
    return sendError(res, 500, 'No se pudo vaciar el carrito', error.message);
  } finally {
    connection.release();
  }
});

module.exports = router;
