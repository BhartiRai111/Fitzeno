-- CreateEnum
CREATE TYPE "member_status" AS ENUM ('ACTIVE', 'INACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "lead_status" AS ENUM ('NEW', 'CONTACTED', 'FOLLOW_UP', 'TRIAL_SCHEDULED', 'TRIAL_COMPLETED', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "lead_source" AS ENUM ('WEBSITE', 'INSTAGRAM', 'REFERRAL', 'WALK_IN', 'ADVERTISEMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "lead_lost_reason" AS ENUM ('NO_RESPONSE', 'NOT_INTERESTED', 'PRICE', 'CHOSE_ANOTHER_GYM', 'BAD_TIMING', 'OTHER');

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "gender" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "address_line" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "status" "member_status" NOT NULL DEFAULT 'ACTIVE',
    "joined_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trainer_id" TEXT,
    "converted_from_lead_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_notes" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "author_id" TEXT,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "source" "lead_source" NOT NULL,
    "interest" TEXT,
    "status" "lead_status" NOT NULL DEFAULT 'NEW',
    "lost_reason" "lead_lost_reason",
    "assigned_to_id" TEXT,
    "next_follow_up_at" TIMESTAMP(3),
    "trial_scheduled_at" TIMESTAMP(3),
    "trial_notes" TEXT,
    "converted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_notes" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "author_id" TEXT,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "members_user_id_key" ON "members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_converted_from_lead_id_key" ON "members"("converted_from_lead_id");

-- CreateIndex
CREATE INDEX "members_tenant_id_idx" ON "members"("tenant_id");

-- CreateIndex
CREATE INDEX "members_tenant_id_status_idx" ON "members"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "members_tenant_id_trainer_id_idx" ON "members"("tenant_id", "trainer_id");

-- CreateIndex
CREATE INDEX "member_notes_member_id_idx" ON "member_notes"("member_id");

-- CreateIndex
CREATE INDEX "leads_tenant_id_idx" ON "leads"("tenant_id");

-- CreateIndex
CREATE INDEX "leads_tenant_id_status_idx" ON "leads"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "leads_tenant_id_assigned_to_id_idx" ON "leads"("tenant_id", "assigned_to_id");

-- CreateIndex
CREATE INDEX "leads_tenant_id_next_follow_up_at_idx" ON "leads"("tenant_id", "next_follow_up_at");

-- CreateIndex
CREATE INDEX "lead_notes_lead_id_idx" ON "lead_notes"("lead_id");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_converted_from_lead_id_fkey" FOREIGN KEY ("converted_from_lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_notes" ADD CONSTRAINT "member_notes_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_notes" ADD CONSTRAINT "member_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
