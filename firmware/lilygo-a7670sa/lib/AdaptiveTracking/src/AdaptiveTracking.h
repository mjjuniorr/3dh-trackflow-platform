#pragma once

#include <cstdint>

enum class TrackingState {
  Moving,
  Idle,
  Parked
};

struct TrackingPoint {
  double lat;
  double lng;
  double speedKmh;
  int heading;
};

struct AdaptiveTrackingConfig {
  double movingSpeedKmh = 5.0;
  double movementSampleDistanceMeters = 25.0;
  double sendDistanceMeters = 50.0;
  int sendHeadingDeltaDegrees = 30;
  double sendSpeedDeltaKmh = 10.0;
  uint32_t movingSendIntervalMs = 15000;
  uint32_t idleSendIntervalMs = 60000;
  uint32_t parkedSendIntervalMs = 300000;
  uint32_t parkedAfterMs = 300000;
};

struct TrackingDecision {
  TrackingState state;
  bool shouldSend;
  double distanceFromLastTelemetryMeters;
  int headingDeltaDegrees;
  double speedDeltaKmh;
};

class AdaptiveTracker {
 public:
  explicit AdaptiveTracker(const AdaptiveTrackingConfig &config = AdaptiveTrackingConfig{});

  TrackingDecision evaluate(const TrackingPoint &point, uint32_t nowMs);
  void markTelemetryAccepted(const TrackingPoint &point, uint32_t nowMs);
  TrackingState state() const;
  bool hasTelemetryReference() const;

 private:
  AdaptiveTrackingConfig config_;
  TrackingState state_ = TrackingState::Idle;
  bool hasPreviousSample_ = false;
  bool hasLastTelemetry_ = false;
  bool stationaryTimerActive_ = false;
  TrackingPoint previousSample_{};
  TrackingPoint lastTelemetry_{};
  uint32_t stationarySinceMs_ = 0;
  uint32_t lastTelemetryAtMs_ = 0;
};

double trackingDistanceMeters(const TrackingPoint &a, const TrackingPoint &b);
int trackingHeadingDeltaDegrees(int a, int b);
const char *trackingStateName(TrackingState state);

class RetryBackoff {
 public:
  bool canAttempt(uint32_t nowMs) const;
  uint32_t recordFailure(uint32_t nowMs);
  void recordSuccess();
  uint8_t failureCount() const;
  uint32_t nextAttemptAtMs() const;

 private:
  uint8_t failures_ = 0;
  uint32_t nextAttemptAtMs_ = 0;
};
