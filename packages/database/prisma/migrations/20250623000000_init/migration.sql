-- energy-Logix Initial Migration
-- PostgreSQL CHECK constraints for volumetric mass balance integrity

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('PRODUCTION_ASSET', 'MIDSTREAM_HUB', 'UPGRADER', 'REFINERY', 'TERMINAL');
CREATE TYPE "PipelineStatus" AS ENUM ('ACTIVE', 'RESTRICTED', 'SHUTDOWN');
CREATE TYPE "BlendBatchStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'INVENTORY_WARNING');
CREATE TYPE "ShipmentStatus" AS ENUM ('SCHEDULED', 'IN_TRANSIT', 'REROUTED', 'DIVERTED_TO_STORAGE', 'DELIVERED', 'CANCELLED', 'DELAYED');
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'MITIGATING', 'RESOLVED');
CREATE TYPE "RerouteOptionType" AS ENUM ('REROUTE', 'STORAGE_DIVERT');
CREATE TYPE "NotificationSeverity" AS ENUM ('INFO', 'WARNING', 'HIGH_PRIORITY', 'CRITICAL');
CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "facilities" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "facility_type" "FacilityType" NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'Lloydminster Thermal',
    "bitumen_bbls" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "diluent_bbls" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_storage_capacity_bbls" DECIMAL(18,2) NOT NULL,
    "nominal_production_bbls_per_day" DECIMAL(18,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "storage_tanks" (
    "id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "product_type" TEXT NOT NULL,
    "max_capacity_bbls" DECIMAL(18,2) NOT NULL,
    "current_volume_bbls" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "is_operational" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "storage_tanks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pipeline_segments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "source_facility_id" TEXT NOT NULL,
    "destination_facility_id" TEXT NOT NULL,
    "status" "PipelineStatus" NOT NULL DEFAULT 'ACTIVE',
    "max_daily_capacity_bbls" DECIMAL(18,2) NOT NULL,
    "current_flow_bbls_per_day" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "length_km" DECIMAL(10,2),
    "transit_hours" INTEGER,
    "is_operational" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_segments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pipeline_adjacency" (
    "id" TEXT NOT NULL,
    "primary_segment_id" TEXT NOT NULL,
    "alternate_segment_id" TEXT NOT NULL,
    "additional_delay_days" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "pipeline_adjacency_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "blend_batches" (
    "id" TEXT NOT NULL,
    "batch_number" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "bitumen_volume_bbls" DECIMAL(18,2) NOT NULL,
    "target_ratio" DECIMAL(5,4) NOT NULL,
    "required_diluent_bbls" DECIMAL(18,2) NOT NULL,
    "total_blended_volume_bbls" DECIMAL(18,2) NOT NULL,
    "status" "BlendBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "inventory_warning" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blend_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "shipment_number" TEXT NOT NULL,
    "blend_batch_id" TEXT,
    "pipeline_segment_id" TEXT NOT NULL,
    "origin_facility_id" TEXT NOT NULL,
    "destination_facility_id" TEXT NOT NULL,
    "volume_bbls" DECIMAL(18,2) NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_departure_at" TIMESTAMP(3),
    "actual_departure_at" TIMESTAMP(3),
    "estimated_arrival_at" TIMESTAMP(3),
    "actual_arrival_at" TIMESTAMP(3),
    "original_pipeline_segment_id" TEXT,
    "delay_days" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pipeline_incidents" (
    "id" TEXT NOT NULL,
    "incident_number" TEXT NOT NULL,
    "pipeline_segment_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "estimated_duration_days" INTEGER NOT NULL DEFAULT 7,
    "is_simulated" BOOLEAN NOT NULL DEFAULT true,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "total_volume_shortfall_bbls" DECIMAL(18,2),
    "total_delay_shipment_days" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipeline_incidents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reroute_options" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "option_type" "RerouteOptionType" NOT NULL,
    "target_pipeline_segment_id" TEXT,
    "storage_facility_id" TEXT,
    "diverted_volume_bbls" DECIMAL(18,2) NOT NULL,
    "estimated_delay_days" INTEGER NOT NULL DEFAULT 0,
    "residual_capacity_used_bbls" DECIMAL(18,2),
    "is_recommended" BOOLEAN NOT NULL DEFAULT false,
    "is_accepted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reroute_options_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "NotificationSeverity" NOT NULL DEFAULT 'INFO',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "incident_id" TEXT,
    "event_type" TEXT NOT NULL,
    "destination" TEXT NOT NULL DEFAULT 'COMMERCIAL_TRADING_DESK',
    "payload" JSONB NOT NULL,
    "delivery_status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "delivered_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_ledger" (
    "id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "bitumen_delta_bbls" DECIMAL(18,2) NOT NULL,
    "diluent_delta_bbls" DECIMAL(18,2) NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "balance_bitumen_after" DECIMAL(18,2) NOT NULL,
    "balance_diluent_after" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_ledger_pkey" PRIMARY KEY ("id")
);

-- UniqueIndex
CREATE UNIQUE INDEX "facilities_code_key" ON "facilities"("code");
CREATE UNIQUE INDEX "storage_tanks_facility_id_name_key" ON "storage_tanks"("facility_id", "name");
CREATE UNIQUE INDEX "pipeline_segments_code_key" ON "pipeline_segments"("code");
CREATE UNIQUE INDEX "pipeline_adjacency_primary_segment_id_alternate_segment_id_key" ON "pipeline_adjacency"("primary_segment_id", "alternate_segment_id");
CREATE UNIQUE INDEX "blend_batches_batch_number_key" ON "blend_batches"("batch_number");
CREATE UNIQUE INDEX "shipments_shipment_number_key" ON "shipments"("shipment_number");
CREATE UNIQUE INDEX "pipeline_incidents_incident_number_key" ON "pipeline_incidents"("incident_number");
CREATE INDEX "inventory_ledger_facility_id_created_at_idx" ON "inventory_ledger"("facility_id", "created_at");

-- ForeignKey
ALTER TABLE "storage_tanks" ADD CONSTRAINT "storage_tanks_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pipeline_segments" ADD CONSTRAINT "pipeline_segments_source_facility_id_fkey" FOREIGN KEY ("source_facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pipeline_segments" ADD CONSTRAINT "pipeline_segments_destination_facility_id_fkey" FOREIGN KEY ("destination_facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pipeline_adjacency" ADD CONSTRAINT "pipeline_adjacency_primary_segment_id_fkey" FOREIGN KEY ("primary_segment_id") REFERENCES "pipeline_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pipeline_adjacency" ADD CONSTRAINT "pipeline_adjacency_alternate_segment_id_fkey" FOREIGN KEY ("alternate_segment_id") REFERENCES "pipeline_segments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blend_batches" ADD CONSTRAINT "blend_batches_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_blend_batch_id_fkey" FOREIGN KEY ("blend_batch_id") REFERENCES "blend_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_pipeline_segment_id_fkey" FOREIGN KEY ("pipeline_segment_id") REFERENCES "pipeline_segments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_origin_facility_id_fkey" FOREIGN KEY ("origin_facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_destination_facility_id_fkey" FOREIGN KEY ("destination_facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pipeline_incidents" ADD CONSTRAINT "pipeline_incidents_pipeline_segment_id_fkey" FOREIGN KEY ("pipeline_segment_id") REFERENCES "pipeline_segments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reroute_options" ADD CONSTRAINT "reroute_options_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "pipeline_incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reroute_options" ADD CONSTRAINT "reroute_options_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reroute_options" ADD CONSTRAINT "reroute_options_target_pipeline_segment_id_fkey" FOREIGN KEY ("target_pipeline_segment_id") REFERENCES "pipeline_segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reroute_options" ADD CONSTRAINT "reroute_options_storage_facility_id_fkey" FOREIGN KEY ("storage_facility_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "pipeline_incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_incident_id_fkey" FOREIGN KEY ("incident_id") REFERENCES "pipeline_incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ═══════════════════════════════════════════════════════════════════════════
-- VOLUMETRIC INTEGRITY CONSTRAINTS
-- Prevent negative inventory and capacity violations at the database level
-- ═══════════════════════════════════════════════════════════════════════════

-- Facility: inventories cannot be negative
ALTER TABLE "facilities"
  ADD CONSTRAINT "chk_facility_bitumen_non_negative"
    CHECK ("bitumen_bbls" >= 0),
  ADD CONSTRAINT "chk_facility_diluent_non_negative"
    CHECK ("diluent_bbls" >= 0),
  ADD CONSTRAINT "chk_facility_total_storage_positive"
    CHECK ("total_storage_capacity_bbls" > 0),
  ADD CONSTRAINT "chk_facility_inventory_within_capacity"
    CHECK (("bitumen_bbls" + "diluent_bbls") <= "total_storage_capacity_bbls");

-- Storage tanks: volume bounds
ALTER TABLE "storage_tanks"
  ADD CONSTRAINT "chk_tank_capacity_positive"
    CHECK ("max_capacity_bbls" > 0),
  ADD CONSTRAINT "chk_tank_volume_non_negative"
    CHECK ("current_volume_bbls" >= 0),
  ADD CONSTRAINT "chk_tank_volume_within_capacity"
    CHECK ("current_volume_bbls" <= "max_capacity_bbls");

-- Pipeline segments: flow cannot exceed max daily capacity
ALTER TABLE "pipeline_segments"
  ADD CONSTRAINT "chk_pipeline_capacity_positive"
    CHECK ("max_daily_capacity_bbls" > 0),
  ADD CONSTRAINT "chk_pipeline_flow_non_negative"
    CHECK ("current_flow_bbls_per_day" >= 0),
  ADD CONSTRAINT "chk_pipeline_flow_within_capacity"
    CHECK ("current_flow_bbls_per_day" <= "max_daily_capacity_bbls");

-- Blend batches: valid ratio range and positive volumes
ALTER TABLE "blend_batches"
  ADD CONSTRAINT "chk_blend_target_ratio_range"
    CHECK ("target_ratio" > 0 AND "target_ratio" < 1),
  ADD CONSTRAINT "chk_blend_bitumen_positive"
    CHECK ("bitumen_volume_bbls" > 0),
  ADD CONSTRAINT "chk_blend_required_diluent_non_negative"
    CHECK ("required_diluent_bbls" >= 0);

-- Shipments: positive volume
ALTER TABLE "shipments"
  ADD CONSTRAINT "chk_shipment_volume_positive"
    CHECK ("volume_bbls" > 0);

-- Reroute options: positive diverted volume
ALTER TABLE "reroute_options"
  ADD CONSTRAINT "chk_reroute_volume_positive"
    CHECK ("diverted_volume_bbls" > 0);

-- Prevent self-referencing pipeline adjacency
ALTER TABLE "pipeline_adjacency"
  ADD CONSTRAINT "chk_adjacency_not_self"
    CHECK ("primary_segment_id" <> "alternate_segment_id");

-- Prevent pipeline segment from connecting facility to itself
ALTER TABLE "pipeline_segments"
  ADD CONSTRAINT "chk_pipeline_not_self_loop"
    CHECK ("source_facility_id" <> "destination_facility_id");

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER: Enforce blend diluent formula consistency on insert/update
-- Required Diluent = (target_ratio × bitumen_volume) / (1 - target_ratio)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION validate_blend_diluent_formula()
RETURNS TRIGGER AS $$
DECLARE
  computed_diluent DECIMAL(18,2);
  computed_total   DECIMAL(18,2);
BEGIN
  computed_diluent := ROUND(
    (NEW."target_ratio" * NEW."bitumen_volume_bbls") / (1 - NEW."target_ratio"),
    2
  );
  computed_total := NEW."bitumen_volume_bbls" + computed_diluent;

  IF ABS(NEW."required_diluent_bbls" - computed_diluent) > 0.01 THEN
    RAISE EXCEPTION 'required_diluent_bbls (%) does not match formula result (%)',
      NEW."required_diluent_bbls", computed_diluent;
  END IF;

  IF ABS(NEW."total_blended_volume_bbls" - computed_total) > 0.01 THEN
    RAISE EXCEPTION 'total_blended_volume_bbls (%) does not match bitumen + diluent (%)',
      NEW."total_blended_volume_bbls", computed_total;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_blend_formula
  BEFORE INSERT OR UPDATE ON "blend_batches"
  FOR EACH ROW EXECUTE FUNCTION validate_blend_diluent_formula();

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER: Block pipeline flow updates that would exceed capacity
-- (belt-and-suspenders with CHECK constraint)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION validate_pipeline_flow_capacity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."current_flow_bbls_per_day" > NEW."max_daily_capacity_bbls" THEN
    RAISE EXCEPTION 'Pipeline flow (%) exceeds max daily capacity (%)',
      NEW."current_flow_bbls_per_day", NEW."max_daily_capacity_bbls";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_pipeline_flow
  BEFORE INSERT OR UPDATE ON "pipeline_segments"
  FOR EACH ROW EXECUTE FUNCTION validate_pipeline_flow_capacity();
