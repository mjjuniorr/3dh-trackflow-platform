#pragma once

#include <string>

struct TelemetryPayload {
  std::string deviceId;
  double lat;
  double lng;
  double speed;
  int heading;
  int battery;
  double accuracy;
  std::string timestamp;
};

std::string buildDeviceId(const std::string &macAddress);
std::string buildTelemetryJson(const TelemetryPayload &payload);
