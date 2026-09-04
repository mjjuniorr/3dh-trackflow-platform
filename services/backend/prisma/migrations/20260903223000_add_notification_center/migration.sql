CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "device_id" TEXT NOT NULL,
  "delivery_person_id" TEXT,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'info',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_reads" (
  "notification_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notification_reads_pkey" PRIMARY KEY ("notification_id","user_id")
);

CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");
CREATE INDEX "notifications_device_id_type_created_at_idx" ON "notifications"("device_id", "type", "created_at");
CREATE INDEX "notifications_delivery_person_id_created_at_idx" ON "notifications"("delivery_person_id", "created_at");
CREATE INDEX "notification_reads_user_id_read_at_idx" ON "notification_reads"("user_id", "read_at");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_delivery_person_id_fkey"
  FOREIGN KEY ("delivery_person_id") REFERENCES "delivery_people"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notification_reads"
  ADD CONSTRAINT "notification_reads_notification_id_fkey"
  FOREIGN KEY ("notification_id") REFERENCES "notifications"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notification_reads"
  ADD CONSTRAINT "notification_reads_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
