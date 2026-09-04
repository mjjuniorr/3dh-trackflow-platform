# Battery Telemetry and Alerts Design

Date: 2026-09-04

## Objective

Replace the GPS board's placeholder `battery: 100` with a calibrated estimate
of the 18650 state of charge, then create operational low-battery alerts in
the existing TrackFlow Notification Center.

The change applies to the LILYGO TTGO T-SIM A7670SA board. It preserves the
existing telemetry endpoint, Android courier app, public tracking, Kafka,
Redis, PostgreSQL, OIDC, and technical mobile authentication.

## Hardware Fact

The board exposes battery voltage to the ESP32 ADC at GPIO35. It does not
provide a ready-made, calibrated percentage or a verified charging-state
signal. The firmware must derive an estimate from measured voltage and must
not present USB-powered voltage as a reliable charging percentage.

## Scope

### Firmware

1. Add a dedicated battery module under `firmware/gps-board/lib`.
2. Sample GPIO35 repeatedly, discard unstable readings, and use a filtered
   value rather than a single ADC sample.
3. Convert the ADC reading to battery voltage using a configurable local
   calibration factor.
4. Convert voltage to an integer 0-100 percentage through a Li-ion discharge
   curve, clamped to valid telemetry limits.
5. Send the calculated percentage in the existing `battery` field only when
   the firmware has a valid calibrated reading.
6. Emit serial diagnostics with raw ADC data, calculated voltage, percentage,
   and calibration state. Diagnostics must never print connectivity
   credentials, mobile-registration secrets, or device credentials.
7. Keep the current Wi-Fi -> 4G -> open Wi-Fi fallback and real GNSS behavior.

### Server Notifications

1. Extend the persisted Notification Center with
   `DEVICE_LOW_BATTERY`, `DEVICE_BATTERY_CRITICAL`, and
   `DEVICE_BATTERY_RECOVERED`.
2. Evaluate battery events only for telemetry that includes a validated battery
   percentage.
3. Generate one low-battery notification at or below 20%.
4. Generate one critical notification at or below 10%.
5. Resolve active low/critical battery alerts only after a reading at or above
   30%, creating one recovery notification.
6. Use unresolved notification records as persisted transition state so a
   restart or a second backend replica cannot repeat the same alert.
7. Reuse the current authenticated Notification API and Socket.IO events. No
   public tracking token or mobile registration secret can read notifications.

## Why the Thresholds Use Hysteresis

The 20% alert, 10% critical alert, and 30% recovery threshold avoid a device
near the boundary repeatedly opening and resolving alerts as the modem's 4G
transmit bursts temporarily lower battery voltage. A critical event can be
created after a low event, but neither may repeat while unresolved.

## Calibration Procedure

The percentage is not production-valid until this procedure is completed on
the physical board and battery pack:

1. Flash diagnostic firmware with battery alerts disabled.
2. Record filtered GPIO35 readings and an independent multimeter measurement
   at high, medium, and low battery charge while the board is operating.
3. Derive and store the board-specific ADC calibration factor in the ignored
   local `include/secrets.h` file, not in Git.
4. Compare calculated voltage against the multimeter at all three points.
5. Enable battery percentage telemetry only after maximum voltage error is
   confirmed at 0.10 V or less.
6. Test the 20%, 10%, and 30% notification transitions with controlled
   telemetry before enabling production alerts.

The ongoing endurance test is useful evidence but cannot calibrate a percentage
by duration alone. Its record must include start time, end time, network mode,
reporting interval, GNSS availability, battery model/capacity, and any resets
or reconnects.

## Data Flow

```text
18650 battery
  -> GPIO35 ADC samples
  -> calibrated voltage and Li-ion curve in firmware
  -> HTTPS POST /api/mobile/telemetry with battery 0..100
  -> LocationEvent.battery in PostgreSQL
  -> battery transition evaluator
  -> notifications and notification_reads
  -> authenticated dashboard/monitor Socket.IO clients
```

## Safety and Failure Handling

- An uncalibrated, missing, or invalid ADC result must not become a false
  percentage or a battery alert.
- USB-connected readings are diagnostic only until charge-state behavior has
  been electrically validated.
- A failed telemetry POST must not cause a false recovery event.
- No alert may alter device status, delivery records, public sessions, or
  tracking data.
- The first implementation does not add deep sleep or a persistent telemetry
  queue; these remain the next energy-optimization phase after battery
  telemetry is trustworthy.

## Tests and Acceptance

Firmware tests:

1. Filtered ADC readings reject invalid extremes.
2. Voltage conversion uses the configured calibration factor.
3. Li-ion voltage boundaries clamp to 0 and 100 percent.
4. Payload omits or safely handles battery when calibration is unavailable.
5. Existing payload, GNSS, Wi-Fi, and cellular transport tests continue to
   pass.

Backend tests:

1. 21% creates no battery alert.
2. 20% creates one low-battery alert.
3. Repeated readings below 20% do not duplicate it.
4. 10% creates one critical alert.
5. Repeated readings below 10% do not duplicate it.
6. A reading below 30% does not resolve an active alert.
7. A reading at or above 30% resolves active battery alerts and creates one
   recovery event.
8. Notification reads remain isolated by authenticated user.

Field acceptance:

1. Calculated voltage agrees with a multimeter within 0.10 V at three charge
   levels.
2. Dashboard displays the last real percentage without reporting 100% after
   the battery has discharged.
3. The monitor receives low, critical, and recovery events exactly once per
   transition.
4. Wi-Fi and 4G field telemetry continue working after the firmware update.

## Deployment Order

1. Add firmware diagnostics and backend support behind battery-alert feature
   configuration.
2. Build and test locally.
3. Flash one physical board and complete calibration.
4. Apply the database migration before the backend image is deployed.
5. Deploy backend and verify Notification API and Socket.IO.
6. Enable battery alerts only after calibration and controlled transition
   tests pass.
