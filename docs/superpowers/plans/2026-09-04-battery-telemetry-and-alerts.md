# Battery Telemetry and Alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Measure calibrated battery charge on the A7670SA GPS board and generate deduplicated low-battery notifications in TrackFlow.

**Architecture:** The board samples GPIO35, filters ADC millivolts, and converts a calibrated voltage to an optional 0-100 Li-ion estimate. The existing telemetry path persists this value. A server-side battery evaluator uses persisted unresolved notifications, partial unique indexes, and hysteresis to create low, critical, and recovery events without duplicates.

**Tech Stack:** PlatformIO/Arduino ESP32, C++ Unity tests, Express 5, TypeScript, Prisma/PostgreSQL, Socket.IO, Zod.

**Spec:** `docs/superpowers/specs/2026-09-04-battery-telemetry-and-alerts-design.md`

## Global Constraints

- Start from current `main` commit `c26cc892780dcb1d6b9832c37594e3cc5000fde9`.
- Do not merge `feature/lilygo-adaptive-tracking-v2` or `feature/multi-board-firmware-architecture`.
- Preserve the field-tested Wi-Fi/4G/GNSS behavior when porting it from the local validated baseline; never copy local `secrets.h`, APN credentials, tokens, or device-specific settings.
- The diagnostic firmware must omit `battery` from telemetry until its calibration factor is valid; it must never send a guessed percentage.
- Thresholds are fixed for this release: warning at 20%, critical at 10%, recovery at 30%.
- Notification access remains protected by `trackflow:view`; public tracking and technical credentials cannot access notification APIs.
- Do not apply database migrations, deploy the backend, or flash the physical board until the relevant build/test checkpoint has passed and the user authorizes that operation.

---

## File Structure

- Create: `firmware/gps-board/lib/BatteryTelemetry/src/BatteryTelemetry.h` - pure, testable battery filtering, voltage conversion, and Li-ion curve.
- Create: `firmware/gps-board/lib/BatteryTelemetry/src/BatteryTelemetry.cpp` - implementation without Arduino dependencies.
- Create: `firmware/gps-board/test/test_battery_telemetry/test_main.cpp` - native Unity coverage.
- Modify: `firmware/gps-board/src/main.cpp` - GPIO35 adapter, serial diagnostics, conditional telemetry value.
- Modify: `firmware/gps-board/lib/TrackFlowPayload/src/TrackFlowPayload.h` and `.cpp` - optional battery JSON property.
- Modify: `firmware/gps-board/include/secrets.example.h` - placeholder calibration setting only.
- Modify: `firmware/gps-board/README.md` and `docs/requirements-gps-board.md` - calibration and diagnostic instructions.
- Create: `services/backend/src/battery-notification.ts` - pure threshold decision and persisted-event orchestration.
- Create: `services/backend/test/battery-notification-transition.test.mjs` - threshold and hysteresis coverage.
- Modify: `services/backend/src/notification-transition.ts` - extend notification type union only.
- Modify: `services/backend/src/notifications.ts` - alert copy and safe resolution helpers.
- Modify: `services/backend/src/location-store.ts` - evaluate valid battery telemetry after the location event is stored.
- Modify: `services/backend/prisma/schema.prisma` - declare supported notification types in comments/types without changing public data contracts.
- Create: `services/backend/prisma/migrations/<timestamp>_add_battery_notification_guards/migration.sql` - partial unique indexes for active low and critical battery notifications.
- Modify: `services/backend/package.json` - add `test:battery-notifications`.
- Modify: `docs/HANDOFF.md`, `docs/current-state.md`, and `docs/requirements-gps-board.md` - record calibration status and deployment sequence.

### Task 1: Establish the Safe Firmware Baseline

**Files:**
- Modify: `firmware/gps-board/src/main.cpp`
- Create: `firmware/gps-board/lib/TransportPriority/src/TransportPriority.h`
- Create: `firmware/gps-board/lib/TransportPriority/src/TransportPriority.cpp`
- Create: `firmware/gps-board/test/test_transport_priority/test_main.cpp`
- Modify: `firmware/gps-board/include/secrets.example.h`

