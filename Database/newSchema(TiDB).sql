-- TiDB schema for bookstore (cleaned and consistent)
-- Creates and uses `bookstore` DB; defines tables with valid FKs; seeds minimal data

CREATE DATABASE IF NOT EXISTS bookstore /*+ SET_VAR(character_set_client=utf8mb4) */;
USE bookstore;

-- =====================
-- PUBLISHERS
-- =====================
CREATE TABLE IF NOT EXISTS publishers (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    address VARCHAR(255) NOT NULL,
    phone VARCHAR(40) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_publishers_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- =====================
-- BOOKS
-- =====================
CREATE TABLE IF NOT EXISTS books (
    isbn CHAR(13) NOT NULL,
    title VARCHAR(255) NOT NULL,
    publisher_id INT NOT NULL,
    publication_year INT NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL,
    category ENUM('Science','Art','Religion','History','Geography') NOT NULL,
    stock_qty INT NOT NULL DEFAULT 0,
    threshold INT NOT NULL DEFAULT 0,
    cover_url TEXT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (isbn),
    KEY fk_books_publisher (publisher_id),
    CONSTRAINT fk_books_publisher FOREIGN KEY (publisher_id) REFERENCES publishers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- =====================
-- AUTHORS + BOOK_AUTHORS
-- =====================
CREATE TABLE IF NOT EXISTS authors (
    id INT NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(120) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_authors_full_name (full_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS book_authors (
    isbn CHAR(13) NOT NULL,
    author_id INT NOT NULL,
    PRIMARY KEY (isbn, author_id),
    KEY fk_book_authors_author (author_id),
    CONSTRAINT fk_book_authors_book FOREIGN KEY (isbn) REFERENCES books(isbn) ON DELETE CASCADE,
    CONSTRAINT fk_book_authors_author FOREIGN KEY (author_id) REFERENCES authors(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- =====================
-- CUSTOMERS
-- =====================
CREATE TABLE IF NOT EXISTS customers (
    id BIGINT NOT NULL AUTO_INCREMENT,
    username VARCHAR(40) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    email VARCHAR(120) NOT NULL,
    phone VARCHAR(40) NOT NULL,
    shipping_address VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_customers_username (username),
    UNIQUE KEY uq_customers_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- =====================
-- CARTS + CART_ITEMS
-- =====================
CREATE TABLE IF NOT EXISTS carts (
    id BIGINT NOT NULL AUTO_INCREMENT,
    customer_id BIGINT NOT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_carts_customer (customer_id),
    CONSTRAINT fk_carts_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS cart_items (
    cart_id BIGINT NOT NULL,
    isbn CHAR(13) NOT NULL,
    qty INT NOT NULL,
    PRIMARY KEY (cart_id, isbn),
    KEY fk_cart_items_isbn (isbn),
    CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_book FOREIGN KEY (isbn) REFERENCES books(isbn)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- =====================
-- ORDERS + ORDER_ITEMS
-- =====================
CREATE TABLE IF NOT EXISTS orders (
    id BIGINT NOT NULL AUTO_INCREMENT,
    customer_id BIGINT NOT NULL,
    order_date TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    total_price DECIMAL(10,2) NOT NULL,
    card_last4 CHAR(4) NOT NULL,
    card_expiry CHAR(5) NOT NULL,
    PRIMARY KEY (id),
    KEY fk_orders_customer (customer_id),
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS order_items (
    order_id BIGINT NOT NULL,
    isbn CHAR(13) NOT NULL,
    book_title VARCHAR(255) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    qty INT NOT NULL,
    PRIMARY KEY (order_id, isbn),
    KEY fk_order_items_isbn (isbn),
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_book FOREIGN KEY (isbn) REFERENCES books(isbn)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- =====================
-- PUBLISHER_ORDERS
-- =====================
CREATE TABLE IF NOT EXISTS publisher_orders (
    id BIGINT NOT NULL AUTO_INCREMENT,
    isbn CHAR(13) NOT NULL,
    publisher_id INT NOT NULL,
    order_qty INT NOT NULL,
    status ENUM('Pending','Confirmed') NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (id),
    KEY fk_publisher_orders_isbn (isbn),
    KEY fk_publisher_orders_publisher (publisher_id),
    CONSTRAINT fk_publisher_orders_book FOREIGN KEY (isbn) REFERENCES books(isbn),
    CONSTRAINT fk_publisher_orders_publisher FOREIGN KEY (publisher_id) REFERENCES publishers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- =====================
-- SALES (for reporting)
-- =====================
CREATE TABLE IF NOT EXISTS sales (
    id BIGINT NOT NULL AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    isbn CHAR(13) NOT NULL,
    qty INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    sale_date TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY fk_sales_order (order_id),
    KEY fk_sales_isbn (isbn),
    CONSTRAINT fk_sales_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_sales_book FOREIGN KEY (isbn) REFERENCES books(isbn)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

-- =====================
-- SEED DATA (minimal, valid)
-- =====================

-- Publishers
INSERT INTO publishers (name, address, phone) VALUES
('Bantam Books','New York, USA','+1-212-000-0000'),
('Phaidon Press','London, UK','+44-20-0000-0000'),
('HarperCollins','New York, USA','+1-212-111-1111'),
('Oxford University Press','Oxford, UK','+44-1865-000000'),
('Penguin Books','London, UK','+44-20-2222-2222')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Books
INSERT INTO books (isbn, title, publisher_id, publication_year, selling_price, category, stock_qty, threshold, cover_url) VALUES
('9780553380163','A Brief History of Time',1,1998,220.00,'Science',25,8,'https://covers.openlibrary.org/b/isbn/9780553380163-L.jpg'),
('9780714832470','The Story of Art',2,1995,250.00,'Art',12,5,'https://covers.openlibrary.org/b/isbn/9780714832470-L.jpg'),
('9780062316097','Sapiens: A Brief History of Humankind',3,2015,210.00,'History',9,6,'https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg'),
('9780192802385','A History of God',4,1994,190.00,'Religion',20,7,'https://covers.openlibrary.org/b/isbn/9780192802385-L.jpg'),
('9781783962433','Prisoners of Geography',5,2016,200.00,'Geography',10,6,'https://covers.openlibrary.org/b/isbn/9781783962433-L.jpg')
ON DUPLICATE KEY UPDATE title=VALUES(title), selling_price=VALUES(selling_price);

-- Authors
INSERT INTO authors (full_name) VALUES
('Stephen Hawking'),
('E. H. Gombrich'),
('Yuval Noah Harari'),
('Karen Armstrong'),
('Tim Marshall')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

-- Link authors to books
INSERT INTO book_authors (isbn, author_id)
SELECT '9780553380163', id FROM authors WHERE full_name='Stephen Hawking'
ON DUPLICATE KEY UPDATE author_id=author_id;
INSERT INTO book_authors (isbn, author_id)
SELECT '9780714832470', id FROM authors WHERE full_name='E. H. Gombrich'
ON DUPLICATE KEY UPDATE author_id=author_id;
INSERT INTO book_authors (isbn, author_id)
SELECT '9780062316097', id FROM authors WHERE full_name='Yuval Noah Harari'
ON DUPLICATE KEY UPDATE author_id=author_id;
INSERT INTO book_authors (isbn, author_id)
SELECT '9780192802385', id FROM authors WHERE full_name='Karen Armstrong'
ON DUPLICATE KEY UPDATE author_id=author_id;
INSERT INTO book_authors (isbn, author_id)
SELECT '9781783962433', id FROM authors WHERE full_name='Tim Marshall'
ON DUPLICATE KEY UPDATE author_id=author_id;

-- Customers (example accounts)
INSERT INTO customers (username, password_hash, first_name, last_name, email, phone, shipping_address) VALUES
('youssef99','$2y$dummyhash1','Youssef','Ayman','youssef@example.com','+20-100-000-0001','Cairo, Egypt'),
('sara88','$2y$dummyhash2','Sara','Hassan','sara@example.com','+20-100-000-0002','Alexandria, Egypt')
ON DUPLICATE KEY UPDATE email=VALUES(email);

-- Carts for sample customers
INSERT INTO carts (customer_id)
SELECT id FROM customers WHERE username='youssef99'
ON DUPLICATE KEY UPDATE customer_id=customer_id;
INSERT INTO carts (customer_id)
SELECT id FROM customers WHERE username='sara88'
ON DUPLICATE KEY UPDATE customer_id=customer_id;

-- =====================
-- Seed a couple of November 2025 orders for admin reports
-- =====================
-- Order for youssef99 on 2025-11-10
INSERT INTO orders (customer_id, order_date, total_price, card_last4, card_expiry)
SELECT id, '2025-11-10 12:00:00', 680.00, '1234', '12/27' FROM customers WHERE username='youssef99'
ON DUPLICATE KEY UPDATE total_price=VALUES(total_price);

-- Find order id
SET @oid1 := (SELECT o.id FROM orders o JOIN customers c ON c.id=o.customer_id WHERE c.username='youssef99' AND o.order_date='2025-11-10 12:00:00' LIMIT 1);
INSERT INTO order_items (order_id, isbn, book_title, unit_price, qty) VALUES
(@oid1,'9780062316097','Sapiens: A Brief History of Humankind',210.00,2),
(@oid1,'9780141036137','The Art Book',260.00,1)
ON DUPLICATE KEY UPDATE qty=VALUES(qty);
INSERT INTO sales (order_id, isbn, qty, amount, sale_date) VALUES
(@oid1,'9780062316097',2,420.00,'2025-11-10 12:05:00'),
(@oid1,'9780141036137',1,260.00,'2025-11-10 12:05:00');

-- Order for sara88 on 2025-11-20
INSERT INTO orders (customer_id, order_date, total_price, card_last4, card_expiry)
SELECT id, '2025-11-20 16:30:00', 450.00, '5678', '08/26' FROM customers WHERE username='sara88'
ON DUPLICATE KEY UPDATE total_price=VALUES(total_price);
SET @oid2 := (SELECT o.id FROM orders o JOIN customers c ON c.id=o.customer_id WHERE c.username='sara88' AND o.order_date='2025-11-20 16:30:00' LIMIT 1);
INSERT INTO order_items (order_id, isbn, book_title, unit_price, qty) VALUES
(@oid2,'9780140449334','Meditations',150.00,3)
ON DUPLICATE KEY UPDATE qty=VALUES(qty);
INSERT INTO sales (order_id, isbn, qty, amount, sale_date) VALUES
(@oid2,'9780140449334',3,450.00,'2025-11-20 16:35:00');

/*!40014 SET FOREIGN_KEY_CHECKS=0*/
;
/*!40101 SET NAMES binary*/
;
CREATE DATABASE `test`
/*!40100 DEFAULT CHARACTER SET utf8mb4 */
;
/*!40014 SET FOREIGN_KEY_CHECKS=0*/
;
/*!40101 SET NAMES binary*/
;
CREATE TABLE `authors` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `full_name` varchar(120) NOT NULL,
    PRIMARY KEY (`id`)
    /*T![clustered_index] CLUSTERED */
,
    UNIQUE KEY `full_name` (`full_name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_bin AUTO_INCREMENT = 30002;
/*!40014 SET FOREIGN_KEY_CHECKS=0*/
;
/*!40101 SET NAMES binary*/
;
CREATE TABLE `book_authors` (
    `isbn` char(13) NOT NULL,
    `author_id` int(11) NOT NULL,
    PRIMARY KEY (`isbn`, `author_id`)
    /*T![clustered_index] CLUSTERED */
,
    KEY `fk_2` (`author_id`),
    CONSTRAINT `fk_1` FOREIGN KEY (`isbn`) REFERENCES `bookstore`.`books` (`isbn`) ON DELETE CASCADE,
    CONSTRAINT `fk_2` FOREIGN KEY (`author_id`) REFERENCES `bookstore`.`authors` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_bin;
/*!40014 SET FOREIGN_KEY_CHECKS=0*/
;
/*!40101 SET NAMES binary*/
;
CREATE TABLE `books` (
    `isbn` char(13) NOT NULL,
    `title` varchar(255) NOT NULL,
    `publisher_id` int(11) NOT NULL,
    `publication_year` int(11) NOT NULL,
    `selling_price` decimal(10, 2) NOT NULL,
    `category` enum('Science', 'Art', 'Religion', 'History', 'Geography') NOT NULL,
    `stock_qty` int(11) NOT NULL DEFAULT '0',
    `threshold` int(11) NOT NULL DEFAULT '0',
    `cover_url` text DEFAULT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`isbn`)
    /*T![clustered_index] CLUSTERED */
,
    KEY `fk_books_publisher` (`publisher_id`),
    CONSTRAINT `fk_books_publisher` FOREIGN KEY (`publisher_id`) REFERENCES `bookstore`.`publishers` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_bin;
/*!40014 SET FOREIGN_KEY_CHECKS=0*/
;
/*!40101 SET NAMES binary*/
;
CREATE TABLE `cart_items` (
    `cart_id` bigint(20) NOT NULL,
    `isbn` char(13) NOT NULL,
    `qty` int(11) NOT NULL,
    PRIMARY KEY (`cart_id`, `isbn`)
    /*T![clustered_index] CLUSTERED */
,
    KEY `fk_2` (`isbn`),
    CONSTRAINT `fk_1` FOREIGN KEY (`cart_id`) REFERENCES `bookstore`.`carts` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_2` FOREIGN KEY (`isbn`) REFERENCES `bookstore`.`books` (`isbn`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_bin;
/*!40014 SET FOREIGN_KEY_CHECKS=0*/
;
/*!40101 SET NAMES binary*/
;
CREATE TABLE `carts` (
    `id` bigint(20) NOT NULL AUTO_INCREMENT,
    `customer_id` bigint(20) NOT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
    /*T![clustered_index] CLUSTERED */
,
    UNIQUE KEY `customer_id` (`customer_id`),
    CONSTRAINT `fk_1` FOREIGN KEY (`customer_id`) REFERENCES `bookstore`.`customers` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_bin AUTO_INCREMENT = 210001;
/*!40014 SET FOREIGN_KEY_CHECKS=0*/
;
/*!40101 SET NAMES binary*/
;
CREATE TABLE `customers` (
    `id` bigint(20) NOT NULL AUTO_INCREMENT,
    `username` varchar(40) NOT NULL,
    `password_hash` varchar(255) NOT NULL,
    `first_name` varchar(80) NOT NULL,
    `last_name` varchar(80) NOT NULL,
    `email` varchar(120) NOT NULL,
    `phone` varchar(40) NOT NULL,
    `shipping_address` varchar(255) NOT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
    /*T![clustered_index] CLUSTERED */
,
    UNIQUE KEY `username` (`username`),
    UNIQUE KEY `email` (`email`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_bin AUTO_INCREMENT = 180001;
/*!40014 SET FOREIGN_KEY_CHECKS=0*/
;
/*!40101 SET NAMES binary*/
;
CREATE TABLE `order_items` (
    `order_id` bigint(20) NOT NULL,
    `isbn` char(13) NOT NULL,
    `book_title` varchar(255) NOT NULL,
    `unit_price` decimal(10, 2) NOT NULL,
    `qty` int(11) NOT NULL,
    PRIMARY KEY (`order_id`, `isbn`)
    /*T![clustered_index] CLUSTERED */
,
    KEY `fk_2` (`isbn`),
    CONSTRAINT `fk_1` FOREIGN KEY (`order_id`) REFERENCES `bookstore`.`orders` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_2` FOREIGN KEY (`isbn`) REFERENCES `bookstore`.`books` (`isbn`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_bin;
/*!40014 SET FOREIGN_KEY_CHECKS=0*/
;
/*!40101 SET NAMES binary*/
;
CREATE TABLE `orders` (
    `id` bigint(20) NOT NULL AUTO_INCREMENT,
    `customer_id` bigint(20) NOT NULL,
    `order_date` timestamp DEFAULT CURRENT_TIMESTAMP,
    `total_price` decimal(10, 2) NOT NULL,
    `card_last4` char(4) NOT NULL,
    `card_expiry` char(5) NOT NULL,
    PRIMARY KEY (`id`)
    /*T![clustered_index] CLUSTERED */
,
    KEY `fk_1` (`customer_id`),
    CONSTRAINT `fk_1` FOREIGN KEY (`customer_id`) REFERENCES `bookstore`.`customers` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_bin AUTO_INCREMENT = 120001;
/*!40014 SET FOREIGN_KEY_CHECKS=0*/
;
/*!40101 SET NAMES binary*/
;
CREATE TABLE `publisher_orders` (
    `id` bigint(20) NOT NULL AUTO_INCREMENT,
    `isbn` char(13) NOT NULL,
    `publisher_id` int(11) NOT NULL,
    `order_qty` int(11) NOT NULL,
    `status` enum('Pending', 'Confirmed') DEFAULT 'Pending',
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `confirmed_at` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (`id`)
    /*T![clustered_index] CLUSTERED */
,
    KEY `fk_1` (`isbn`),
    KEY `fk_2` (`publisher_id`),
    CONSTRAINT `fk_1` FOREIGN KEY (`isbn`) REFERENCES `bookstore`.`books` (`isbn`),
    CONSTRAINT `fk_2` FOREIGN KEY (`publisher_id`) REFERENCES `bookstore`.`publishers` (`id`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_bin AUTO_INCREMENT = 90001;
/*!40014 SET FOREIGN_KEY_CHECKS=0*/
;
/*!40101 SET NAMES binary*/
;
CREATE TABLE `publishers` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(120) NOT NULL,
    `address` varchar(255) NOT NULL,
    `phone` varchar(40) NOT NULL,
    PRIMARY KEY (`id`)
    /*T![clustered_index] CLUSTERED */
,
    UNIQUE KEY `name` (`name`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_bin AUTO_INCREMENT = 30002;
/*!40014 SET FOREIGN_KEY_CHECKS=0*/
;
/*!40101 SET NAMES binary*/
;
CREATE TABLE `sales` (
    `id` bigint(20) NOT NULL AUTO_INCREMENT,
    `order_id` bigint(20) NOT NULL,
    `isbn` char(13) NOT NULL,
    `qty` int(11) NOT NULL,
    `amount` decimal(10, 2) NOT NULL,
    `sale_date` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
    /*T![clustered_index] CLUSTERED */
,
    KEY `fk_1` (`order_id`),
    KEY `fk_2` (`isbn`),
    CONSTRAINT `fk_1` FOREIGN KEY (`order_id`) REFERENCES `bookstore`.`orders` (`id`),
    CONSTRAINT `fk_2` FOREIGN KEY (`isbn`) REFERENCES `bookstore`.`books` (`isbn`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_bin AUTO_INCREMENT = 120001;
/*!40014 SET FOREIGN_KEY_CHECKS=0*/
;
/*!40101 SET NAMES binary*/
;
INSERT INTO `authors`
VALUES (1, 'Stephen Hawking'),
    (2, 'E. H. Gombrich'),
    (3, 'Yuval Noah Harari'),
    (4, 'Karen Armstrong'),
    (5, 'Tim Marshall');
/*!40014 SET FOREIGN_KEY_CHECKS=0*/
;
/*!40101 SET NAMES binary*/
;
INSERT INTO `book_authors`
VALUES ('9780062316097', 3),
    ('9780192802385', 4),
    ('9780553380163', 1),
    ('9780714832470', 2),
    ('9781783962433', 5);
/*!40014 SET FOREIGN_KEY_CHECKS=0*/
;
/*!40101 SET NAMES binary*/
;
INSERT INTO `books`
VALUES (
        '9780060850524',
        'The Alchemist',
        3,
        1993,
        140.00,
        'Religion',
        35,
        5,
        'https://covers.openlibrary.org/b/isbn/9780060850524-L.jpg',
        '2025-12-22 04:10:48'
    ),
    (
        '9780062316097',
        'Sapiens: A Brief History of Humankind',
        3,
        2015,
        210.00,
        'History',
        8,
        6,
        'https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg',
        '2025-12-22 04:10:48'
    ),
    (
        '9780140449334',
        'Meditations',
        5,
        2006,
        150.00,
        'Religion',
        16,
        3,
        'https://covers.openlibrary.org/b/isbn/9780140449334-L.jpg',
        '2025-12-22 04:10:48'
    ),
    (
        '9780141036137',
        'The Art Book',
        5,
        2007,
        260.00,
        'Art',
        17,
        2,
        'https://covers.openlibrary.org/b/isbn/9780141036137-L.jpg',
        '2025-12-22 04:10:48'
    ),
    (
        '9780143127741',
        'The Silk Roads',
        5,
        2016,
        230.00,
        'History',
        15,
        3,
        'https://covers.openlibrary.org/b/isbn/9780143127741-L.jpg',
        '2025-12-22 04:10:48'
    ),
    (
        '9780192802385',
        'A History of God',
        4,
        1994,
        190.00,
        'Religion',
        20,
        7,
        'https://covers.openlibrary.org/b/isbn/9780192802385-L.jpg',
        '2025-12-22 04:10:48'
    ),
    (
        '9780199232765',
        'Guns, Germs, and Steel',
        4,
        1997,
        195.00,
        'History',
        18,
        3,
        'https://covers.openlibrary.org/b/isbn/9780199232765-L.jpg',
        '2025-12-22 04:10:48'
    ),
    (
        '9780199291151',
        'The Selfish Gene',
        4,
        2006,
        25.00,
        'Science',
        15,
        5,
        'https://covers.openlibrary.org/b/isbn/9780199291151-L.jpg',
        '2025-12-22 04:10:48'
    ),
    (
        '9780553213119',
        'Cosmos',
        1,
        1980,
        250.00,
        'Science',
        19,
        7,
        'https://covers.openlibrary.org/b/isbn/9780553213119-L.jpg',
        '2025-12-22 04:10:48'
    ),
    (
        '9780553380163',
        'Test',
        1,
        1998,
        200.00,
        'Science',
        50,
        5,
        NULL,
        '2025-12-22 04:10:48'
    ),
    (
        '9780714832470',
        'The Story of Art',
        2,
        1995,
        250.00,
        'Art',
        15,
        5,
        'https://covers.openlibrary.org/b/isbn/9780714832470-L.jpg',
        '2025-12-22 04:10:48'
    ),
    (
        '9781783962433',
        'Prisoners of Geography',
        5,
        2016,
        200.00,
        'Geography',
        26,
        6,
        'https://covers.openlibrary.org/b/isbn/9781783962433-L.jpg',
        '2025-12-22 04:10:48'
    );
/*!40014 SET FOREIGN_KEY_CHECKS=0*/
;
/*!40101 SET NAMES binary*/
;
INSERT INTO `cart_items`
VALUES (1, '9780062316097', 2),
    (1, '9780553380163', 1),
    (2, '9780141036137', 1),
    (2, '9780714832470', 1),
    (3, '9781783962433', 2),
    (30001, '9780553380163', 2),
    (150001, '9780553380163', 2),
    (150002, '9780553380163', 2);
/*!40014 SET FOREIGN_KEY_CHECKS=0*/
;
/*!40101 SET NAMES binary*/
;
INSERT INTO `carts`
VALUES (1, 3, '2025-12-22 04:13:08'),
    (2, 2, '2025-12-22 04:13:08'),
    (3, 1, '2025-12-22 04:13:08'),
    (30001, 30001, '2025-12-22 04:49:47'),
    (60001, 60001, '2025-12-22 05:00:02'),
    (120001, 90001, '2025-12-22 07:01:37'),
    (150001, 120001, '2025-12-22 07:17:28'),
    (150002, 120002, '2025-12-22 07:17:30'),
    (180001, 150001, '2025-12-22 07:39:59');
/*!40014 SET FOREIGN_KEY_CHECKS=0*/
;
/*!40101 SET NAMES binary*/
;
INSERT INTO `customers`
VALUES (
        1,
        'youssef99',
        '$2y$dummyhash1',
        'Youssef',
        'Ayman',
        'youssef@example.com',
        '+20-100-000-0001',
        'Cairo, Egypt',
        '2025-12-22 04:12:41'
    ),
    (
        2,
        'sara88',
        '$2y$dummyhash2',
        'Sara',
        'Hassan',
        'sara@example.com',
        '+20-100-000-0002',
        'Alexandria, Egypt',
        '2025-12-22 04:12:41'
    ),
    (
        3,
        'omar77',
        '$2y$dummyhash3',
        'Omar',
        'Mahmoud',
        'omar@example.com',
        '+20-100-000-0003',
        'Giza, Egypt',
        '2025-12-22 04:12:41'
    ),
    (
        30001,
        'testuser99',
        '$2b$10$rgiF55PbMj8fBDOGeIF18.4OBBe/Yfekgq9G3i1n9O6iO1s.e8wzG',
        'Test',
        'User',
        'test99@mail.com',
        '01000000099',
        'Cairo',
        '2025-12-22 04:49:47'
    ),
    (
        60001,
        'testuser1',
        '$2b$10$YA0Xdr4OmQu5CkOckK7PwOujtq0UQWjkPkKHSeN0BHGMKoGJ5mrzG',
        'Test',
        'User',
        'test1@mail.com',
        '01000000099',
        'Cairo',
        '2025-12-22 05:00:02'
    ),
    (
        90001,
        'testuser',
        '$2b$10$ZP5vIxPlc9m0bBvQUoym8OkCMCSgLvvVmMpmrfUY3b/NSNXKiNKpm',
        'Test',
        'User',
        'test@test.com',
        '123-456-7890',
        '123 Test St',
        '2025-12-22 07:01:37'
    ),
    (
        120001,
        'finaltest_1766387848',
        '$2b$10$u0LiB2r.K9x49s6Lz6BeVuoczgdpXR55qh5VLrbnq0KNqDppL.g2m',
        'Final',
        'Test',
        'final1766387848@test.com',
        '555-1234',
        '123 Test St',
        '2025-12-22 07:17:28'
    ),
    (
        120002,
        'finaltest_1766387850',
        '$2b$10$4A0W6sbwuBwUVKeUogspD.zvvs15p9p/iMOAg3wp1Ipk08XeSDfSK',
        'Final',
        'Test',
        'final1766387850@test.com',
        '555-1234',
        '123 Test St',
        '2025-12-22 07:17:30'
    ),
    (
        150001,
        'youssefayman',
        '$2b$10$Ci0K1LQzpDrQ0S27ObBct.71P/WwV1e.lm0A4rLflfn8d98Bo57Ie',
        'Youssef',
        'Ayman',
        'youssefayman00@gmail.com',
        '01123222933',
        'Alexandria, Eygpt',
        '2025-12-22 07:39:59'
    );
/*!40014 SET FOREIGN_KEY_CHECKS=0*/
;
/*!40101 SET NAMES binary*/
;
INSERT INTO `order_items`
VALUES (
        1,
        '9780062316097',
        'Sapiens: A Brief History of Humankind',
        210.00,
        2
    ),
    (
        1,
        '9780553380163',
        'A Brief History of Time',
        220.00,
        1
    ),
    (2, '9780141036137', 'The Art Book', 260.00, 1),
    (2, '9780714832470', 'The Story of Art', 250.00, 1),
    (
        3,
        '9781783962433',
        'Prisoners of Geography',
        200.00,
        2
    ),
    (
        30001,
        '9780553380163',
        'A Brief History of Time',
        220.00,
        2
    ),
    (
        30002,
        '9780553380163',
        'A Brief History of Time',
        220.00,
        1
    ),
    (
        30003,
        '9780553380163',
        'A Brief History of Time',
        220.00,
        1
    ),
    (
        60001,
        '9781783962433',
        'Prisoners of Geography',
        200.00,
        2
    ),
    (
        60002,
        '9781783962433',
        'Prisoners of Geography',
        200.00,
        2
    ),
    (
        60003,
        '9781783962433',
        'Prisoners of Geography',
        200.00,
        1
    ),
    (
        60004,
        '9781783962433',
        'Prisoners of Geography',
        200.00,
        1
    ),
    (
        90001,
        '9780714832470',
        'The Story of Art',
        250.00,
        1
    ),
    (
        90002,
        '9780062316097',
        'Sapiens: A Brief History of Humankind',
        210.00,
        1
    );
/*!40014 SET FOREIGN_KEY_CHECKS=0*/
;
/*!40101 SET NAMES binary*/
;
INSERT INTO `orders`
VALUES (1, 1, '2025-12-22 04:13:45', 640.00, '1234', '12/27'),
    (2, 2, '2025-12-22 04:13:45', 510.00, '5678', '08/26'),
    (3, 3, '2025-12-22 04:13:45', 400.00, '9012', '03/28'),
    (
        30001,
        30001,
        '2025-12-22 04:57:41',
        440.00,
        '1234',
        '12/27'
    ),
    (
        30002,
        60001,
        '2025-12-22 05:03:43',
        220.00,
        '1234',
        '12/27'
    ),
    (
        30003,
        60001,
        '2025-12-22 05:12:02',
        220.00,
        '1234',
        '12/27'
    ),
    (
        60001,
        60001,
        '2025-12-22 05:47:08',
        400.00,
        '1234',
        '12/27'
    ),
    (
        60002,
        60001,
        '2025-12-22 05:48:42',
        400.00,
        'abcd',
        '12/27'
    ),
    (
        60003,
        60001,
        '2025-12-22 05:48:58',
        200.00,
        '1234',
        '12/20'
    ),
    (
        60004,
        60001,
        '2025-12-22 05:50:15',
        200.00,
        'abcd',
        '12/27'
    ),
    (
        90001,
        60001,
        '2025-12-22 05:56:49',
        250.00,
        '1234',
        '12/27'
    ),
    (
        90002,
        60001,
        '2025-12-22 05:59:19',
        210.00,
        '1234',
        '12/27'
    );
/*!40014 SET FOREIGN_KEY_CHECKS=0*/
;
/*!40101 SET NAMES binary*/
;
INSERT INTO `publisher_orders`
VALUES (
        1,
        '9780553380163',
        1,
        20,
        'Confirmed',
        '2025-12-22 04:14:28',
        '2025-12-22 04:14:28'
    ),
    (
        2,
        '9780062316097',
        3,
        15,
        'Confirmed',
        '2025-12-22 04:14:28',
        '2025-12-22 04:14:28'
    ),
    (
        3,
        '9780141036137',
        5,
        10,
        'Confirmed',
        '2025-12-22 04:14:28',
        '2025-12-22 06:49:28'
    ),
    (
        4,
        '9781783962433',
        5,
        25,
        'Confirmed',
        '2025-12-22 04:14:28',
        '2025-12-22 04:14:28'
    ),
    (
        30001,
        '9780553380163',
        1,
        24,
        'Confirmed',
        '2025-12-22 05:12:02',
        '2025-12-22 06:49:28'
    ),
    (
        60001,
        '9780553380163',
        1,
        18,
        'Confirmed',
        '2025-12-22 06:48:56',
        '2025-12-22 06:49:29'
    ),
    (
        60002,
        '9780553380163',
        1,
        18,
        'Confirmed',
        '2025-12-22 06:49:11',
        '2025-12-22 06:49:29'
    );
/*!40014 SET FOREIGN_KEY_CHECKS=0*/
;
/*!40101 SET NAMES binary*/
;
INSERT INTO `publishers`
VALUES (
        1,
        'Bantam Books',
        'New York, USA',
        '+1-212-000-0000'
    ),
    (
        2,
        'Phaidon Press',
        'London, UK',
        '+44-20-0000-0000'
    ),
    (
        3,
        'HarperCollins',
        'New York, USA',
        '+1-212-111-1111'
    ),
    (
        4,
        'Oxford University Press',
        'Oxford, UK',
        '+44-1865-000000'
    ),
    (
        5,
        'Penguin Books',
        'London, UK',
        '+44-20-2222-2222'
    );
/*!40014 SET FOREIGN_KEY_CHECKS=0*/
;
/*!40101 SET NAMES binary*/
;
INSERT INTO `sales`
VALUES (
        1,
        1,
        '9780553380163',
        1,
        220.00,
        '2025-12-22 04:14:12'
    ),
    (
        2,
        1,
        '9780062316097',
        2,
        420.00,
        '2025-12-22 04:14:12'
    ),
    (
        3,
        2,
        '9780714832470',
        1,
        250.00,
        '2025-12-22 04:14:12'
    ),
    (
        4,
        2,
        '9780141036137',
        1,
        260.00,
        '2025-12-22 04:14:12'
    ),
    (
        5,
        3,
        '9781783962433',
        2,
        400.00,
        '2025-12-22 04:14:12'
    ),
    (
        30001,
        30001,
        '9780553380163',
        2,
        440.00,
        '2025-12-22 04:57:41'
    ),
    (
        30002,
        30002,
        '9780553380163',
        1,
        220.00,
        '2025-12-22 05:03:43'
    ),
    (
        30003,
        30003,
        '9780553380163',
        1,
        220.00,
        '2025-12-22 05:12:02'
    ),
    (
        60001,
        60001,
        '9781783962433',
        2,
        400.00,
        '2025-12-22 05:47:08'
    ),
    (
        60002,
        60002,
        '9781783962433',
        2,
        400.00,
        '2025-12-22 05:48:43'
    ),
    (
        60003,
        60003,
        '9781783962433',
        1,
        200.00,
        '2025-12-22 05:48:59'
    ),
    (
        60004,
        60004,
        '9781783962433',
        1,
        200.00,
        '2025-12-22 05:50:15'
    ),
    (
        90001,
        90001,
        '9780714832470',
        1,
        250.00,
        '2025-12-22 05:56:49'
    ),
    (
        90002,
        90002,
        '9780062316097',
        1,
        210.00,
        '2025-12-22 05:59:19'
    );