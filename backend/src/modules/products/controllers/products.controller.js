const { pool } = require('../../../db');
const { sendError, toNumber } = require('../../../utils/errors');

function mapProductRow(row) {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    imageUrl: row.image_url,
    category: row.category,
    description: row.description,
    inStock: Boolean(row.in_stock),
  };
}

function validateProductPayload(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    errors.push('Body invalido');
    return errors;
  }

  if (typeof body.name !== 'string' || body.name.trim().length < 2) {
    errors.push('name debe ser un string de al menos 2 caracteres');
  }

  if (!Number.isFinite(Number(body.price)) || Number(body.price) < 0) {
    errors.push('price debe ser un numero mayor o igual a 0');
  }

  if (typeof body.imageUrl !== 'string' || body.imageUrl.trim().length < 3) {
    errors.push('imageUrl debe ser un string valido');
  }

  if (typeof body.category !== 'string' || body.category.trim().length < 2) {
    errors.push('category debe ser un string valido');
  }

  if (typeof body.description !== 'string' || body.description.trim().length < 4) {
    errors.push('description debe ser un string valido');
  }

  if (typeof body.inStock !== 'boolean') {
    errors.push('inStock debe ser boolean');
  }

  return errors;
}

exports.getAll = async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, price, image_url, category, description, in_stock
       FROM products
       ORDER BY id ASC`,
    );

    res.json(rows.map(mapProductRow));
  } catch (error) {
    sendError(res, 500, 'No se pudo obtener el catalogo', error.message);
  }
};

exports.getById = async (req, res) => {
  const id = toNumber(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return sendError(res, 400, 'id invalido');
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, name, price, image_url, category, description, in_stock
       FROM products
       WHERE id = ?`,
      [id],
    );

    if (!rows.length) {
      return sendError(res, 404, 'Producto no encontrado');
    }

    return res.json(mapProductRow(rows[0]));
  } catch (error) {
    return sendError(res, 500, 'No se pudo obtener el producto', error.message);
  }
};

exports.create = async (req, res) => {
  const validationErrors = validateProductPayload(req.body);
  if (validationErrors.length) {
    return sendError(res, 400, 'Payload invalido', validationErrors);
  }

  const { name, price, imageUrl, category, description, inStock } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO products (name, price, image_url, category, description, in_stock)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, Number(price), imageUrl, category, description, inStock ? 1 : 0],
    );

    const createdId = result.insertId;
    const [rows] = await pool.query(
      `SELECT id, name, price, image_url, category, description, in_stock
       FROM products
       WHERE id = ?`,
      [createdId],
    );

    return res.status(201).json(mapProductRow(rows[0]));
  } catch (error) {
    return sendError(res, 500, 'No se pudo crear el producto', error.message);
  }
};

exports.update = async (req, res) => {
  const id = toNumber(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return sendError(res, 400, 'id invalido');
  }

  const validationErrors = validateProductPayload(req.body);
  if (validationErrors.length) {
    return sendError(res, 400, 'Payload invalido', validationErrors);
  }

  const { name, price, imageUrl, category, description, inStock } = req.body;

  try {
    await pool.query(
      `UPDATE products
       SET name = ?, price = ?, image_url = ?, category = ?, description = ?, in_stock = ?
       WHERE id = ?`,
      [name, Number(price), imageUrl, category, description, inStock ? 1 : 0, id],
    );

    const [rows] = await pool.query(
      `SELECT id, name, price, image_url, category, description, in_stock
       FROM products
       WHERE id = ?`,
      [id],
    );

    if (!rows.length) {
      return sendError(res, 404, 'Producto no encontrado');
    }

    return res.json(mapProductRow(rows[0]));
  } catch (error) {
    return sendError(res, 500, 'No se pudo actualizar el producto', error.message);
  }
};

exports.delete = async (req, res) => {
  const id = toNumber(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return sendError(res, 400, 'id invalido');
  }

  try {
    const result = await pool.query(
      `DELETE FROM products WHERE id = ?`,
      [id],
    );

    if (result[0].affectedRows === 0) {
      return sendError(res, 404, 'Producto no encontrado');
    }

    return res.status(204).send();
  } catch (error) {
    return sendError(res, 500, 'No se pudo eliminar el producto', error.message);
  }
};
