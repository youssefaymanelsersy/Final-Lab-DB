-- Migration: Create customer_avatars table to store avatar images in TiDB
-- Date: 2025-12-24
-- Description: Stores processed WEBP avatar bytes per customer

USE bookstore;

CREATE TABLE IF NOT EXISTS customer_avatars (
    customer_id BIGINT NOT NULL,
    mime_type VARCHAR(64) NOT NULL DEFAULT 'image/webp',
    image_data LONGBLOB NOT NULL,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (customer_id),
    CONSTRAINT fk_customer_avatars_customer FOREIGN KEY (customer_id)
        REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
