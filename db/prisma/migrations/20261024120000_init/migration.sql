-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'blocked', 'self_excluded', 'locked');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "kyc_status" AS ENUM ('none', 'pending', 'passed', 'failed');

-- CreateEnum
CREATE TYPE "card_status" AS ENUM ('intake', 'available', 'allocated', 'pulled', 'shipping', 'shipped', 'bought_back', 'frozen');

-- CreateEnum
CREATE TYPE "card_category" AS ENUM ('pokemon', 'baseball', 'basketball', 'football', 'one_piece', 'other');

-- CreateEnum
CREATE TYPE "grader" AS ENUM ('PSA', 'BGS', 'CGC', 'SGC');

-- CreateEnum
CREATE TYPE "owner_type" AS ENUM ('house', 'supplier');

-- CreateEnum
CREATE TYPE "price_confidence" AS ENUM ('high', 'low');

-- CreateEnum
CREATE TYPE "pack_status" AS ENUM ('draft', 'live', 'paused', 'retired');

-- CreateEnum
CREATE TYPE "tier_name" AS ENUM ('common', 'rare', 'epic', 'legendary', 'grail');

-- CreateEnum
CREATE TYPE "slot_state" AS ENUM ('available', 'pulled');

-- CreateEnum
CREATE TYPE "funding_source" AS ENUM ('card', 'credit_buyback', 'promo', 'seed');

-- CreateEnum
CREATE TYPE "ledger_direction" AS ENUM ('credit', 'debit');

-- CreateEnum
CREATE TYPE "vault_status" AS ENUM ('held', 'shipping', 'shipped', 'bought_back');

-- CreateEnum
CREATE TYPE "buyback_status" AS ENUM ('offered', 'completed', 'expired', 'blocked');

