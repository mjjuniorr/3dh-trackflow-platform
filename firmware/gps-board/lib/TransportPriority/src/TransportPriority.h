#pragma once

enum class Transport {
  SavedWifi,
  Cellular,
  OpenWifi,
  None
};

Transport chooseNextTransport(bool savedWifiTried, bool cellularTried, bool openWifiTried);
