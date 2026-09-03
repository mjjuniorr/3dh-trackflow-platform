# Multi-Board Firmware Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize TrackFlow firmware so each tracker board owns an independent firmware project, preserving the existing LILYGO implementation and reserving an independent ZX908 project boundary.

**Architecture:** Move the existing `firmware/gps-board` tree unchanged to `firmware/lilygo-a7670sa`, document the one-board/one-firmware rule at `firmware/README.md`, and add a ZX908 project README without introducing unverified production firmware. All boards continue targeting the existing HTTPS telemetry contract.

**Tech Stack:** Git repository layout, PlatformIO/Arduino C++ for LILYGO, QuecPython planned for ZX908 after hardware verification.

**Spec:** `docs/superpowers/specs/2026-09-03-multi-board-firmware-architecture-design.md`

## Global Constraints

- One hardware model owns one independent firmware project.
- Do not share runtime embedded source code between board firmware projects.
- Do not change the backend schema or telemetry fields in this change.
- Preserve the LILYGO firmware blobs exactly during relocation.
- Do not claim ZX908 production compatibility until the physical modem variant is verified.
- Do not commit real secrets.

---

### Task 1: Relocate the existing LILYGO firmware

**Files:**
- Move: `firmware/gps-board/**` -> `firmware/lilygo-a7670sa/**`

**Interfaces:**
- Consumes: existing PlatformIO project and its tests.
- Produces: the same project at a hardware-specific path with identical blobs.

- [ ] **Step 1: Record the existing tree**

Verify the current `firmware/gps-board` tree SHA and all blob SHAs.

- [ ] **Step 2: Create the relocated tree without changing blobs**

Create `firmware/lilygo-a7670sa` using the existing `gps-board` tree object, and delete `firmware/gps-board` from the new Git tree.

- [ ] **Step 3: Verify relocation**

Compare the source tree SHA/content so the relocated firmware is byte-for-byte equivalent to the previous project.

- [ ] **Step 4: Commit**

Commit as `refactor: give lilygo firmware a board-specific path`.

### Task 2: Document the multi-board firmware boundary

**Files:**
- Create: `firmware/README.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: approved architecture spec.
- Produces: repository guidance for adding future firmware families.

- [ ] **Step 1: Add firmware-level documentation**

Document `lilygo-a7670sa`, `zx908`, the independence rule, the shared telemetry API endpoint, and the rule for future boards.

- [ ] **Step 2: Update root repository map**

Replace the generic `firmware/gps-board` reference with the board-specific firmware structure.

- [ ] **Step 3: Verify documentation paths**

Search the default branch content changed in this branch for stale `firmware/gps-board` references in documentation that should now point to `firmware/lilygo-a7670sa`.

- [ ] **Step 4: Commit**

Commit as `docs: document independent board firmware projects`.

### Task 3: Establish the ZX908 project boundary

**Files:**
- Create: `firmware/zx908/README.md`

**Interfaces:**
- Consumes: current TrackFlow HTTPS telemetry contract.
- Produces: an independent ZX908 firmware project boundary ready for hardware-specific code after modem verification.

- [ ] **Step 1: Document the ZX908 target**

State that QuecPython is preferred only after confirming the purchased board/module variant and expose the expected telemetry endpoint and fields.

- [ ] **Step 2: Document first hardware validation**

Require identification of the Quectel module, QuecPython support, GNSS API, Wi-Fi capability, LTE/APN behavior, IMEI access, battery API, and flashing/debug interface before production code is added.

- [ ] **Step 3: Verify no cross-firmware dependency**

Confirm the ZX908 README does not instruct importing or linking LILYGO source.

- [ ] **Step 4: Commit**

Commit as `docs: establish zx908 firmware project boundary`.

### Task 4: Repository-level verification

**Files:**
- Verify only; no production changes expected.

**Interfaces:**
- Consumes: Tasks 1-3.
- Produces: evidence that the branch matches the approved architecture.

- [ ] **Step 1: Compare branch against main**

Expected: LILYGO firmware appears as a pure rename/move in content, plus documentation/spec/plan and ZX908 README.

- [ ] **Step 2: Check LILYGO source integrity**

Verify representative source/test blob SHAs are unchanged after relocation.

- [ ] **Step 3: Check root structure**

Confirm `firmware/lilygo-a7670sa`, `firmware/zx908`, and `firmware/README.md` exist and `firmware/gps-board` no longer exists on the branch.

- [ ] **Step 4: Review diff for scope**

Confirm there are no backend, web, Android, database, or deployment behavior changes in this architecture branch.
