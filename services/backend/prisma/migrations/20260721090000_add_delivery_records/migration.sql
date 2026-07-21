CREATE TABLE "delivery_records" (
  "id" TEXT NOT NULL,
  "invoice_number" TEXT NOT NULL,
  "delivery_person_id" TEXT NOT NULL,
  "created_by_user_id" TEXT NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cancelled_at" TIMESTAMP(3),
  "cancelled_by_user_id" TEXT,

  CONSTRAINT "delivery_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "delivery_records_invoice_number_key" ON "delivery_records"("invoice_number");
CREATE INDEX "delivery_records_created_at_idx" ON "delivery_records"("created_at");
CREATE INDEX "delivery_records_delivery_person_id_created_at_idx" ON "delivery_records"("delivery_person_id", "created_at");

ALTER TABLE "delivery_records"
  ADD CONSTRAINT "delivery_records_delivery_person_id_fkey"
  FOREIGN KEY ("delivery_person_id") REFERENCES "delivery_people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "delivery_records"
  ADD CONSTRAINT "delivery_records_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "delivery_records"
  ADD CONSTRAINT "delivery_records_cancelled_by_user_id_fkey"
  FOREIGN KEY ("cancelled_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
