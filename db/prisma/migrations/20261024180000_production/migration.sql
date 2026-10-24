-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "shipment_status" ADD VALUE 'labeled';
ALTER TYPE "shipment_status" ADD VALUE 'in_transit';
ALTER TYPE "shipment_status" ADD VALUE 'delivered';
ALTER TYPE "shipment_status" ADD VALUE 'exception';

-- AlterEnum
ALTER TYPE "vault_status" ADD VALUE 'recalled';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "idempotency_key" TEXT,
ADD COLUMN     "processor" TEXT NOT NULL DEFAULT 'stub',
ADD COLUMN     "refunded_cents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reserve_cents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "three_ds_status" TEXT;

-- AlterTable
ALTER TABLE "pulls" ADD COLUMN     "batch_id" TEXT,
ADD COLUMN     "voided" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "address_line" TEXT,
ADD COLUMN     "carrier" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT DEFAULT 'US',
ADD COLUMN     "insurance_cents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "insured" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "label_url" TEXT,
ADD COLUMN     "postal" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "signature" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sla_due_at" TIMESTAMP(3),
ADD COLUMN     "tracking_number" TEXT,
ADD COLUMN     "tracking_url" TEXT;

-- AlterTable
ALTER TABLE "user_limits" ADD COLUMN     "pending_daily_limit_cents" INTEGER,
ADD COLUMN     "pending_limit_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "arbitration_opt_out_at" TIMESTAMP(3),
ADD COLUMN     "billing_state" TEXT,
ADD COLUMN     "cool_off_until" TIMESTAMP(3),
ADD COLUMN     "email_verified_at" TIMESTAMP(3),
ADD COLUMN     "failed_logins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "haptics" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locked_until" TIMESTAMP(3),
ADD COLUMN     "mute_sound" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pending_spend_limit_at" TIMESTAMP(3),
ADD COLUMN     "pending_spend_limit_cents" INTEGER,
ADD COLUMN     "referral_code" TEXT,
ADD COLUMN     "referred_by_id" TEXT,
ADD COLUMN     "spend_limit_cents" INTEGER NOT NULL DEFAULT 50000,
ADD COLUMN     "terms_accepted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "wallets" ADD COLUMN     "promo_cents" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "feature_flags" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "login_codes" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promo_credits" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "remaining_cents" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "processor" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" JSONB,
    "clawback_cents" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reserve_lots" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "release_at" TIMESTAMP(3) NOT NULL,
    "released_at" TIMESTAMP(3),

    CONSTRAINT "reserve_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pack_approvals" (
    "id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pack_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_changes" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "approver_id" TEXT,
    "fmv_cents" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promos" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amoe_entries" (
    "id" TEXT NOT NULL,
    "promo_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "amoe_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" TEXT NOT NULL,
    "referrer_id" TEXT NOT NULL,
    "referee_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "disclosed" BOOLEAN NOT NULL,
    "reward_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_inquiries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "inquiry_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "login_codes_email_created_at_idx" ON "login_codes"("email", "created_at");

-- CreateIndex
CREATE INDEX "oauth_accounts_user_id_idx" ON "oauth_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_provider_account_id_key" ON "oauth_accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE INDEX "promo_credits_user_id_expires_at_idx" ON "promo_credits"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "disputes_payment_id_key" ON "disputes"("payment_id");

-- CreateIndex
CREATE INDEX "disputes_user_id_idx" ON "disputes"("user_id");

-- CreateIndex
CREATE INDEX "reserve_lots_release_at_idx" ON "reserve_lots"("release_at");

-- CreateIndex
CREATE INDEX "pack_approvals_pack_id_status_idx" ON "pack_approvals"("pack_id", "status");

-- CreateIndex
CREATE INDEX "price_changes_card_id_created_at_idx" ON "price_changes"("card_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "promos_slug_key" ON "promos"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "amoe_entries_promo_id_email_source_key" ON "amoe_entries"("promo_id", "email", "source");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referee_id_key" ON "referrals"("referee_id");

-- CreateIndex
CREATE INDEX "referrals_code_idx" ON "referrals"("code");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_inquiries_inquiry_id_key" ON "kyc_inquiries"("inquiry_id");

-- CreateIndex
CREATE INDEX "kyc_inquiries_user_id_idx" ON "kyc_inquiries"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- AddForeignKey
ALTER TABLE "amoe_entries" ADD CONSTRAINT "amoe_entries_promo_id_fkey" FOREIGN KEY ("promo_id") REFERENCES "promos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
