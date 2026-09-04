# Firmware Consolidation Design

Date: 2026-09-04

## Goal

Consolidate only the field-validated A7670SA 4G transport into TrackFlow main, while preserving the current Android Monitor and Notification Center and keeping unvalidated firmware experiments isolated.

## Current Baseline

The target is current main at c26cc892780dcb1d6b9832c37594e3cc5000fde9. It already includes:

- the server-side offline/online Notification Center;
- the Android Monitor application;
- the existing firmware/gps-board Wi-Fi/GNSS baseline.

No production deployment, database migration, or physical-board update is part of this consolidation.

## Selected Source

The only source selected for this merge is the local field-tested commit:

~~~text
1052822 feat: add Vivo 4G fallback for GPS board
~~~

Only these implementation areas may be ported after review:

~~~text
firmware/gps-board/src/main.cpp
firmware/gps-board/lib/TransportPriority/
firmware/gps-board/test/test_transport_priority/
~~~

The desired resulting transport priority is:

~~~text
saved Wi-Fi -> 4G -> open Wi-Fi -> retry next telemetry cycle
~~~

The resulting source must use placeholders in every example file. Local secrets.h, the mobile registration secret, device identifiers, APN credentials, Wi-Fi credentials, tokens, IMEI, build directories, and IDE directories are excluded.

## Explicitly Excluded

Do not merge these branches into the consolidation branch:

~~~text
feature/lilygo-adaptive-tracking-v2
feature/multi-board-firmware-architecture
feature/android-monitor-notification-center
~~~

Reasons:

- the Android Monitor branch is already behind main;
- adaptive tracking v2 is not yet compiled, flashed, and field-validated;
- multi-board architecture is an unvalidated directory reorganization and changes the firmware ownership boundary;
- both firmware branches diverged before the current Monitor/Notification work and need a future rebase onto the consolidated base.

The existing local 4G commit must not be cherry-picked wholesale because it also contains documentation and examples that need secret-safe review. Port only the approved transport implementation paths.

## Implementation Branch

Create a clean worktree and branch named feat/firmware-4g-consolidation based on the current remote main. The worktree must be clean before any file is copied or edited.

## Conflict Rules

1. Keep all current main Android, backend, Prisma, frontend, and notification files unchanged.
2. Keep the firmware path as firmware/gps-board; do not rename it to firmware/lilygo-a7670sa in this change.
3. Copy the transport implementation manually after a file-by-file diff.
4. Preserve the already working GNSS, payload, and Wi-Fi routines.
5. Remove or replace every connection value in examples with a neutral placeholder before staging.
6. Do not stage include/secrets.h, .pio, .vscode, APKs, or files unrelated to the transport change.

## Validation

Before a consolidation pull request is created:

1. Run git diff --check.
2. Verify the staged paths contain no local secret file.
3. Run the PlatformIO build for lilygo_a7670sa_wifi.
4. Run native transport-priority tests.
5. Review the generated diff against main and confirm that backend, Android Monitor, notification, database, and public-tracking files are unchanged.
6. Do not flash the board until the build passes and the user confirms the physical update.

## Acceptance

The consolidation is accepted only when:

- the branch is based on current main;
- the 4G fallback compiles;
- all existing source examples are credential-free;
- the diff is restricted to firmware transport, its tests, and concise documentation;
- no experimental adaptive-tracking or multi-board code has been included;
- main is changed only through a reviewed pull request.