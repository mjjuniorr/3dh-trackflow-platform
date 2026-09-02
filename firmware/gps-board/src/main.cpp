#include <Arduino.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

#include <A7670Gnss.h>
#include <TrackFlowPayload.h>
#include <WifiFailover.h>

#if __has_include("secrets.h")
#include "secrets.h"
#else
#define TRACKFLOW_WIFI_SSID ""
#define TRACKFLOW_WIFI_PASSWORD ""
#define TRACKFLOW_API_URL "https://rastreio.3dhmanaus.com.br/api/mobile/telemetry"
#define TRACKFLOW_MOBILE_SECRET ""
#define TRACKFLOW_DEVICE_ID ""
#endif

#ifndef TRACKFLOW_ALLOW_FIXED_LOCATION_FALLBACK
#define TRACKFLOW_ALLOW_FIXED_LOCATION_FALLBACK 0
#endif

#ifndef TRACKFLOW_ALLOW_OPEN_WIFI_FALLBACK
#define TRACKFLOW_ALLOW_OPEN_WIFI_FALLBACK 1
#endif

#ifndef TRACKFLOW_MODEM_DIAGNOSTICS
#define TRACKFLOW_MODEM_DIAGNOSTICS 0
#endif

constexpr unsigned long POST_INTERVAL_MS = 30000;
constexpr unsigned long WIFI_CONNECT_TIMEOUT_MS = 20000;
constexpr unsigned long INTERNET_CHECK_TIMEOUT_MS = 8000;
unsigned long lastPostAt = 0;
std::string deviceId;
HardwareSerial modemSerial(1);

String readModemResponse(unsigned long timeoutMs) {
  String response;
  const unsigned long startedAt = millis();
  while (millis() - startedAt < timeoutMs) {
    while (modemSerial.available()) {
      const char ch = static_cast<char>(modemSerial.read());
      response += ch;
    }
    if (response.indexOf("\r\nOK\r\n") >= 0 || response.indexOf("\r\nERROR\r\n") >= 0) {
      break;
    }
    delay(20);
  }
  return response;
}

String sendAtCommand(const char *command, unsigned long timeoutMs = 2000) {
  while (modemSerial.available()) {
    modemSerial.read();
  }

  Serial.printf("AT> %s\n", command);
  modemSerial.print(command);
  modemSerial.print("\r\n");
  const String response = readModemResponse(timeoutMs);
  Serial.print(response);
  return response;
}

bool waitForModem() {
  for (int attempt = 1; attempt <= 10; attempt++) {
    const String response = sendAtCommand("AT", 1000);
    if (response.indexOf("OK") >= 0) return true;
    delay(1000);
  }
  return false;
}

void setupModemPower() {
  pinMode(TRACKFLOW_BOARD_POWERON_PIN, OUTPUT);
  digitalWrite(TRACKFLOW_BOARD_POWERON_PIN, HIGH);

  pinMode(TRACKFLOW_MODEM_RESET_PIN, OUTPUT);
  digitalWrite(TRACKFLOW_MODEM_RESET_PIN, LOW);
  delay(100);
  digitalWrite(TRACKFLOW_MODEM_RESET_PIN, HIGH);
  delay(2600);
  digitalWrite(TRACKFLOW_MODEM_RESET_PIN, LOW);

  pinMode(TRACKFLOW_MODEM_PWRKEY_PIN, OUTPUT);
  digitalWrite(TRACKFLOW_MODEM_PWRKEY_PIN, LOW);
  delay(100);
  digitalWrite(TRACKFLOW_MODEM_PWRKEY_PIN, HIGH);
  delay(100);
  digitalWrite(TRACKFLOW_MODEM_PWRKEY_PIN, LOW);
  delay(6000);
}

bool setupGnss() {
  setupModemPower();
  modemSerial.begin(TRACKFLOW_MODEM_BAUD, SERIAL_8N1, TRACKFLOW_MODEM_RX_PIN, TRACKFLOW_MODEM_TX_PIN);

  if (!waitForModem()) {
    Serial.println("Modem A7670SA nao respondeu aos comandos AT.");
    return false;
  }

  sendAtCommand("ATE0");
#if TRACKFLOW_MODEM_DIAGNOSTICS
  sendAtCommand("ATI");
  sendAtCommand("AT+CGMM");
  sendAtCommand("AT+CGMR");
  sendAtCommand("AT+CGNSSPWR?");
  sendAtCommand("AT+CGPSINFO=?");
  sendAtCommand("AT+CGNSSINFO=?");
#endif
  const String response = sendAtCommand("AT+CGNSSPWR=1", 9000);
  if (response.indexOf("OK") < 0) {
    Serial.println("Nao foi possivel ativar o GNSS.");
    return false;
  }

  readModemResponse(12000);
  Serial.println("GNSS ativado. Aguardando fix da antena.");
  return true;
}

bool readGnssFix(GnssFix &fix) {
  String response = sendAtCommand("AT+CGNSSINFO", 9000);
  if (parseCgnssInfo(response.c_str(), fix)) {
    Serial.printf(
      "GNSS fix lat=%.6f lng=%.6f speed=%.1f heading=%d accuracy=%.1f\n",
      fix.lat,
      fix.lng,
      fix.speedKmh,
      fix.heading,
      fix.accuracy
    );
    return true;
  }

  response = sendAtCommand("AT+CGPSINFO", 9000);
  if (parseCgpsInfo(response.c_str(), fix)) {
    Serial.printf(
      "GPS fix lat=%.6f lng=%.6f speed=%.1f heading=%d accuracy=%.1f\n",
      fix.lat,
      fix.lng,
      fix.speedKmh,
      fix.heading,
      fix.accuracy
    );
    return true;
  }

  Serial.println("GNSS sem fix valido ainda.");
  return false;
}

