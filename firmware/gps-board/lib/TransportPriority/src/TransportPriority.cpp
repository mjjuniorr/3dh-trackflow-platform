#include "TransportPriority.h"

Transport chooseNextTransport(bool savedWifiTried, bool cellularTried, bool openWifiTried) {
  if (!savedWifiTried) return Transport::SavedWifi;
  if (!cellularTried) return Transport::Cellular;
  if (!openWifiTried) return Transport::OpenWifi;
  return Transport::None;
}