**Interfaces:**
- Consumes: current main firmware and the local, field-tested Wi-Fi -> 4G -> open Wi-Fi implementation.
- Produces: a main-based firmware branch with the validated fallback behavior and no local credential material.

- [ ] **Step 1: Create an isolated branch from current main**

Run:
```powershell
git fetch origin
git worktree add ..\trackflow-battery -b feat/battery-telemetry-alerts origin/main
```

Expected: a clean worktree based on `c26cc89`.

- [ ] **Step 2: Compare only validated transport files**

Run:
```powershell
git diff origin/main 1052822 -- firmware/gps-board/src/main.cpp firmware/gps-board/lib/TransportPriority firmware/gps-board/test/test_transport_priority
```

Expected: transport-only changes are identified; no `secrets.h`, documentation, APN value, token, or device identifier is copied.

- [ ] **Step 3: Port the transport code and write the transport test**

Use the existing transport order contract:
```cpp
enum class Transport { SavedWifi, Cellular, OpenWifi, None };
Transport chooseNextTransport(bool savedWifiTried, bool cellularTried, bool openWifiTried);
```

Test:
```cpp
TEST_ASSERT_EQUAL(static_cast<int>(Transport::SavedWifi),
                  static_cast<int>(chooseNextTransport(false, false, false)));
TEST_ASSERT_EQUAL(static_cast<int>(Transport::Cellular),
                  static_cast<int>(chooseNextTransport(true, false, false)));
```

- [ ] **Step 4: Build before battery work**

Run:
```powershell
C:\Users\mjjun\.platformio\python3\Scripts\pio.exe run -e lilygo_a7670sa_wifi
```

Expected: `SUCCESS`.

- [ ] **Step 5: Commit the isolated baseline**

```powershell
git add firmware/gps-board
git commit -m "feat: preserve validated A7670SA 4G fallback"
```

### Task 2: Add Calibrated Battery Telemetry

**Files:**
- Create: `firmware/gps-board/lib/BatteryTelemetry/src/BatteryTelemetry.h`
- Create: `firmware/gps-board/lib/BatteryTelemetry/src/BatteryTelemetry.cpp`
- Create: `firmware/gps-board/test/test_battery_telemetry/test_main.cpp`
- Modify: `firmware/gps-board/src/main.cpp`
- Modify: `firmware/gps-board/lib/TrackFlowPayload/src/TrackFlowPayload.h`
- Modify: `firmware/gps-board/lib/TrackFlowPayload/src/TrackFlowPayload.cpp`
- Modify: `firmware/gps-board/include/secrets.example.h`

**Interfaces:**
- Produces:
```cpp
struct BatteryReading {
  bool calibrated;
  int filteredAdcMillivolts;
  float batteryVolts;
  int percentage;
};
int filteredMillivolts(const int* samples, size_t count);
int liIonPercentage(float volts);
BatteryReading makeBatteryReading(const int* samples, size_t count, float multiplier);
```
- Consumed by: `main.cpp`, which calls `analogReadMilliVolts(35)` for 15 samples.

- [ ] **Step 1: Write native Unity tests before implementation**

