# Multi-Board Firmware Architecture Design

## Goal

Evolve the 3DH TrackFlow Platform so it can support multiple tracker boards, with one independent firmware implementation per hardware model, without coupling board-specific code to the backend or to other firmware projects.

## Decision

Each hardware model owns its own firmware project and technology stack.

Examples:

```text
firmware/
  lilygo-a7670sa/
  zx908/
  <future-board>/
```

Firmware projects do not import runtime code from each other. A board may use Arduino/C++, ESP-IDF, QuecPython, MicroPython, or another stack appropriate to that hardware.

The shared boundary is the TrackFlow telemetry contract, not shared embedded source code.

## Current State

The repository currently contains `firmware/gps-board`, implemented for the LILYGO TTGO T-SIM A7670SA using PlatformIO/Arduino. It reads GNSS from the modem and sends telemetry to:

```http
POST /api/mobile/telemetry
X-Mobile-Registration-Secret: <secret>
Content-Type: application/json
```

The existing backend already persists telemetry and emits real-time updates to the dashboard and public tracking pages.

## Target Repository Layout

```text
firmware/
  README.md
  lilygo-a7670sa/
    README.md
    platformio.ini
    include/
    lib/
    src/
    test/
  zx908/
    README.md
    config.example.py
    main.py
    trackflow/
      device.py
      gnss.py
      network.py
      telemetry.py
      storage.py
    tests/
```

Future boards follow the same top-level rule: one directory per hardware model, but each directory may have its own internal layout according to its toolchain.

## Migration of the Existing Firmware

The current `firmware/gps-board` project will be moved/renamed to:

```text
firmware/lilygo-a7670sa
```

Its behavior must remain unchanged during the move. This is a repository-organization change, not a functional rewrite of the LILYGO firmware.

The existing LILYGO tests must continue to pass after relocation.

## TrackFlow Telemetry Contract

All tracker firmwares must be able to send the existing required telemetry payload:

```json
{
  "device_id": "zx908-868xxxxxxxxxxxx",
  "lat": -3.119,
  "lng": -60.0217,
  "speed": 42.6,
  "heading": 127,
  "battery": 86,
  "accuracy": 7.5,
  "timestamp": "2026-09-03T16:20:00-04:00"
}
```

Required fields remain:

- `device_id`
- `lat`
- `lng`
- `speed`
- `heading`
- `battery`
- `accuracy`
- `timestamp`

The first multi-board change must not require a backend schema migration.

Optional hardware metadata such as `hardware_model` and `firmware_version` may be introduced later through a separately designed backend-compatible change. They are intentionally excluded from this first step to avoid breaking the existing API contract.

## Firmware Independence Rule

Each board firmware is independently buildable, testable, flashable, and releasable.

A firmware project may not depend on source files from another board firmware. For example, ZX908 code must not include headers or source from `lilygo-a7670sa`.

Documentation may reference the common telemetry contract, but embedded implementation remains hardware-specific.

## LILYGO A7670SA

The LILYGO firmware remains the existing Arduino/PlatformIO implementation.

Responsibilities remain:

- initialize modem and board power;
- activate and read GNSS;
- derive or configure `device_id`;
- prefer configured Wi-Fi connectivity;
- post telemetry over HTTPS;
- preserve current diagnostic and test behavior.

No new LILYGO feature is required by this architecture change.

## ZX908

ZX908 will be added as a separate firmware project.

The preferred implementation stack is QuecPython when the purchased ZX908 hardware is confirmed to expose a supported Quectel module and firmware environment.

The ZX908 firmware will ultimately be responsible for:

1. identifying the device;
2. acquiring GNSS position;
3. reading speed and heading where available;
4. reading battery state where available;
5. connecting to the preferred network path;
6. sending the TrackFlow telemetry payload over HTTPS;
7. buffering telemetry locally when connectivity is unavailable;
8. retrying buffered records after connectivity returns.

The first ZX908 implementation should start with the smallest functional path: GNSS -> network -> TrackFlow API. Offline buffering and advanced power modes are subsequent tasks within the same firmware family, not prerequisites for the repository reorganization.

## Connectivity Policy

The platform does not force one connectivity implementation across boards.

For hardware that supports both Wi-Fi and LTE, the preferred policy is:

1. use the configured Wi-Fi network when available, including a vehicle Starlink network;
2. fall back to LTE when Wi-Fi is unavailable or has no usable internet route;
3. preserve telemetry locally if both paths fail;
4. resend buffered records after connectivity returns.

A board that only supports one transport may implement only that transport while still conforming to the TrackFlow telemetry API.

## Device Identity

Each firmware must produce a stable, globally unique `device_id`.

Recommended format:

```text
<hardware-family>-<stable-hardware-identifier>
```

Examples:

```text
lilygo-a7670sa-001
zx908-868123456789012
```

For ZX908, IMEI is the preferred hardware identifier when accessible and stable. A provisioned identifier may be used when IMEI is unavailable.

## Security

Tracker devices must send telemetry to TrackFlow through HTTPS.

Secrets must never be committed to the repository. Each firmware project must provide only example configuration files.

The existing `X-Mobile-Registration-Secret` authentication mechanism remains valid for the first multi-board implementation. Device-specific credentials can be designed later if required.

Production firmware should validate the server certificate. Insecure TLS modes are acceptable only for explicit bring-up/debug builds and must not become the production default.

## Testing Strategy

### Repository organization

Verify that:

- the LILYGO project builds from its new path;
- existing LILYGO unit tests still pass;
- repository documentation points to the new board-specific path.

### ZX908

ZX908 code should separate hardware access from payload construction and transport so that host-side unit tests can validate:

- payload formatting;
- device ID generation;
- network-selection decisions;
- retry/buffering logic when added.

Hardware-in-the-loop validation is required before declaring ZX908 production-ready because ZX908 products can ship with different Quectel modem variants.

## Non-Goals for This First Change

The first multi-board architecture change will not:

- rewrite the backend;
- expose Kafka directly to trackers;
- add device-specific API credentials;
- create a universal cross-board embedded library;
- add OTA firmware updates;
- add geofencing;
- add ignition detection;
- add advanced sleep modes;
- claim ZX908 compatibility before the physical hardware/modem variant is verified.

## Success Criteria

The architecture is considered established when:

1. the existing LILYGO firmware has a hardware-specific directory name and retains its behavior;
2. the repository documents the one-board/one-firmware rule;
3. a dedicated `firmware/zx908` project can be added without modifying LILYGO source code;
4. both firmware families target the same TrackFlow HTTPS telemetry contract;
5. adding a third board requires only a new firmware directory plus its own documentation and tests, unless that board reveals a genuine backend-contract requirement.
