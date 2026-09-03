#include <unity.h>
#include <WifiFailover.h>

void test_selects_strongest_open_network() {
  const std::vector<WifiCandidate> networks{
    {"loja-fechada", true, -30},
    {"aberta-fraca", false, -88},
    {"aberta-forte", false, -55}
  };

  TEST_ASSERT_EQUAL_INT(2, chooseBestOpenNetwork(networks));
}

void test_rejects_encrypted_networks_when_open_fallback_is_needed() {
  const std::vector<WifiCandidate> networks{
    {"wifi-1", true, -20},
    {"wifi-2", true, -40}
  };

  TEST_ASSERT_EQUAL_INT(-1, chooseBestOpenNetwork(networks));
}

void test_ignores_empty_ssid() {
  const std::vector<WifiCandidate> networks{
    {"", false, -20},
    {"aberta-valida", false, -70}
  };

  TEST_ASSERT_EQUAL_INT(1, chooseBestOpenNetwork(networks));
}

int main(int argc, char **argv) {
  UNITY_BEGIN();
  RUN_TEST(test_selects_strongest_open_network);
  RUN_TEST(test_rejects_encrypted_networks_when_open_fallback_is_needed);
  RUN_TEST(test_ignores_empty_ssid);
  return UNITY_END();
}
