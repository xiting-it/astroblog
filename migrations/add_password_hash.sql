-- Migration: Add password_hash column to admin_users table
-- This adds a new column for secure password hashing

-- Add password_hash column
ALTER TABLE admin_users ADD COLUMN password_hash TEXT;

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

-- Create index on password_hash for faster login verification
CREATE INDEX IF NOT EXISTS idx_admin_users_password_hash ON admin_users(password_hash);
