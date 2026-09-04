# Android Monitor + Notification Center Implementation Plan

Date: 2026-09-03

## Phase 1 - Server notification core

1. Add Prisma models for persisted notifications and per-user read receipts.
2. Add migration and indexes.
3. Create notification service with transition deduplication.
4. Reuse current `computeStatus` thresholds.
5. Detect recovery during incoming telemetry.
6. Add periodic offline monitor started by server.
7. Add REST endpoints and Socket.IO events.
8. Add backend tests for transition/deduplication behavior.

## Phase 2 - Android Monitor module

1. Add `:monitor` to the existing Android Gradle root.
2. Use Kotlin + Jetpack Compose.
3. Add authenticated REST client and Socket.IO client.
4. Implement full-screen native map.
5. Render vehicle markers from TrackFlow vehicle type/heading/status.
6. Fit bounds once on initial data only.
7. Add local DataStore visibility preferences by delivery-person ID.
8. Add floating settings/overflow control and visibility sheet.
9. Add floating notification bell with unread badge.
10. Add notification list and read/read-all actions.

## Phase 3 - Validation

1. Backend typecheck/build and notification tests.
2. Prisma migration validation.
3. Build courier `:app` to ensure no regression.
4. Build new `:monitor` APK.
5. Test two monitor users to confirm read state is independent.
6. Simulate device silence >5 minutes and confirm one offline event.
7. Restore telemetry and confirm one recovery event.
8. Verify movement remains realtime while map camera remains user-controlled.
