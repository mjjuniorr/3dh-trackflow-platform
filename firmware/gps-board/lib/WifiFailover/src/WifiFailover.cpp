#include "WifiFailover.h"

int chooseBestOpenNetwork(const std::vector<WifiCandidate> &networks) {
  int bestIndex = -1;
  int bestRssi = -1000;

  for (size_t index = 0; index < networks.size(); index++) {
    const WifiCandidate &candidate = networks[index];
    if (candidate.encrypted || candidate.ssid.empty()) {
      continue;
    }

    if (candidate.rssi > bestRssi) {
      bestRssi = candidate.rssi;
      bestIndex = static_cast<int>(index);
    }
  }

  return bestIndex;
}
