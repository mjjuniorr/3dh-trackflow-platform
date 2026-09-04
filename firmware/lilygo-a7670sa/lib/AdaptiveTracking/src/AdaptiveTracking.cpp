#include "AdaptiveTracking.h"

#include <algorithm>
#include <cmath>

namespace {
constexpr double EARTH_RADIUS_METERS = 6371000.0;
constexpr double DEG_TO_RAD = 3.14159265358979323846 / 180.0;
constexpr uint32_t RETRY_DELAYS_MS[] = {15000, 30000, 60000, 120000, 300000};

uint32_t elapsedMs(uint32_t nowMs, uint32_t thenMs) {
  return static_cast<uint32_t>(nowMs - thenMs);
}
}

double trackingDistanceMeters(const TrackingPoint &a, const TrackingPoint &b) {
  const double lat1 = a.lat * DEG_TO_RAD;
  const double lat2 = b.lat * DEG_TO_RAD;
  const double dLat = (b.lat - a.lat) * DEG_TO_RAD;
  const double dLng = (b.lng - a.lng) * DEG_TO_RAD;

  const double sinLat = std::sin(dLat / 2.0);
  const double sinLng = std::sin(dLng / 2.0);
  const double h = sinLat * sinLat + std::cos(lat1) * std::cos(lat2) * sinLng * sinLng;
  const double clamped = std::min(1.0, std::max(0.0, h));
  return EARTH_RADIUS_METERS * 2.0 * std::atan2(std::sqrt(clamped), std::sqrt(1.0 - clamped));
}

int trackingHeadingDeltaDegrees(int a, int b) {
  int first = a % 360;
  int second = b % 360;
  if (first < 0) first += 360;
  if (second < 0) second += 360;
  const int diff = std::abs(first - second);
  return std::min(diff, 360 - diff);
}

const char *trackingStateName(TrackingState state) {
  switch (state) {
    case TrackingState::Moving: return "MOVING";
    case TrackingState::Idle: return "IDLE";
    case TrackingState::Parked: return "PARKED";
  }
  return "UNKNOWN";
}

AdaptiveTracker::AdaptiveTracker(const AdaptiveTrackingConfig &config) : config_(config) {}

TrackingDecision AdaptiveTracker::evaluate(const TrackingPoint &point, uint32_t nowMs) {
  const double sampleDistance = hasPreviousSample_
    ? trackingDistanceMeters(previousSample_, point)
    : 0.0;

  const bool moving = point.speedKmh >= config_.movingSpeedKmh ||
    (hasPreviousSample_ && sampleDistance >= config_.movementSampleDistanceMeters);

  const TrackingState previousState = state_;
  if (moving) {
    state_ = TrackingState::Moving;
    stationaryTimerActive_ = false;
  } else {
    if (!stationaryTimerActive_) {
      stationaryTimerActive_ = true;
      stationarySinceMs_ = nowMs;
    }
    state_ = elapsedMs(nowMs, stationarySinceMs_) >= config_.parkedAfterMs
      ? TrackingState::Parked
      : TrackingState::Idle;
  }

  previousSample_ = point;
  hasPreviousSample_ = true;

  if (!hasLastTelemetry_) {
    return {state_, true, 0.0, 0, 0.0};
  }

  const uint32_t sinceLastTelemetry = elapsedMs(nowMs, lastTelemetryAtMs_);
  const double distance = trackingDistanceMeters(lastTelemetry_, point);
  const int headingDelta = trackingHeadingDeltaDegrees(lastTelemetry_.heading, point.heading);
  const double speedDelta = std::fabs(lastTelemetry_.speedKmh - point.speedKmh);
  const bool becameMoving = previousState != TrackingState::Moving && state_ == TrackingState::Moving;

  bool shouldSend = false;
  switch (state_) {
    case TrackingState::Moving:
      shouldSend = becameMoving ||
        sinceLastTelemetry >= config_.movingSendIntervalMs ||
        distance >= config_.sendDistanceMeters ||
        headingDelta >= config_.sendHeadingDeltaDegrees ||
        speedDelta >= config_.sendSpeedDeltaKmh;
      break;
    case TrackingState::Idle:
      shouldSend = sinceLastTelemetry >= config_.idleSendIntervalMs;
      break;
    case TrackingState::Parked:
      shouldSend = sinceLastTelemetry >= config_.parkedSendIntervalMs;
      break;
  }

  return {state_, shouldSend, distance, headingDelta, speedDelta};
}

void AdaptiveTracker::markTelemetryAccepted(const TrackingPoint &point, uint32_t nowMs) {
  lastTelemetry_ = point;
  lastTelemetryAtMs_ = nowMs;
  hasLastTelemetry_ = true;
}

TrackingState AdaptiveTracker::state() const {
  return state_;
}

bool AdaptiveTracker::hasTelemetryReference() const {
  return hasLastTelemetry_;
}

bool RetryBackoff::canAttempt(uint32_t nowMs) const {
  return failures_ == 0 || static_cast<int32_t>(nowMs - nextAttemptAtMs_) >= 0;
}

uint32_t RetryBackoff::recordFailure(uint32_t nowMs) {
  const size_t index = std::min<size_t>(failures_, (sizeof(RETRY_DELAYS_MS) / sizeof(RETRY_DELAYS_MS[0])) - 1);
  const uint32_t delayMs = RETRY_DELAYS_MS[index];
  if (failures_ < 255) failures_++;
  nextAttemptAtMs_ = nowMs + delayMs;
  return delayMs;
}

void RetryBackoff::recordSuccess() {
  failures_ = 0;
  nextAttemptAtMs_ = 0;
}

uint8_t RetryBackoff::failureCount() const {
  return failures_;
}

uint32_t RetryBackoff::nextAttemptAtMs() const {
  return nextAttemptAtMs_;
}
