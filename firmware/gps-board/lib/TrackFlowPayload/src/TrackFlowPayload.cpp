#include "TrackFlowPayload.h"

#include <cctype>
#include <cstdio>

static std::string jsonEscape(const std::string &value) {
  std::string escaped;
  escaped.reserve(value.size());
  for (char ch : value) {
    if (ch == '"' || ch == '\\') {
      escaped.push_back('\\');
    }
    escaped.push_back(ch);
  }
  return escaped;
}

std::string buildDeviceId(const std::string &macAddress) {
  std::string normalized = "a7670sa-";
  for (char ch : macAddress) {
    if (std::isxdigit(static_cast<unsigned char>(ch))) {
      normalized.push_back(static_cast<char>(std::tolower(static_cast<unsigned char>(ch))));
    }
  }
  return normalized;
}

std::string buildTelemetryJson(const TelemetryPayload &payload) {
  char buffer[640];
  const int written = std::snprintf(
    buffer,
    sizeof(buffer),
    "{\"device_id\":\"%s\",\"lat\":%.5f,\"lng\":%.5f,\"speed\":%.1f,"
    "\"heading\":%d,\"battery\":%d,\"accuracy\":%.1f%s%s%s}",
    jsonEscape(payload.deviceId).c_str(),
    payload.lat,
    payload.lng,
    payload.speed,
    payload.heading,
    payload.battery,
    payload.accuracy,
    payload.timestamp.empty() ? "" : ",\"timestamp\":\"",
    payload.timestamp.empty() ? "" : jsonEscape(payload.timestamp).c_str(),
    payload.timestamp.empty() ? "" : "\""
  );

  if (written <= 0) return "{}";
  if (written >= static_cast<int>(sizeof(buffer))) return "{}";
  return std::string(buffer, static_cast<size_t>(written));
}
