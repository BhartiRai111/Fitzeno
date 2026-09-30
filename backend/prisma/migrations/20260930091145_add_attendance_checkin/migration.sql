-- CreateEnum
CREATE TYPE "check_in_method" AS ENUM ('QR', 'MANUAL', 'KIOSK');

-- CreateTable
CREATE TABLE "check_ins" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "method" "check_in_method" NOT NULL,
    "recorded_by_user_id" TEXT,
    "check_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "check_out_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_in_tokens" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_in_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "check_ins_tenant_id_member_id_check_in_at_idx" ON "check_ins"("tenant_id", "member_id", "check_in_at");

-- CreateIndex
CREATE INDEX "check_ins_tenant_id_check_in_at_idx" ON "check_ins"("tenant_id", "check_in_at");

-- CreateIndex
CREATE UNIQUE INDEX "check_in_tokens_token_hash_key" ON "check_in_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "check_in_tokens_member_id_idx" ON "check_in_tokens"("member_id");

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in_tokens" ADD CONSTRAINT "check_in_tokens_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in_tokens" ADD CONSTRAINT "check_in_tokens_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