-- CreateEnum
CREATE TYPE "shipment_status" AS ENUM ('requested', 'waiting_hold', 'canceled');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "dob" DATE NOT NULL,
    "state" TEXT NOT NULL,
    "kyc_status" "kyc_status" NOT NULL DEFAULT 'none',
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "vip_tier" INTEGER NOT NULL DEFAULT 0,
    "client_seed" TEXT NOT NULL,
    "skip_animation" BOOLEAN NOT NULL DEFAULT false,
    "status" "user_status" NOT NULL DEFAULT 'active',
    "role" "user_role" NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geo_checks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "state" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "reason" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geo_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_limits" (
    "user_id" TEXT NOT NULL,
    "daily_limit_cents" INTEGER NOT NULL DEFAULT 50000,

    CONSTRAINT "user_limits_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "user_id" TEXT NOT NULL,
    "available_cents" INTEGER NOT NULL DEFAULT 0,
    "held_card_cents" INTEGER NOT NULL DEFAULT 0,
    "buyback_cents" INTEGER NOT NULL DEFAULT 0,
    "funding_hold_until" TIMESTAMP(3),

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "journal_id" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "user_id" TEXT,
    "direction" "ledger_direction" NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "funding_source" "funding_source" NOT NULL,
    "hold_until" TIMESTAMP(3),
    "ref_type" TEXT NOT NULL,
    "ref_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "three_ds" BOOLEAN NOT NULL DEFAULT false,
    "risk" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" TEXT NOT NULL,
    "grader" "grader" NOT NULL,
    "cert_number" TEXT NOT NULL,
    "grade" DECIMAL(3,1) NOT NULL,
    "category" "card_category" NOT NULL,
    "subject" TEXT NOT NULL,
    "set_name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "card_number" TEXT,
    "variant" TEXT,
    "fmv_cents" INTEGER NOT NULL,
    "price_confidence" "price_confidence" NOT NULL DEFAULT 'high',
    "fmv_at" TIMESTAMP(3) NOT NULL,
    "fmv_source" TEXT NOT NULL,
    "cost_cents" INTEGER NOT NULL,
    "owner_type" "owner_type" NOT NULL DEFAULT 'house',
    "supplier_id" TEXT,
    "custody_location" TEXT NOT NULL,
    "bin" TEXT NOT NULL,
    "image_front_url" TEXT,
    "image_back_url" TEXT,
    "status" "card_status" NOT NULL DEFAULT 'available',
    "example" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "fmv_cents" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_events" (
    "id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "card_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packs" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "status" "pack_status" NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "liability_cap_cents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pack_tiers" (
    "id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "tier" "tier_name" NOT NULL,
    "odds_bps" INTEGER NOT NULL,

    CONSTRAINT "pack_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pack_slots" (
    "id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "tier" "tier_name" NOT NULL,
    "slot_index" INTEGER NOT NULL,
    "card_id" TEXT NOT NULL,
    "state" "slot_state" NOT NULL DEFAULT 'available',

    CONSTRAINT "pack_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "server_seeds" (
    "id" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "active_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revealed_at" TIMESTAMP(3),

    CONSTRAINT "server_seeds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pulls" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "seed_id" TEXT NOT NULL,
    "client_seed" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL,
    "tier" "tier_name" NOT NULL,
    "pool_index" INTEGER NOT NULL,
    "slot_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "funding_source" "funding_source" NOT NULL,
    "hmac" TEXT NOT NULL,
    "available_slot_ids" JSONB NOT NULL,
    "slot_list_hash" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pulls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vault_items" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "pull_id" TEXT NOT NULL,
    "status" "vault_status" NOT NULL DEFAULT 'held',
    "ship_hold_until" TIMESTAMP(3),
    "buyback_blocked" BOOLEAN NOT NULL DEFAULT false,
    "fmv_cents_at_pull" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vault_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buybacks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "vault_item_id" TEXT NOT NULL,
    "card_id" TEXT NOT NULL,
    "fmv_cents" INTEGER NOT NULL,
    "haircut_bps" INTEGER NOT NULL,
    "rate_bps" INTEGER NOT NULL,
    "credit_cents" INTEGER NOT NULL,
    "offer_expires_at" TIMESTAMP(3) NOT NULL,
    "status" "buyback_status" NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buybacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "shipment_status" NOT NULL,
    "fee_cents" INTEGER NOT NULL,
    "hold_reason" TEXT,
    "card_ids" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audits" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "detail" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "geo_checks_user_id_idx" ON "geo_checks"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_idempotency_key_key" ON "ledger_entries"("idempotency_key");

-- CreateIndex
CREATE INDEX "ledger_entries_user_id_at_idx" ON "ledger_entries"("user_id", "at");

-- CreateIndex
CREATE INDEX "ledger_entries_journal_id_idx" ON "ledger_entries"("journal_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_ref_key" ON "payments"("ref");

-- CreateIndex
CREATE INDEX "cards_status_idx" ON "cards"("status");

-- CreateIndex
CREATE UNIQUE INDEX "cards_grader_cert_number_key" ON "cards"("grader", "cert_number");

-- CreateIndex
CREATE INDEX "price_history_card_id_at_idx" ON "price_history"("card_id", "at");

-- CreateIndex
CREATE INDEX "card_events_card_id_at_idx" ON "card_events"("card_id", "at");

-- CreateIndex
CREATE UNIQUE INDEX "packs_slug_key" ON "packs"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "pack_tiers_pack_id_version_tier_key" ON "pack_tiers"("pack_id", "version", "tier");

-- CreateIndex
CREATE INDEX "pack_slots_pack_id_version_tier_state_idx" ON "pack_slots"("pack_id", "version", "tier", "state");

-- CreateIndex
CREATE UNIQUE INDEX "pack_slots_pack_id_version_slot_index_key" ON "pack_slots"("pack_id", "version", "slot_index");

-- CreateIndex
CREATE UNIQUE INDEX "server_seeds_hash_key" ON "server_seeds"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "pulls_idempotency_key_key" ON "pulls"("idempotency_key");

-- CreateIndex
CREATE INDEX "pulls_user_id_at_idx" ON "pulls"("user_id", "at");

-- CreateIndex
CREATE UNIQUE INDEX "pulls_user_id_seed_id_nonce_key" ON "pulls"("user_id", "seed_id", "nonce");

-- CreateIndex
CREATE UNIQUE INDEX "vault_items_pull_id_key" ON "vault_items"("pull_id");

-- CreateIndex
CREATE INDEX "vault_items_user_id_status_idx" ON "vault_items"("user_id", "status");

-- CreateIndex
CREATE INDEX "buybacks_vault_item_id_status_idx" ON "buybacks"("vault_item_id", "status");

-- CreateIndex
CREATE INDEX "shipments_user_id_idx" ON "shipments"("user_id");

-- CreateIndex
CREATE INDEX "admin_audits_at_idx" ON "admin_audits"("at");

-- AddForeignKey
ALTER TABLE "geo_checks" ADD CONSTRAINT "geo_checks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_limits" ADD CONSTRAINT "user_limits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_events" ADD CONSTRAINT "card_events_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_tiers" ADD CONSTRAINT "pack_tiers_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_slots" ADD CONSTRAINT "pack_slots_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_slots" ADD CONSTRAINT "pack_slots_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pulls" ADD CONSTRAINT "pulls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pulls" ADD CONSTRAINT "pulls_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pulls" ADD CONSTRAINT "pulls_seed_id_fkey" FOREIGN KEY ("seed_id") REFERENCES "server_seeds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pulls" ADD CONSTRAINT "pulls_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_items" ADD CONSTRAINT "vault_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_items" ADD CONSTRAINT "vault_items_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vault_items" ADD CONSTRAINT "vault_items_pull_id_fkey" FOREIGN KEY ("pull_id") REFERENCES "pulls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buybacks" ADD CONSTRAINT "buybacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buybacks" ADD CONSTRAINT "buybacks_vault_item_id_fkey" FOREIGN KEY ("vault_item_id") REFERENCES "vault_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Ledger rows are insert-only. The application role is granted SELECT, INSERT in tests.
CREATE OR REPLACE FUNCTION ledger_entries_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_entries_no_mutation
BEFORE UPDATE OR DELETE ON ledger_entries
FOR EACH ROW
EXECUTE FUNCTION ledger_entries_immutable();
