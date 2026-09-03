#pragma once

#include <string>

struct GnssFix {
  bool valid;
  double lat;
  double lng;
  double speedKmh;
  int heading;
  double accuracy;
  std::string timestamp;
};

bool parseCgnssInfo(const std::string &response, GnssFix &fix);
bool parseCgpsInfo(const std::string &response, GnssFix &fix);
