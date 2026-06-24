-- Enterprise integrations: SCADA telemetry, approval workflows, ERP sync

-- AlterEnum: add PENDING_APPROVAL to BlendBatchStatus
ALTER TYPE "BlendBatchStatus" ADD VALUE IF NOT EXISTS 'PENDING_APPROVAL';

-- CreateEnum
CREATE TYPE "ApprovalEntityType" AS ENUM ('BLEND_BATCH', 'INCIDENT_REROUTE', 'INVENTORY_TRANSFER');
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE "ApproverRole" AS ENUM ('COMMERCIAL_SCHEDULER', 'TRADING_DESK', 'OPERATIONS_MANAGER', 'ADMIN');
CREATE TYPE "ScadaQuality" AS ENUM ('GOOD', 'UNCERTAIN', 'BAD');
CREATE TYPE "ErpSyncDirection" AS ENUM ('OUTBOUND', 'INBOUND');
CREATE TYPE "ErpSyncStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable scada_tags
CREATE TABLE "scada_tags" (
    "id" TEXT NOT NULL,
    "tag_code" TEXT NOT NULL,
    "tag_name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL,
    "asset_code" TEXT NOT NULL,
    "min_value" DECIMAL(18,4),
    "max_value" DECIMAL(18,4),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scada_tags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "scada_tags_tag_code_key" ON "scada_tags"("tag_code");
CREATE INDEX "scada_tags_asset_code_idx" ON "scada_tags"("asset_code");

-- CreateTable scada_telemetry_readings
CREATE TABLE "scada_telemetry_readings" (
    "id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "value" DECIMAL(18,4) NOT NULL,
    "quality" "ScadaQuality" NOT NULL DEFAULT 'GOOD',
    "source" TEXT NOT NULL DEFAULT 'SCADA_SIMULATOR',
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "scada_telemetry_readings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "scada_telemetry_readings_tag_id_recorded_at_idx" ON "scada_telemetry_readings"("tag_id", "recorded_at" DESC);

ALTER TABLE "scada_telemetry_readings" ADD CONSTRAINT "scada_telemetry_readings_tag_id_fkey"
    FOREIGN KEY ("tag_id") REFERENCES "scada_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable approval_requests
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "request_number" TEXT NOT NULL,
    "entity_type" "ApprovalEntityType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "blend_batch_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "required_role" "ApproverRole" NOT NULL,
    "requested_by" TEXT NOT NULL,
    "reviewed_by" TEXT,
    "review_notes" TEXT,
    "payload" JSONB,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "approval_requests_request_number_key" ON "approval_requests"("request_number");
CREATE INDEX "approval_requests_status_required_role_idx" ON "approval_requests"("status", "required_role");
CREATE INDEX "approval_requests_entity_type_entity_id_idx" ON "approval_requests"("entity_type", "entity_id");

ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_blend_batch_id_fkey"
    FOREIGN KEY ("blend_batch_id") REFERENCES "blend_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable erp_sync_records
CREATE TABLE "erp_sync_records" (
    "id" TEXT NOT NULL,
    "direction" "ErpSyncDirection" NOT NULL,
    "sync_type" TEXT NOT NULL,
    "destination" TEXT NOT NULL DEFAULT 'SAP_ERP',
    "status" "ErpSyncStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "response_code" INTEGER,
    "response_body" TEXT,
    "webhook_event_id" TEXT,
    "error_message" TEXT,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "erp_sync_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "erp_sync_records_status_sync_type_idx" ON "erp_sync_records"("status", "sync_type");
