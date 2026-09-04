#include <unity.h>
#include <TransportPriority.h>

void test_prefers_saved_wifi_then_cellular_then_open_wifi() {
  TEST_ASSERT_EQUAL(Transport::SavedWifi, chooseNextTransport(false, false, false));
  TEST_ASSERT_EQUAL(Transport::Cellular, chooseNextTransport(true, false, false));
  TEST_ASSERT_EQUAL(Transport::OpenWifi, chooseNextTransport(true, true, false));
  TEST_ASSERT_EQUAL(Transport::None, chooseNextTransport(true, true, true));
}

int main(int argc, char **argv) {
  UNITY_BEGIN();
  RUN_TEST(test_prefers_saved_wifi_then_cellular_then_open_wifi);
  return UNITY_END();
}
