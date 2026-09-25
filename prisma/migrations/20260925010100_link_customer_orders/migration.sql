-- New accounts are customers unless an explicit role is assigned.
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';

-- Existing orders remain valid; every new order created by the API has a customer.
ALTER TABLE "Order" ADD COLUMN "customerId" TEXT;
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt");
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