```cpp
void test_curve_clamps_and_interpolates() {
  TEST_ASSERT_EQUAL(0, liIonPercentage(3.30F));
  TEST_ASSERT_EQUAL(100, liIonPercentage(4.20F));
  TEST_ASSERT_GREATER_THAN(20, liIonPercentage(3.85F));
}
void test_unconfigured_multiplier_is_not_calibrated() {
  const int samples[] = {1800, 1801, 1802, 1800, 1801};
  TEST_ASSERT_FALSE(makeBatteryReading(samples, 5, 0.0F).calibrated);
}
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:
```powershell
C:\Users\mjjun\.platformio\python3\Scripts\pio.exe test -e native -f test_battery_telemetry
```

Expected: failure because the battery module does not exist.

- [ ] **Step 3: Implement a filtered, calibrated voltage reading**

Use the middle 11 values of 15 sorted samples. Use this Li-ion table and linear interpolation:
```cpp
{3.30F, 0}, {3.50F, 5}, {3.60F, 10}, {3.70F, 20},
{3.75F, 30}, {3.80F, 45}, {3.85F, 60}, {3.90F, 75},
{4.00F, 90}, {4.10F, 97}, {4.20F, 100}
```

The conversion is:
```cpp
batteryVolts = (filteredAdcMillivolts / 1000.0F) * multiplier;
```

Accept calibration only when the local multiplier is greater than `1.0F` and the result is between 3.0 V and 4.35 V.

- [ ] **Step 4: Make the payload battery property conditional**

Replace the unconditional integer contract with:
```cpp
bool hasBattery;
int battery;
```

The JSON builder emits `"battery":<value>` only when `hasBattery` is true. Existing valid battery payload tests must keep passing.

- [ ] **Step 5: Add hardware adapter and serial diagnostics**

In `main.cpp`:
```cpp
constexpr int BATTERY_ADC_PIN = 35;
constexpr size_t BATTERY_SAMPLE_COUNT = 15;
float batteryMultiplier = TRACKFLOW_BATTERY_VOLTAGE_MULTIPLIER;
```

Read samples with `analogReadMilliVolts(BATTERY_ADC_PIN)`, print only:
```text
Battery ADC=<mV> voltage=<V> percent=<P|uncalibrated>
```

Default `TRACKFLOW_BATTERY_VOLTAGE_MULTIPLIER` to `0.0F`. The example secrets file contains `0.0F`, not a board value.

- [ ] **Step 6: Run firmware tests and compilation**

Run:
```powershell
C:\Users\mjjun\.platformio\python3\Scripts\pio.exe test -e native -f test_battery_telemetry
C:\Users\mjjun\.platformio\python3\Scripts\pio.exe test -e native -f test_payload
C:\Users\mjjun\.platformio\python3\Scripts\pio.exe run -e lilygo_a7670sa_wifi
```

Expected: all pass.

- [ ] **Step 7: Flash only the diagnostic firmware after user confirmation**

Run:
```powershell
C:\Users\mjjun\.platformio\python3\Scripts\pio.exe run -e lilygo_a7670sa_wifi -t upload
C:\Users\mjjun\.platformio\python3\Scripts\pio.exe device monitor -p COM8 -b 115200
```

Expected: 4G telemetry remains accepted and serial output reports ADC data without a percentage until calibration is configured.

- [ ] **Step 8: Commit firmware telemetry**

```powershell
git add firmware/gps-board
git commit -m "feat: add calibrated battery telemetry diagnostics"
```

### Task 3: Add Battery Notification Transitions

**Files:**
- Create: `services/backend/src/battery-notification.ts`
- Create: `services/backend/test/battery-notification-transition.test.mjs`
- Modify: `services/backend/src/notification-transition.ts`
- Modify: `services/backend/src/notifications.ts`
- Modify: `services/backend/src/location-store.ts`
- Modify: `services/backend/package.json`

**Interfaces:**
- Produces:
```ts
export type BatteryAlertAction = "low" | "critical" | "recover" | null;
export function batteryAlertAction(
  battery: number,
  lowActive: boolean,
  criticalActive: boolean
): BatteryAlertAction[];
export async function reconcileBatteryNotifications(
  io: Server,
  input: { deviceId: string; deliveryPersonId: string; deliveryPersonName: string; battery: number }
): Promise<void>;
```
- Consumes: a valid `LocationMessage.battery` in `saveLocation`.

- [ ] **Step 1: Write failing transition tests**

```js
assert.deepEqual(batteryAlertAction(21, false, false), []);
assert.deepEqual(batteryAlertAction(20, false, false), ["low"]);
assert.deepEqual(batteryAlertAction(10, true, false), ["critical"]);
assert.deepEqual(batteryAlertAction(29, true, true), []);
assert.deepEqual(batteryAlertAction(30, true, true), ["recover"]);
```

- [ ] **Step 2: Run and confirm failure**

Run:
```powershell
npm run build --workspace @3dh-trackflow/backend
node services/backend/test/battery-notification-transition.test.mjs
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement type-safe notification copy and state reconciliation**

