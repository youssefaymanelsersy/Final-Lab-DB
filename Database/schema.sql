CREATE DATABASE IF NOT EXISTS bookstore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bookstore;

-- =============== CLEAN ===============
SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS carts;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS publisher_orders;
DROP TABLE IF EXISTS book_authors;
DROP TABLE IF EXISTS authors;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS publishers;
SET FOREIGN_KEY_CHECKS=1;

-- =============== PUBLISHERS ===============
CREATE TABLE publishers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  address VARCHAR(255) NOT NULL,
  phone VARCHAR(40) NOT NULL
);

-- =============== BOOKS ===============
CREATE TABLE books (
  isbn CHAR(13) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  publisher_id INT NOT NULL,
  publication_year INT NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  category ENUM('Science','Art','Religion','History','Geography') NOT NULL,
  stock_qty INT NOT NULL DEFAULT 0,
  threshold INT NOT NULL DEFAULT 0,
  cover_url TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_books_publisher FOREIGN KEY (publisher_id)
    REFERENCES publishers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_stock_nonneg CHECK (stock_qty >= 0),
  CONSTRAINT chk_threshold_nonneg CHECK (threshold >= 0)
);

-- =============== AUTHORS (multi-authors) ===============
CREATE TABLE authors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL UNIQUE
);

CREATE TABLE book_authors (
  isbn CHAR(13) NOT NULL,
  author_id INT NOT NULL,
  PRIMARY KEY (isbn, author_id),
  FOREIGN KEY (isbn) REFERENCES books(isbn) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE RESTRICT
);

-- =============== PUBLISHER ORDERS (replenishment orders) ===============
CREATE TABLE publisher_orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  isbn CHAR(13) NOT NULL,
  publisher_id INT NOT NULL,
  order_qty INT NOT NULL,
  status ENUM('Pending','Confirmed') NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP NULL,
  FOREIGN KEY (isbn) REFERENCES books(isbn) ON DELETE RESTRICT,
  FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE RESTRICT
);

-- =============== CUSTOMERS ===============
CREATE TABLE customers (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(40) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  phone VARCHAR(40) NOT NULL,
  shipping_address VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============== CARTS ===============
CREATE TABLE carts (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE cart_items (
  cart_id BIGINT NOT NULL,
  isbn CHAR(13) NOT NULL,
  qty INT NOT NULL,
  PRIMARY KEY(cart_id, isbn),
  FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  FOREIGN KEY (isbn) REFERENCES books(isbn) ON DELETE RESTRICT,
  CONSTRAINT chk_cart_qty CHECK (qty > 0)
);

-- =============== ORDERS (customer purchases) ===============
CREATE TABLE orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  customer_id BIGINT NOT NULL,
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_price DECIMAL(10,2) NOT NULL,
  card_last4 CHAR(4) NOT NULL,
  card_expiry CHAR(5) NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

CREATE TABLE order_items (
  order_id BIGINT NOT NULL,
  isbn CHAR(13) NOT NULL,
  book_title VARCHAR(255) NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  qty INT NOT NULL,
  PRIMARY KEY(order_id, isbn),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (isbn) REFERENCES books(isbn) ON DELETE RESTRICT
);

-- simple sales table (for reporting)
CREATE TABLE sales (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  isbn CHAR(13) NOT NULL,
  qty INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (isbn) REFERENCES books(isbn) ON DELETE RESTRICT
);

-- ============================================================
-- TRIGGER 1: prevent negative stock (before update on books)
-- ============================================================
DELIMITER //
CREATE TRIGGER trg_books_no_negative_stock
BEFORE UPDATE ON books
FOR EACH ROW
BEGIN
  IF NEW.stock_qty < 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Stock quantity cannot be negative';
  END IF;
END//
DELIMITER ;

-- ============================================================
-- TRIGGER 2: auto-create replenishment order when stock crosses threshold
-- (from above threshold to below threshold) after update on books
-- fixed order qty = 10 (change if you want)
-- ============================================================
DELIMITER //
CREATE TRIGGER trg_auto_replenish_order
AFTER UPDATE ON books
FOR EACH ROW
BEGIN
  IF (OLD.stock_qty > OLD.threshold) AND (NEW.stock_qty < NEW.threshold) THEN
    INSERT INTO publisher_orders (isbn, publisher_id, order_qty, status)
    VALUES (NEW.isbn, NEW.publisher_id, 10, 'Pending');
  END IF;
END//
DELIMITER ;

-- ============================================================
-- SEED DATA: publishers
-- ============================================================
INSERT INTO publishers (name, address, phone) VALUES
('Bantam Books', 'New York, USA', '+1-212-000-0000'),
('Phaidon Press', 'London, UK', '+44-20-0000-0000'),
('HarperCollins', 'New York, USA', '+1-212-111-1111'),
('Oxford University Press', 'Oxford, UK', '+44-1865-000000'),
('Penguin Books', 'London, UK', '+44-20-2222-2222');

-- SEED DATA: authors
INSERT INTO authors (full_name) VALUES
('Stephen Hawking'),
('E. H. Gombrich'),
('Yuval Noah Harari'),
('Karen Armstrong'),
('Tim Marshall');

-- ============================================================
-- SEED DATA: books (REAL ISBNs + REAL cover URLs via Open Library Covers API)
-- Covers API format documented by Open Library. :contentReference[oaicite:6]{index=6}
-- ============================================================
INSERT INTO books (isbn, title, publisher_id, publication_year, selling_price, category, stock_qty, threshold, cover_url) VALUES
('9780553380163', 'A Brief History of Time', 1, 1998, 220.00, 'Science', 25, 8,
  'https://covers.openlibrary.org/b/isbn/9780553380163-L.jpg'),
('9780714832470', 'The Story of Art', 2, 1995, 250.00, 'Art', 12, 5,
  'https://covers.openlibrary.org/b/isbn/9780714832470-L.jpg'),
('9780062316097', 'Sapiens: A Brief History of Humankind', 3, 2015, 210.00, 'History', 9, 6,
  'https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg'),
('9780192802385', 'A History of God', 4, 1994, 190.00, 'Religion', 20, 7,
  'https://covers.openlibrary.org/b/isbn/9780192802385-L.jpg'),
('9781783962433', 'Prisoners of Geography', 5, 2016, 200.00, 'Geography', 10, 6,
  'https://covers.openlibrary.org/b/isbn/9781783962433-L.jpg');

-- link authors
INSERT INTO book_authors (isbn, author_id)
SELECT '9780553380163', id FROM authors WHERE full_name='Stephen Hawking';
INSERT INTO book_authors (isbn, author_id)
SELECT '9780714832470', id FROM authors WHERE full_name='E. H. Gombrich';
INSERT INTO book_authors (isbn, author_id)
SELECT '9780062316097', id FROM authors WHERE full_name='Yuval Noah Harari';
INSERT INTO book_authors (isbn, author_id)
SELECT '9780192802385', id FROM authors WHERE full_name='Karen Armstrong';
INSERT INTO book_authors (isbn, author_id)
SELECT '9781783962433', id FROM authors WHERE full_name='Tim Marshall';

-- sample customer + cart
INSERT INTO customers (username, password_hash, first_name, last_name, email, phone, shipping_address)
VALUES ('ahmed', 'TEST_HASH', 'Ahmed', 'Sameh', 'ahmed@example.com', '+20-01000000000', 'Alexandria, Egypt');

INSERT INTO carts (customer_id)
SELECT id FROM customers WHERE username='ahmed';
