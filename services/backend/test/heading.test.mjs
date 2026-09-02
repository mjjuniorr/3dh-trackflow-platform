import assert from "node:assert/strict";
import { resolveStableHeading } from "../dist/src/heading.js";

function test(name, run) {
  run();
  console.log(`ok - ${name}`);
}

test("keeps the previous heading when the device is almost stopped", () => {
    const heading = resolveStableHeading({
      incomingHeading: 12,
      speed: 0.7,
      previous: { lat: -3.0463, lng: -60.0142, heading: 245 },
      current: { lat: -3.0463001, lng: -60.0142001 }
    });

    assert.equal(heading, 245);
});

test("uses the incoming GNSS heading when speed is reliable", () => {
    const heading = resolveStableHeading({
      incomingHeading: 725,
      speed: 12,
      previous: { lat: -3.0463, lng: -60.0142, heading: 245 },
      current: { lat: -3.0462, lng: -60.0142 }
    });

    assert.equal(heading, 5);
});

test("calculates bearing from movement when incoming heading is missing", () => {
    const heading = resolveStableHeading({
      speed: 10,
      previous: { lat: -3.0463, lng: -60.0142, heading: 245 },
      current: { lat: -3.0463, lng: -60.0138 }
    });

    assert.equal(heading, 90);
});

test("falls back to previous heading when movement is too small", () => {
    const heading = resolveStableHeading({
      speed: 8,
      previous: { lat: -3.0463, lng: -60.0142, heading: 180 },
      current: { lat: -3.04630001, lng: -60.01420001 }
    });

    assert.equal(heading, 180);
});

console.log("heading tests passed");
