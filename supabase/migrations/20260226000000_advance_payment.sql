-- Add advance_payment column to invoices table
-- Run this SQL in your Supabase SQL Editor

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS advance_payment decimal(10,2) NOT NULL DEFAULT 0;
