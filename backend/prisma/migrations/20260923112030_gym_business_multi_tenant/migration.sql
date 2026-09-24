-- CreateEnum
CREATE TYPE "tenant_status" AS ENUM ('ONBOARDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "address_line" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'GBP',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'en-GB',
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "postal_code" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "status" "tenant_status" NOT NULL DEFAULT 'ONBOARDING',
ADD COLUMN     "tagline" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "business_hours" JSONB NOT NULL DEFAULT '[]',
    "membership_policy" JSONB NOT NULL DEFAULT '{}',
    "payment_methods" JSONB NOT NULL DEFAULT '{}',
    "notification_preferences" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenant_id_key" ON "tenant_settings"("tenant_id");

-- AddForeignKey
ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
