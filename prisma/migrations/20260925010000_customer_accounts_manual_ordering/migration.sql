-- Add the customer role in its own committed migration.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CUSTOMER';
