#include <unity.h>
#include <TrackFlowPayload.h>

void test_device_id_uses_mac_without_separators() {
  TEST_ASSERT_EQUAL_STRING("a7670sa-1a2b3c4d5e6f", buildDeviceId("1A:2B:3C:4D:5E:6F").c_str());
}

void test_payload_matches_trackflow_mobile_contract() {
  const std::string payload = buildTelemetryJson({
    "a7670sa-1a2b3c4d5e6f",
    -3.10194,
    -60.025,
    12.4,
    180,
    87,
    8.5,
    "2026-09-02T12:34:56-04:00"
  });

  TEST_ASSERT_TRUE(payload.find("\"device_id\":\"a7670sa-1a2b3c4d5e6f\"") != std::string::npos);
  TEST_ASSERT_TRUE(payload.find("\"lat\":-3.10194") != std::string::npos);
  TEST_ASSERT_TRUE(payload.find("\"lng\":-60.025") != std::string::npos);
  TEST_ASSERT_TRUE(payload.find("\"speed\":12.4") != std::string::npos);
  TEST_ASSERT_TRUE(payload.find("\"heading\":180") != std::string::npos);
  TEST_ASSERT_TRUE(payload.find("\"battery\":87") != std::string::npos);
  TEST_ASSERT_TRUE(payload.find("\"accuracy\":8.5") != std::string::npos);
  TEST_ASSERT_TRUE(payload.find("\"timestamp\":\"2026-09-02T12:34:56-04:00\"") != std::string::npos);
}

int main(int argc, char **argv) {
  UNITY_BEGIN();
  RUN_TEST(test_device_id_uses_mac_without_separators);
  RUN_TEST(test_payload_matches_trackflow_mobile_contract);
  return UNITY_END();
}
