-- Add advance_payment column to invoices table
-- This column tracks optional advance payments from customers
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS advance_payment decimal(10,2) NOT NULL DEFAULT 0;
