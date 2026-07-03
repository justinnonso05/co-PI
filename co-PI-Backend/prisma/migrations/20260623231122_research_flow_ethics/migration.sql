/*
  Warnings:

  - The values [EXEMPT] on the enum `EthicalStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [ACTIVE] on the enum `ProjectStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "EthicalStatus_new" AS ENUM ('NOT_REQUIRED', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');
ALTER TABLE "public"."Project" ALTER COLUMN "ethicalClearanceStatus" DROP DEFAULT;
ALTER TABLE "Project" ALTER COLUMN "ethicalClearanceStatus" TYPE "EthicalStatus_new" USING ("ethicalClearanceStatus"::text::"EthicalStatus_new");
ALTER TYPE "EthicalStatus" RENAME TO "EthicalStatus_old";
ALTER TYPE "EthicalStatus_new" RENAME TO "EthicalStatus";
DROP TYPE "public"."EthicalStatus_old";
ALTER TABLE "Project" ALTER COLUMN "ethicalClearanceStatus" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ProjectStatus_new" AS ENUM ('DRAFT', 'PROPOSAL', 'ETHICS_REVIEW', 'DATA_COLLECTION', 'DATA_ANALYSIS', 'INTERNAL_REVIEW', 'PUBLISHED', 'COMPLETED', 'ARCHIVED');
ALTER TABLE "public"."Project" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Project" ALTER COLUMN "status" TYPE "ProjectStatus_new" USING ("status"::text::"ProjectStatus_new");
ALTER TYPE "ProjectStatus" RENAME TO "ProjectStatus_old";
ALTER TYPE "ProjectStatus_new" RENAME TO "ProjectStatus";
DROP TYPE "public"."ProjectStatus_old";
ALTER TABLE "Project" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "ethicalApprovalDate" TIMESTAMP(3),
ADD COLUMN     "ethicalClearanceDocumentUrl" TEXT,
ADD COLUMN     "ethicalClearanceNumber" TEXT,
ADD COLUMN     "ethicalExpiryDate" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'DRAFT';
