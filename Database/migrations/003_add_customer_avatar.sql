-- Add avatar_url column to customers for profile pictures
ALTER TABLE customers
ADD COLUMN avatar_url TEXT NULL AFTER shipping_address;
