-- CreateEnum
CREATE TYPE "billing_period" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "plan_status" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "membership_record_status" AS ENUM ('ACTIVE', 'FROZEN', 'CANCELLED');

-- CreateTable
CREATE TABLE "membership_plans" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "billing_period" "billing_period" NOT NULL,
    "perks" TEXT[],
    "is_popular" BOOLEAN NOT NULL DEFAULT false,
    "status" "plan_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_memberships" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "plan_name" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "billing_period" "billing_period" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "membership_record_status" NOT NULL DEFAULT 'ACTIVE',
    "frozen_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "payment_method" TEXT,
    "payment_reference" TEXT,
    "renewed_from_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "membership_plans_tenant_id_status_idx" ON "membership_plans"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "membership_plans_tenant_id_name_key" ON "membership_plans"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "member_memberships_renewed_from_id_key" ON "member_memberships"("renewed_from_id");

-- CreateIndex
CREATE INDEX "member_memberships_tenant_id_member_id_idx" ON "member_memberships"("tenant_id", "member_id");

-- CreateIndex
CREATE INDEX "member_memberships_tenant_id_status_idx" ON "member_memberships"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "member_memberships_tenant_id_end_date_idx" ON "member_memberships"("tenant_id", "end_date");

-- CreateIndex
CREATE INDEX "member_memberships_plan_id_idx" ON "member_memberships"("plan_id");

-- AddForeignKey
ALTER TABLE "membership_plans" ADD CONSTRAINT "membership_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_memberships" ADD CONSTRAINT "member_memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_memberships" ADD CONSTRAINT "member_memberships_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_memberships" ADD CONSTRAINT "member_memberships_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_memberships" ADD CONSTRAINT "member_memberships_renewed_from_id_fkey" FOREIGN KEY ("renewed_from_id") REFERENCES "member_memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
