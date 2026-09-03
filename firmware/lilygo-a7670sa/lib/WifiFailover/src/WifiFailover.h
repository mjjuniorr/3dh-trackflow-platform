#pragma once

#include <string>
#include <vector>

struct WifiCandidate {
  std::string ssid;
  bool encrypted;
  int rssi;
};

int chooseBestOpenNetwork(const std::vector<WifiCandidate> &networks);
