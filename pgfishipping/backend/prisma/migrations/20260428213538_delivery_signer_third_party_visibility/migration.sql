-- CreateEnum
CREATE TYPE "DeliverySignerRole" AS ENUM ('ACCOUNT_HOLDER', 'AUTHORIZED_THIRD_PARTY', 'CUSTOM');

-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "deliveredSignerName" TEXT,
ADD COLUMN     "deliveredSignerRole" "DeliverySignerRole";
