# LILYGO A7670SA Adaptive Tracking v2

Date: 2026-09-03

## Baseline

Start from the field-validated A7670SA firmware synchronized in commit `f9719833` on `feature/multi-board-firmware-architecture`.

Do not change the backend/API contract and do not commit `secrets.h`.

## Scope

This phase optimizes firmware behavior only. It intentionally excludes deep sleep, PSM/eDRX, GNSS shutdown and battery-percentage calibration so the effect of scheduling/network changes can be measured separately.

## Adaptive profile

- GNSS sample cadence: 15 s.
- MOVING: send at most every 15 s, or on >= 50 m displacement, >= 30 degree heading change, or >= 10 km/h speed delta.
- IDLE: send every 60 s.
- PARKED: after 5 min stationary, send a heartbeat every 5 min.
- Movement inference: GNSS speed >= 5 km/h or >= 25 m sample displacement.
- OFFLINE retry: 15 s -> 30 s -> 60 s -> 2 min -> 5 min (cap).
- Persistent offline queue: 24 JSON telemetry records in ESP32 NVS; oldest record is discarded on overflow; drain at most 3 old records per cycle.
- Transport priority remains saved Wi-Fi -> 4G -> optional open Wi-Fi, but open Wi-Fi is disabled by default in v2.

## Validation

1. Run pure C++ tests for adaptive state, event triggers, heading wrap and retry backoff.
2. Run PlatformIO firmware build on the Windows workstation.
3. Flash the physical board and validate saved Wi-Fi and Vivo 4G HTTP 202.
4. Validate offline queue by removing coverage, creating queued telemetry, resetting the board, restoring coverage and confirming queued records drain.
5. Repeat the battery test using the same procedure as the ~2h48 v1 benchmark before claiming an autonomy improvement.