bool waitForWifi(unsigned long timeoutMs) {
  const unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startedAt < timeoutMs) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  return WiFi.status() == WL_CONNECTED;
}

bool hasInternetAccess() {
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  http.setTimeout(INTERNET_CHECK_TIMEOUT_MS);
  if (!http.begin(client, TRACKFLOW_API_URL)) {
    return false;
  }

  const int statusCode = http.GET();
  http.end();

  return statusCode > 0 && statusCode != 0;
}

bool connectSavedWifi() {
  if (String(TRACKFLOW_WIFI_SSID).length() == 0) {
    Serial.println("Nenhuma rede Wi-Fi salva configurada.");
    return false;
  }

  Serial.printf("Conectando Wi-Fi salvo SSID=%s\n", TRACKFLOW_WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true);
  delay(500);
  WiFi.begin(TRACKFLOW_WIFI_SSID, TRACKFLOW_WIFI_PASSWORD);

  if (!waitForWifi(WIFI_CONNECT_TIMEOUT_MS)) {
    Serial.println("Falha ao conectar na rede Wi-Fi salva.");
    return false;
  }

  Serial.printf("Wi-Fi salvo conectado. IP=%s RSSI=%d\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
  return true;
}

bool connectOpenWifiFallback() {
#if TRACKFLOW_ALLOW_OPEN_WIFI_FALLBACK
  Serial.println("Procurando redes Wi-Fi abertas...");
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true);
  delay(500);

  const int count = WiFi.scanNetworks(false, true);
  if (count <= 0) {
    Serial.println("Nenhuma rede Wi-Fi aberta encontrada.");
    return false;
  }

  std::vector<WifiCandidate> networks;
  networks.reserve(count);
  for (int index = 0; index < count; index++) {
    networks.push_back({
      WiFi.SSID(index).c_str(),
      WiFi.encryptionType(index) != WIFI_AUTH_OPEN,
      WiFi.RSSI(index)
    });
  }

  for (int attempt = 0; attempt < count; attempt++) {
    const int bestIndex = chooseBestOpenNetwork(networks);
    if (bestIndex < 0) break;

    const WifiCandidate &candidate = networks[bestIndex];
    Serial.printf("Tentando Wi-Fi aberto SSID=%s RSSI=%d\n", candidate.ssid.c_str(), candidate.rssi);
    WiFi.disconnect(true);
    delay(500);
    WiFi.begin(candidate.ssid.c_str());

    if (waitForWifi(WIFI_CONNECT_TIMEOUT_MS)) {
      Serial.printf("Wi-Fi aberto conectado. IP=%s RSSI=%d\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
      if (hasInternetAccess()) {
        Serial.println("Wi-Fi aberto tem acesso externo.");
        WiFi.scanDelete();
        return true;
      }
      Serial.println("Wi-Fi aberto sem internet ou com portal cativo. Ignorando.");
    }

    networks[bestIndex].encrypted = true;
  }

  WiFi.scanDelete();
#else
  Serial.println("Fallback para Wi-Fi aberto desativado.");
#endif
  return false;
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;

  if (connectSavedWifi()) return;
  if (connectOpenWifiFallback()) return;

  Serial.println("Sem conectividade Wi-Fi. 4G sera testado quando houver SIM/APN.");
}

void postTelemetry() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
    if (WiFi.status() != WL_CONNECTED) return;
  }

  if (String(TRACKFLOW_MOBILE_SECRET).length() == 0) {
    Serial.println("TRACKFLOW_MOBILE_SECRET nao configurado. POST nao enviado.");
    return;
  }

  GnssFix fix{};
  if (!readGnssFix(fix)) {
#if TRACKFLOW_ALLOW_FIXED_LOCATION_FALLBACK
    fix = {true, -3.10194, -60.02500, 0.0, 0, 25.0, ""};
    Serial.println("Usando fallback fixo de teste.");
#else
    Serial.println("POST nao enviado porque ainda nao ha localizacao real.");
    return;
#endif
  }

  TelemetryPayload payload{
    deviceId,
    fix.lat,
    fix.lng,
    fix.speedKmh,
    fix.heading,
    100,
    fix.accuracy,
    fix.timestamp
  };

  const std::string body = buildTelemetryJson(payload);

  WiFiClientSecure client;
  client.setInsecure(); // Bring-up inicial. Depois trocaremos por CA raiz fixa.

  HTTPClient http;
  Serial.printf("POST %s\n", TRACKFLOW_API_URL);
  if (!http.begin(client, TRACKFLOW_API_URL)) {
    Serial.println("Nao foi possivel iniciar HTTPS.");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Mobile-Registration-Secret", TRACKFLOW_MOBILE_SECRET);

  const int statusCode = http.POST(String(body.c_str()));
  Serial.printf("HTTP status=%d\n", statusCode);
  Serial.println(http.getString());
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println();
  Serial.println("3DH TrackFlow GPS Board - Wi-Fi bring-up");
  Serial.printf("Board=%s\n", TRACKFLOW_BOARD_NAME);

  WiFi.mode(WIFI_STA);
  deviceId = String(TRACKFLOW_DEVICE_ID).length() > 0
    ? std::string(TRACKFLOW_DEVICE_ID)
    : buildDeviceId(WiFi.macAddress().c_str());
  Serial.printf("Device ID=%s\n", deviceId.c_str());

  connectWifi();
  setupGnss();
  postTelemetry();
  lastPostAt = millis();
}

void loop() {
  if (millis() - lastPostAt >= POST_INTERVAL_MS) {
    lastPostAt = millis();
    postTelemetry();
  }
}
