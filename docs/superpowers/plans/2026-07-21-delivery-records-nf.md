# Delivery Records by Invoice Implementation Plan

Goal: add a homologation-first delivery counter where each completed store delivery is audited by one unique invoice number.

Architecture: add a small DeliveryRecord domain beside the existing tracking domain. The feature stores invoice launches in PostgreSQL, exposes protected API endpoints, and adds a compact dashboard panel without changing Android, Kafka, public tracking links, Socket.IO telemetry, or firmware.

Constraints:
- Invoice number is unique forever.
- New permission is trackflow:manage-deliveries.
- First deployment target is homologation.
- Preserve Android, Kafka, Redis, PostgreSQL volumes, public tracking, devices, routes, and telemetry.
- Wrong entries are cancelled logically, not physically deleted.

Tasks:
- Backend: model, migration, handlers, routes, permission, domain tests.
- Frontend: API types/client, delivery records panel, dashboard tab integration.
- Docs: current state, OIDC/Portal role list, handoff.
