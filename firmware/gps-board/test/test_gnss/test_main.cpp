#include <unity.h>
#include <A7670Gnss.h>

void test_parse_valid_cgnssinfo_from_a7670() {
  GnssFix fix{};
  const bool parsed = parseCgnssInfo(
    "+CGNSSINFO: 2,09,05,00,0306.116400,S,06001.500000,W,020926,160646.0,32.9,3.5,90.0,1.1,0.8,0.7\r\nOK\r\n",
    fix
  );

  TEST_ASSERT_TRUE(parsed);
  TEST_ASSERT_TRUE(fix.valid);
  TEST_ASSERT_FLOAT_WITHIN(0.00001, -3.10194, fix.lat);
  TEST_ASSERT_FLOAT_WITHIN(0.00001, -60.025, fix.lng);
  TEST_ASSERT_FLOAT_WITHIN(0.1, 6.5, fix.speedKmh);
  TEST_ASSERT_EQUAL_INT(90, fix.heading);
  TEST_ASSERT_FLOAT_WITHIN(0.1, 0.8, fix.accuracy);
  TEST_ASSERT_EQUAL_STRING("2026-09-02T16:06:46Z", fix.timestamp.c_str());
}

void test_parse_empty_cgnssinfo_as_no_fix() {
  GnssFix fix{};
  const bool parsed = parseCgnssInfo("+CGNSSINFO: ,,,,,,,,,,,,,,,\r\nOK\r\n", fix);

  TEST_ASSERT_FALSE(parsed);
  TEST_ASSERT_FALSE(fix.valid);
}

void test_parse_decimal_cgnssinfo_from_a7670sa_fase() {
  GnssFix fix{};
  const bool parsed = parseCgnssInfo(
    "+CGNSSINFO: 3,16,,05,00,3.0463767,S,60.0143929,W,020926,185517.00,70.2,0.000,58.93,2.02,1.02,1.74,\r\nOK\r\n",
    fix
  );

  TEST_ASSERT_TRUE(parsed);
  TEST_ASSERT_TRUE(fix.valid);
  TEST_ASSERT_FLOAT_WITHIN(0.000001, -3.0463767, fix.lat);
  TEST_ASSERT_FLOAT_WITHIN(0.000001, -60.0143929, fix.lng);
  TEST_ASSERT_FLOAT_WITHIN(0.1, 0.0, fix.speedKmh);
  TEST_ASSERT_EQUAL_INT(59, fix.heading);
  TEST_ASSERT_FLOAT_WITHIN(0.1, 1.02, fix.accuracy);
  TEST_ASSERT_EQUAL_STRING("2026-09-02T18:55:17Z", fix.timestamp.c_str());
}

void test_parse_valid_cgpsinfo_from_a7670() {
  GnssFix fix{};
  const bool parsed = parseCgpsInfo(
    "+CGPSINFO: 0306.116400,S,06001.500000,W,020926,160646.0,32.9,3.5,90.0\r\nOK\r\n",
    fix
  );

  TEST_ASSERT_TRUE(parsed);
  TEST_ASSERT_TRUE(fix.valid);
  TEST_ASSERT_FLOAT_WITHIN(0.00001, -3.10194, fix.lat);
  TEST_ASSERT_FLOAT_WITHIN(0.00001, -60.025, fix.lng);
  TEST_ASSERT_FLOAT_WITHIN(0.1, 6.5, fix.speedKmh);
  TEST_ASSERT_EQUAL_INT(90, fix.heading);
  TEST_ASSERT_EQUAL_STRING("2026-09-02T16:06:46Z", fix.timestamp.c_str());
}

int main(int argc, char **argv) {
  UNITY_BEGIN();
  RUN_TEST(test_parse_valid_cgnssinfo_from_a7670);
  RUN_TEST(test_parse_empty_cgnssinfo_as_no_fix);
  RUN_TEST(test_parse_decimal_cgnssinfo_from_a7670sa_fase);
  RUN_TEST(test_parse_valid_cgpsinfo_from_a7670);
  return UNITY_END();
}
