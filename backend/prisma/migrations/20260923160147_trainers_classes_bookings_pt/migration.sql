-- CreateEnum
CREATE TYPE "day_of_week" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- CreateEnum
CREATE TYPE "trainer_status" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "class_series_status" AS ENUM ('ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "class_occurrence_status" AS ENUM ('SCHEDULED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "class_booking_status" AS ENUM ('CONFIRMED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "pt_session_status" AS ENUM ('CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "trainers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "bio" TEXT,
    "specialties" TEXT[],
    "certifications" TEXT[],
    "years_experience" INTEGER,
    "status" "trainer_status" NOT NULL DEFAULT 'ACTIVE',
    "offers_personal_training" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "trainers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_availability" (
    "id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "day_of_week" "day_of_week" NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trainer_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_series" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "trainer_id" TEXT NOT NULL,
    "day_of_week" "day_of_week" NOT NULL,
    "start_time" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "status" "class_series_status" NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "class_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_occurrences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "class_series_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" "class_occurrence_status" NOT NULL DEFAULT 'SCHEDULED',
    "cancelled_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_bookings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "class_occurrence_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "status" "class_booking_status" NOT NULL DEFAULT 'CONFIRMED',
    "booked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_training_sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "start_time" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "status" "pt_session_status" NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_training_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trainers_user_id_key" ON "trainers"("user_id");

-- CreateIndex
CREATE INDEX "trainers_tenant_id_idx" ON "trainers"("tenant_id");

-- CreateIndex
CREATE INDEX "trainers_tenant_id_status_idx" ON "trainers"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "trainer_availability_trainer_id_day_of_week_idx" ON "trainer_availability"("trainer_id", "day_of_week");

-- CreateIndex
CREATE INDEX "class_series_tenant_id_idx" ON "class_series"("tenant_id");

-- CreateIndex
CREATE INDEX "class_series_tenant_id_status_idx" ON "class_series"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "class_series_tenant_id_trainer_id_idx" ON "class_series"("tenant_id", "trainer_id");

-- CreateIndex
CREATE INDEX "class_occurrences_tenant_id_date_idx" ON "class_occurrences"("tenant_id", "date");

-- CreateIndex
CREATE INDEX "class_occurrences_trainer_id_date_idx" ON "class_occurrences"("trainer_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "class_occurrences_class_series_id_date_key" ON "class_occurrences"("class_series_id", "date");

-- CreateIndex
CREATE INDEX "class_bookings_tenant_id_member_id_idx" ON "class_bookings"("tenant_id", "member_id");

-- CreateIndex
CREATE INDEX "class_bookings_class_occurrence_id_status_idx" ON "class_bookings"("class_occurrence_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "class_bookings_class_occurrence_id_member_id_key" ON "class_bookings"("class_occurrence_id", "member_id");

-- CreateIndex
CREATE INDEX "personal_training_sessions_tenant_id_member_id_idx" ON "personal_training_sessions"("tenant_id", "member_id");

-- CreateIndex
CREATE INDEX "personal_training_sessions_trainer_id_date_idx" ON "personal_training_sessions"("trainer_id", "date");

-- AddForeignKey
ALTER TABLE "trainers" ADD CONSTRAINT "trainers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainers" ADD CONSTRAINT "trainers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_availability" ADD CONSTRAINT "trainer_availability_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_series" ADD CONSTRAINT "class_series_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_series" ADD CONSTRAINT "class_series_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_occurrences" ADD CONSTRAINT "class_occurrences_class_series_id_fkey" FOREIGN KEY ("class_series_id") REFERENCES "class_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_occurrences" ADD CONSTRAINT "class_occurrences_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_bookings" ADD CONSTRAINT "class_bookings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_bookings" ADD CONSTRAINT "class_bookings_class_occurrence_id_fkey" FOREIGN KEY ("class_occurrence_id") REFERENCES "class_occurrences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_bookings" ADD CONSTRAINT "class_bookings_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_training_sessions" ADD CONSTRAINT "personal_training_sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_training_sessions" ADD CONSTRAINT "personal_training_sessions_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_training_sessions" ADD CONSTRAINT "personal_training_sessions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
