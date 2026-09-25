-- CreateEnum
CREATE TYPE "DeliveryAssignmentStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryStopStatus" AS ENUM ('PENDING', 'ARRIVED', 'DELIVERED', 'SKIPPED');

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'DELIVERER');
UPDATE "User" SET "role" = 'DELIVERER' WHERE "role" IN ('STAFF', 'KITCHEN');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'DELIVERER';
COMMIT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "googleSubject" TEXT,
ALTER COLUMN "passwordHash" DROP NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'DELIVERER';

-- CreateTable
CREATE TABLE "DeliveryAssignment" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "status" "DeliveryAssignmentStatus" NOT NULL DEFAULT 'PLANNED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryStop" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "DeliveryStopStatus" NOT NULL DEFAULT 'PENDING',
    "estimatedDistanceKm" DECIMAL(8,2),
    "estimatedDurationMin" INTEGER,
    "arrivedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryLocation" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InAppNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryAssignment_driverId_status_idx" ON "DeliveryAssignment"("driverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryStop_orderId_key" ON "DeliveryStop"("orderId");

-- CreateIndex
CREATE INDEX "DeliveryStop_assignmentId_status_idx" ON "DeliveryStop"("assignmentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryStop_assignmentId_sequence_key" ON "DeliveryStop"("assignmentId", "sequence");

-- CreateIndex
CREATE INDEX "DeliveryLocation_assignmentId_recordedAt_idx" ON "DeliveryLocation"("assignmentId", "recordedAt");

-- CreateIndex
CREATE INDEX "InAppNotification_userId_readAt_createdAt_idx" ON "InAppNotification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSubject_key" ON "User"("googleSubject");

-- AddForeignKey
ALTER TABLE "DeliveryAssignment" ADD CONSTRAINT "DeliveryAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryStop" ADD CONSTRAINT "DeliveryStop_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "DeliveryAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryStop" ADD CONSTRAINT "DeliveryStop_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryLocation" ADD CONSTRAINT "DeliveryLocation_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "DeliveryAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
