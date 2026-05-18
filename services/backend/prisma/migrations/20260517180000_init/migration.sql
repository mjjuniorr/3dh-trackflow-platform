CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'employee',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_people" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "device_id" TEXT NOT NULL,
  "phone" TEXT,
  "status" TEXT NOT NULL DEFAULT 'offline',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "delivery_people_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "location_events" (
  "id" TEXT NOT NULL,
  "device_id" TEXT NOT NULL,
  "lat" DOUBLE PRECISION NOT NULL,
  "lng" DOUBLE PRECISION NOT NULL,
  "speed" DOUBLE PRECISION NOT NULL,
  "heading" DOUBLE PRECISION,
  "battery" INTEGER,
  "accuracy" DOUBLE PRECISION,
  "timestamp" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "location_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tracking_sessions" (
  "id" TEXT NOT NULL,
  "public_token" TEXT NOT NULL,
  "delivery_person_id" TEXT NOT NULL,
  "created_by_user_id" TEXT NOT NULL,
  "title" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" TIMESTAMP(3),
  CONSTRAINT "tracking_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "delivery_people_device_id_key" ON "delivery_people"("device_id");
CREATE INDEX "location_events_device_id_timestamp_idx" ON "location_events"("device_id", "timestamp");
CREATE UNIQUE INDEX "tracking_sessions_public_token_key" ON "tracking_sessions"("public_token");
CREATE INDEX "tracking_sessions_public_token_status_expires_at_idx" ON "tracking_sessions"("public_token", "status", "expires_at");
CREATE INDEX "tracking_sessions_delivery_person_id_status_idx" ON "tracking_sessions"("delivery_person_id", "status");

ALTER TABLE "tracking_sessions"
  ADD CONSTRAINT "tracking_sessions_delivery_person_id_fkey"
  FOREIGN KEY ("delivery_person_id") REFERENCES "delivery_people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tracking_sessions"
  ADD CONSTRAINT "tracking_sessions_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
