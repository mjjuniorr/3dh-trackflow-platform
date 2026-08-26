ALTER TABLE "delivery_records"
  ADD COLUMN "bling_validation_status" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "bling_document_type" TEXT,
  ADD COLUMN "bling_issue_date" TIMESTAMP(3),
  ADD COLUMN "bling_validated_at" TIMESTAMP(3),
  ADD COLUMN "bling_error" TEXT;

CREATE INDEX "delivery_records_bling_validation_status_idx" ON "delivery_records"("bling_validation_status");
