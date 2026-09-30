-- Remplace Google Sign-In par l'authentification téléphone (OTP Firebase)
DROP INDEX "User_googleSubject_key";

ALTER TABLE "User" DROP COLUMN "googleSubject",
ALTER COLUMN "email" DROP NOT NULL,
ADD COLUMN "phone" TEXT,
ADD COLUMN "firebaseUid" TEXT;

CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_firebaseUid_key" ON "User"("firebaseUid");
