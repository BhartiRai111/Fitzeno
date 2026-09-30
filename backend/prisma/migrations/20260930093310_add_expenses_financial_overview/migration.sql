-- CreateEnum
CREATE TYPE "expense_category" AS ENUM ('RENT', 'SALARIES', 'UTILITIES', 'MARKETING', 'SOFTWARE', 'MAINTENANCE', 'CLEANING', 'EQUIPMENT', 'SUPPLIES', 'OTHER');

-- CreateEnum
CREATE TYPE "expense_frequency" AS ENUM ('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "expense_status" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- AlterEnum
ALTER TYPE "notification_category" ADD VALUE 'FINANCE';

-- CreateTable
CREATE TABLE "expense_counters" (
    "tenant_id" TEXT NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "expense_counters_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "expense_category" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "frequency" "expense_frequency" NOT NULL DEFAULT 'ONE_TIME',
    "status" "expense_status" NOT NULL DEFAULT 'PENDING',
    "method" "payment_method" NOT NULL,
    "vendor" TEXT,
    "notes" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "recorded_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expenses_tenant_id_status_idx" ON "expenses"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "expenses_tenant_id_category_idx" ON "expenses"("tenant_id", "category");

-- CreateIndex
CREATE INDEX "expenses_tenant_id_date_idx" ON "expenses"("tenant_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_tenant_id_reference_key" ON "expenses"("tenant_id", "reference");

-- AddForeignKey
ALTER TABLE "expense_counters" ADD CONSTRAINT "expense_counters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