Extend `DeviceNotificationType` with:
```ts
"DEVICE_LOW_BATTERY" | "DEVICE_BATTERY_CRITICAL" | "DEVICE_BATTERY_RECOVERED"
```

Use these messages:
```text
Baixa: "<nome> esta com bateria baixa" / "O dispositivo <id> esta em <percentual>%."
Critica: "<nome> esta com bateria critica" / "O dispositivo <id> esta em <percentual>%."
Recuperada: "<nome> voltou a ter bateria suficiente" / "O dispositivo <id> voltou para <percentual>%."
```

Only invoke reconciliation from `saveLocation` when `message.battery !== undefined`, `person` exists, and `io` exists.

- [ ] **Step 4: Protect against duplicate active events**

Create a Prisma migration containing:
```sql
CREATE UNIQUE INDEX "notifications_active_low_battery_unique"
ON "notifications" ("device_id", "type")
WHERE "type" = 'DEVICE_LOW_BATTERY' AND "resolved_at" IS NULL;

CREATE UNIQUE INDEX "notifications_active_critical_battery_unique"
ON "notifications" ("device_id", "type")
WHERE "type" = 'DEVICE_BATTERY_CRITICAL' AND "resolved_at" IS NULL;
```

When recovery is eligible, update both unresolved battery rows in one transaction. Create `DEVICE_BATTERY_RECOVERED` only when at least one row was resolved. Catch only the expected unique-index conflict on creation and treat it as an already-created alert.

- [ ] **Step 5: Run notification tests and typecheck**

Run:
```powershell
npm run typecheck --workspace @3dh-trackflow/backend
npm run test:notifications --workspace @3dh-trackflow/backend
node services/backend/test/battery-notification-transition.test.mjs
```

Expected: all pass.

- [ ] **Step 6: Commit notification logic**

```powershell
git add services/backend
git commit -m "feat: notify low battery transitions"
```

### Task 4: Document, Calibrate, and Validate on Hardware

**Files:**
- Modify: `firmware/gps-board/README.md`
- Modify: `docs/requirements-gps-board.md`
- Modify: `docs/HANDOFF.md`
- Modify: `docs/current-state.md`
- Create: `docs/battery-calibration-log.md`

**Interfaces:**
- Consumes: diagnostic serial readings from Task 2 and the firmware multiplier in ignored `include/secrets.h`.
- Produces: a recorded calibration factor and three multimeter comparison results.

- [ ] **Step 1: Create the calibration log template**

```markdown
| Charge point | Multimeter V | ADC mV | Multiplier | Calculated V | Error V | Network mode |
|---|---:|---:|---:|---:|---:|---|
| High | | | | | | |
| Medium | | | | | | |
| Low | | | | | | |
```

The template must not contain Wi-Fi, APN, tokens, device IDs, IMEI, or user secrets.

- [ ] **Step 2: Run the physical calibration**

At each charge point, keep the board operating on the same transport mode, record one serial sample set and one multimeter voltage, then adjust only the ignored local multiplier. Do not change the Li-ion table during field measurement.

- [ ] **Step 3: Enable percentage telemetry only after calibration**

Set the local multiplier only after all three points have at most 0.10 V error. Rebuild, flash, and verify that the dashboard battery value changes from its prior fixed value.

- [ ] **Step 4: Validate server behavior before production**

In a non-production environment send controlled valid telemetry at 21, 20, 10, 29, and 30 percent. Verify the notification API, unread count, and Socket.IO each produce exactly the actions defined in Task 3.

- [ ] **Step 5: Prepare production release without deploying**

Run:
```powershell
npm run prisma:generate --workspace @3dh-trackflow/backend
npm run typecheck --workspace @3dh-trackflow/backend
npm run test:notifications --workspace @3dh-trackflow/backend
C:\Users\mjjun\.platformio\python3\Scripts\pio.exe run -e lilygo_a7670sa_wifi
```

Document the migration name, immutable image tag, and required `BATTERY_ALERTS_ENABLED=false` default in the Portainer instructions. Do not apply the migration or deploy without explicit user authorization.

- [ ] **Step 6: Commit documentation**

```powershell
git add docs firmware/gps-board/README.md
git commit -m "docs: add battery calibration and alert validation"
```
