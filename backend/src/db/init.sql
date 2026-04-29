CREATE DATABASE IF NOT EXISTS practicas_db;
USE practicas_db;

CREATE TABLE IF NOT EXISTS products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  category VARCHAR(80) NOT NULL,
  description TEXT NOT NULL,
  in_stock TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_products_price_non_negative CHECK (price >= 0)
);

CREATE TABLE IF NOT EXISTS carts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  status ENUM('active', 'checked_out') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cart_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cart_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  CONSTRAINT uq_cart_product UNIQUE (cart_id, product_id),
  CONSTRAINT chk_cart_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT chk_cart_items_price_non_negative CHECK (unit_price >= 0)
);

CREATE TABLE IF NOT EXISTS paypal_orders (
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
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_paypal_orders_status ON paypal_orders(status);

INSERT INTO products (name, price, image_url, category, description, in_stock)
SELECT 'Audifonos Bluetooth', 599.00, 'assets/images/audifonos_bluetooth.jpg', 'Audio', 'Audifonos inalambricos con cancelacion de ruido activa', 1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Audifonos Bluetooth');

INSERT INTO products (name, price, image_url, category, description, in_stock)
SELECT 'Teclado Mecanico RGB', 1299.00, 'assets/images/teclado_mecanico.jpg', 'Perifericos', 'Teclado mecanico gaming con iluminacion RGB personalizable', 1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Teclado Mecanico RGB');

INSERT INTO products (name, price, image_url, category, description, in_stock)
SELECT 'Mouse Gaming', 799.00, 'assets/images/mouse_gaming.jpg', 'Perifericos', 'Mouse optico de alta precision con 16000 DPI', 1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Mouse Gaming');

INSERT INTO products (name, price, image_url, category, description, in_stock)
SELECT 'Camara 4K', 2499.00, 'assets/images/camera_4k.jpg', 'Video', 'Camara web profesional con resolucion 4K y microfono', 1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Camara 4K');

INSERT INTO products (name, price, image_url, category, description, in_stock)
SELECT 'Monitor 27 144Hz', 4999.00, 'assets/images/monitor_27_inch_144_hz.jpg', 'Monitores', 'Monitor gaming de 27 pulgadas con tasa de refresco de 144Hz', 1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Monitor 27 144Hz');

INSERT INTO products (name, price, image_url, category, description, in_stock)
SELECT 'Microfono USB', 1899.00, 'assets/images/microfono_usb.jpg', 'Audio', 'Microfono de condensador USB para streaming y podcasts', 1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Microfono USB');

INSERT INTO products (name, price, image_url, category, description, in_stock)
SELECT 'Gabinete ASUS', 3199.00, 'assets/images/gabinete_asus.jpg', 'Componentes', 'Gabinete gaming con iluminacion RGB y ventilacion optimizada', 1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Gabinete ASUS');

INSERT INTO products (name, price, image_url, category, description, in_stock)
SELECT 'Silla Gamer', 5999.00, 'assets/images/silla_gamer.jpg', 'Mobiliario', 'Silla ergonomica con soporte lumbar y reposabrazos ajustables', 1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Silla Gamer');

INSERT INTO products (name, price, image_url, category, description, in_stock)
SELECT 'Control PlayStation', 1499.00, 'assets/images/control_playstation.jpg', 'Gaming', 'Control inalambrico compatible con PC y consola PlayStation', 0
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Control PlayStation');

INSERT INTO products (name, price, image_url, category, description, in_stock)
SELECT 'Bocina JBL', 2199.00, 'assets/images/bocina_jbl.jpg', 'Audio', 'Bocina Bluetooth portatil con sonido envolvente y resistente al agua', 1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Bocina JBL');

INSERT INTO products (name, price, image_url, category, description, in_stock)
SELECT 'Mouse Oficina', 399.00, 'assets/images/mouse_oficina.jpg', 'Perifericos', 'Mouse ergonomico inalambrico ideal para trabajo de oficina', 1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Mouse Oficina');

INSERT INTO products (name, price, image_url, category, description, in_stock)
SELECT 'Teclado Membrana', 499.00, 'assets/images/teclado_membrana.jpg', 'Perifericos', 'Teclado silencioso con diseno compacto y teclas de membrana', 1
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Teclado Membrana');

INSERT INTO carts (status)
SELECT 'active'
WHERE NOT EXISTS (SELECT 1 FROM carts WHERE status = 'active');
