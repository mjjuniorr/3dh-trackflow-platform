#include "A7670Gnss.h"

#include <cmath>
#include <cstdlib>
#include <sstream>
#include <vector>

static std::string trim(const std::string &value) {
  const size_t start = value.find_first_not_of(" \r\n\t");
  if (start == std::string::npos) return "";
  const size_t end = value.find_last_not_of(" \r\n\t");
  return value.substr(start, end - start + 1);
}

static std::vector<std::string> splitCsv(const std::string &value) {
  std::vector<std::string> fields;
  std::stringstream stream(value);
  std::string field;
  while (std::getline(stream, field, ',')) {
    fields.push_back(trim(field));
  }
  return fields;
}

static double parseCoordinate(const std::string &raw, const std::string &hemisphere, double decimalLimit) {
  const double value = std::atof(raw.c_str());
  double decimal = value;

  if (std::fabs(value) > decimalLimit) {
    const double degrees = std::floor(value / 100.0);
    const double minutes = value - (degrees * 100.0);
    decimal = degrees + (minutes / 60.0);
  }

  if (hemisphere == "S" || hemisphere == "W") {
    decimal *= -1.0;
  }

  return decimal;
}

struct GnssFieldLayout {
  size_t lat;
  size_t ns;
  size_t lng;
  size_t ew;
  size_t date;
  size_t utcTime;
  size_t speed;
  size_t course;
  size_t hdop;
};

static std::string buildIsoTimestamp(const std::string &date, const std::string &utcTime) {
  if (date.size() < 6 || utcTime.size() < 6) return "";

  const std::string day = date.substr(0, 2);
  const std::string month = date.substr(2, 2);
  const std::string year = "20" + date.substr(4, 2);
  const std::string hour = utcTime.substr(0, 2);
  const std::string minute = utcTime.substr(2, 2);
  const std::string second = utcTime.substr(4, 2);

  return year + "-" + month + "-" + day + "T" + hour + ":" + minute + ":" + second + "Z";
}

bool parseCgnssInfo(const std::string &response, GnssFix &fix) {
  fix = {false, 0, 0, 0, 0, 0, ""};

  const std::string marker = "+CGNSSINFO:";
  const size_t markerPos = response.find(marker);
  if (markerPos == std::string::npos) return false;

  const size_t valueStart = markerPos + marker.size();
  const size_t lineEnd = response.find_first_of("\r\n", valueStart);
  const std::string payload = trim(response.substr(valueStart, lineEnd - valueStart));
  const std::vector<std::string> fields = splitCsv(payload);

  if (fields.size() < 16) return false;
  if (fields[0] != "2" && fields[0] != "3") return false;

  GnssFieldLayout layout{4, 5, 6, 7, 8, 9, 11, 12, 14};
  if ((fields.size() >= 18 || fields[2].empty()) && fields.size() > 16) {
    layout = {5, 6, 7, 8, 9, 10, 12, 13, 15};
  }

  if (fields[layout.lat].empty() || fields[layout.ns].empty() || fields[layout.lng].empty() || fields[layout.ew].empty()) {
    return false;
  }

  fix.valid = true;
  fix.lat = parseCoordinate(fields[layout.lat], fields[layout.ns], 90.0);
  fix.lng = parseCoordinate(fields[layout.lng], fields[layout.ew], 180.0);
  fix.speedKmh = std::atof(fields[layout.speed].c_str()) * 1.852;
  fix.heading = static_cast<int>(std::round(std::atof(fields[layout.course].c_str())));
  fix.accuracy = std::atof(fields[layout.hdop].c_str());
  fix.timestamp = buildIsoTimestamp(fields[layout.date], fields[layout.utcTime]);
  return true;
}

bool parseCgpsInfo(const std::string &response, GnssFix &fix) {
  fix = {false, 0, 0, 0, 0, 0, ""};

  const std::string marker = "+CGPSINFO:";
  const size_t markerPos = response.find(marker);
  if (markerPos == std::string::npos) return false;

  const size_t valueStart = markerPos + marker.size();
  const size_t lineEnd = response.find_first_of("\r\n", valueStart);
  const std::string payload = trim(response.substr(valueStart, lineEnd - valueStart));
  const std::vector<std::string> fields = splitCsv(payload);

  if (fields.size() < 8) return false;
  if (fields[0].empty() || fields[1].empty() || fields[2].empty() || fields[3].empty()) return false;

  fix.valid = true;
  fix.lat = parseCoordinate(fields[0], fields[1], 90.0);
  fix.lng = parseCoordinate(fields[2], fields[3], 180.0);
  fix.timestamp = buildIsoTimestamp(fields[4], fields[5]);
  fix.accuracy = 25.0;

  if (fields.size() > 7 && !fields[7].empty()) {
    fix.speedKmh = std::atof(fields[7].c_str()) * 1.852;
  }

  if (fields.size() > 8 && !fields[8].empty()) {
    fix.heading = static_cast<int>(std::round(std::atof(fields[8].c_str())));
  }

  return true;
}
