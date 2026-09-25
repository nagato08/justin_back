-- Delivery is never billed below 500 XAF.
ALTER TABLE "StoreSettings" ALTER COLUMN "defaultDeliveryFee" SET DEFAULT 500;
UPDATE "StoreSettings" SET "defaultDeliveryFee" = 500 WHERE "defaultDeliveryFee" < 500;
UPDATE "DeliveryZone" SET "fee" = 500 WHERE "fee" < 500;
