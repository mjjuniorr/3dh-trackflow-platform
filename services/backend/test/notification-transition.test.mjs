import assert from "node:assert/strict";
import { notificationForTransition } from "../dist/src/notification-transition.js";

assert.equal(notificationForTransition("online", "offline"), "DEVICE_OFFLINE");
assert.equal(notificationForTransition("sem sinal", "offline"), "DEVICE_OFFLINE");
assert.equal(notificationForTransition("offline", "offline"), null);
assert.equal(notificationForTransition("offline", "online"), "DEVICE_ONLINE");
assert.equal(notificationForTransition("sem sinal", "online"), null);
assert.equal(notificationForTransition("online", "sem sinal"), null);

console.log("notification transition tests passed");
