#include <unity.h>
#include <AdaptiveTracking.h>

void test_first_fix_is_sent() {
  AdaptiveTracker tracker;
  const auto decision = tracker.evaluate({-3.1000, -60.0000, 0.0, 0}, 0);
  TEST_ASSERT_TRUE(decision.shouldSend);
  TEST_ASSERT_EQUAL_INT(static_cast<int>(TrackingState::Idle), static_cast<int>(decision.state));
}

void test_moving_sends_by_interval_distance_heading_or_speed_change() {
  AdaptiveTracker tracker;
  TrackingPoint start{-3.1000, -60.0000, 20.0, 0};
  tracker.evaluate(start, 0);
  tracker.markTelemetryAccepted(start, 0);

  auto decision = tracker.evaluate({-3.1000, -60.0000, 20.0, 0}, 14000);
  TEST_ASSERT_FALSE(decision.shouldSend);

  decision = tracker.evaluate({-3.1000, -60.0000, 20.0, 0}, 15000);
  TEST_ASSERT_TRUE(decision.shouldSend);

  tracker.markTelemetryAccepted({-3.1000, -60.0000, 20.0, 0}, 15000);
  decision = tracker.evaluate({-3.0994, -60.0000, 20.0, 0}, 16000);
  TEST_ASSERT_TRUE(decision.shouldSend);

  tracker.markTelemetryAccepted({-3.0994, -60.0000, 20.0, 0}, 16000);
  decision = tracker.evaluate({-3.0994, -60.0000, 20.0, 35}, 17000);
  TEST_ASSERT_TRUE(decision.shouldSend);

  tracker.markTelemetryAccepted({-3.0994, -60.0000, 20.0, 35}, 17000);
  decision = tracker.evaluate({-3.0994, -60.0000, 31.0, 35}, 18000);
  TEST_ASSERT_TRUE(decision.shouldSend);
}

void test_stationary_transitions_idle_then_parked() {
  AdaptiveTracker tracker;
  TrackingPoint point{-3.1000, -60.0000, 0.0, 0};
  auto decision = tracker.evaluate(point, 1000);
  tracker.markTelemetryAccepted(point, 1000);

  decision = tracker.evaluate(point, 61000);
  TEST_ASSERT_EQUAL_INT(static_cast<int>(TrackingState::Idle), static_cast<int>(decision.state));
  TEST_ASSERT_TRUE(decision.shouldSend);
  tracker.markTelemetryAccepted(point, 61000);

  decision = tracker.evaluate(point, 301000);
  TEST_ASSERT_EQUAL_INT(static_cast<int>(TrackingState::Parked), static_cast<int>(decision.state));
  TEST_ASSERT_FALSE(decision.shouldSend);

  decision = tracker.evaluate(point, 361000);
  TEST_ASSERT_EQUAL_INT(static_cast<int>(TrackingState::Parked), static_cast<int>(decision.state));
  TEST_ASSERT_TRUE(decision.shouldSend);
}

void test_heading_delta_wraps_across_north() {
  TEST_ASSERT_EQUAL_INT(20, trackingHeadingDeltaDegrees(350, 10));
}

void test_retry_backoff_progresses_and_caps_at_five_minutes() {
  RetryBackoff backoff;
  TEST_ASSERT_TRUE(backoff.canAttempt(0));
  TEST_ASSERT_EQUAL_UINT32(15000, backoff.recordFailure(1000));
  TEST_ASSERT_FALSE(backoff.canAttempt(15999));
  TEST_ASSERT_TRUE(backoff.canAttempt(16000));
  TEST_ASSERT_EQUAL_UINT32(30000, backoff.recordFailure(16000));
  TEST_ASSERT_EQUAL_UINT32(60000, backoff.recordFailure(46000));
  TEST_ASSERT_EQUAL_UINT32(120000, backoff.recordFailure(106000));
  TEST_ASSERT_EQUAL_UINT32(300000, backoff.recordFailure(226000));
  TEST_ASSERT_EQUAL_UINT32(300000, backoff.recordFailure(526000));
  backoff.recordSuccess();
  TEST_ASSERT_TRUE(backoff.canAttempt(526000));
  TEST_ASSERT_EQUAL_UINT8(0, backoff.failureCount());
}

int main(int argc, char **argv) {
  UNITY_BEGIN();
  RUN_TEST(test_first_fix_is_sent);
  RUN_TEST(test_moving_sends_by_interval_distance_heading_or_speed_change);
  RUN_TEST(test_stationary_transitions_idle_then_parked);
  RUN_TEST(test_heading_delta_wraps_across_north);
  RUN_TEST(test_retry_backoff_progresses_and_caps_at_five_minutes);
  return UNITY_END();
}
