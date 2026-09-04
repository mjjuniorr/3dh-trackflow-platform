#include <Arduino.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>

#include <A7670Gnss.h>
#include <AdaptiveTracking.h>
#include <TrackFlowPayload.h>
#include <TransportPriority.h>
#include <WifiFailover.h>

#if __has_include("secrets.h")
#include "secrets.h"
#else
#define TRACKFLOW_WIFI_SSID ""
#define TRACKFLOW_WIFI_PASSWORD ""
#define TRACKFLOW_CELLULAR_APN ""
#define TRACKFLOW_CELLULAR_USER ""
#define TRACKFLOW_CELLULAR_PASSWORD ""
#define TRACKFLOW_API_URL "https://rastreio.3dhmanaus.com.br/api/mobile/telemetry"
#define TRACKFLOW_MOBILE_SECRET ""
#define TRACKFLOW_DEVICE_ID ""
#endif

#ifndef TRACKFLOW_CELLULAR_APN
#define TRACKFLOW_CELLULAR_APN ""
#endif

#ifndef TRACKFLOW_CELLULAR_USER
#define TRACKFLOW_CELLULAR_USER ""
#endif

#ifndef TRACKFLOW_CELLULAR_PASSWORD
#define TRACKFLOW_CELLULAR_PASSWORD ""
#endif

#ifndef TRACKFLOW_ALLOW_FIXED_LOCATION_FALLBACK
#define TRACKFLOW_ALLOW_FIXED_LOCATION_FALLBACK 0
#endif

#ifndef TRACKFLOW_ALLOW_OPEN_WIFI_FALLBACK
#define TRACKFLOW_ALLOW_OPEN_WIFI_FALLBACK 0
#endif

#ifndef TRACKFLOW_MODEM_DIAGNOSTICS
#define TRACKFLOW_MODEM_DIAGNOSTICS 0
#endif

#ifndef TRACKFLOW_FORCE_CELLULAR_TEST
#define TRACKFLOW_FORCE_CELLULAR_TEST 0
#endif

constexpr unsigned long GNSS_SAMPLE_INTERVAL_MS = 15000;
constexpr size_t TELEMETRY_QUEUE_CAPACITY = 24;
constexpr size_t QUEUE_DRAIN_BUDGET = 3;
constexpr unsigned long WIFI_CONNECT_TIMEOUT_MS = 20000;
constexpr unsigned long INTERNET_CHECK_TIMEOUT_MS = 8000;
constexpr unsigned long CELLULAR_NETWORK_TIMEOUT_MS = 90000;
constexpr unsigned long CELLULAR_DATA_TIMEOUT_MS = 60000;
constexpr unsigned long CELLULAR_HTTP_TIMEOUT_MS = 120000;
constexpr char TRACKFLOW_API_HOST[] = "rastreio.3dhmanaus.com.br";
constexpr char TRACKFLOW_API_PATH[] = "/api/mobile/telemetry";
unsigned long lastGnssSampleAt = 0;
std::string deviceId;
HardwareSerial modemSerial(1);
bool cellularConnected = false;
AdaptiveTracker adaptiveTracker;
RetryBackoff networkBackoff;
Preferences telemetryQueuePrefs;
uint8_t telemetryQueueHead = 0;
uint8_t telemetryQueueCount = 0;
bool telemetryQueueReady = false;

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

String sendAtCommand(const char *command, unsigned long timeoutMs = 2000, bool logCommand = true) {
  while (modemSerial.available()) {
    modemSerial.read();
  }

  if (logCommand) Serial.printf("AT> %s\n", command);
  else Serial.println("AT> [comando sensivel ocultado]");
  modemSerial.print(command);
  modemSerial.print("\r\n");
  const String response = readModemResponse(timeoutMs);
  Serial.print(response);
  return response;
}

String sendAtCommand(const String &command, unsigned long timeoutMs = 2000, bool logCommand = true) {
  return sendAtCommand(command.c_str(), timeoutMs, logCommand);
}

bool modemResponseOk(const String &response) {
  return response.indexOf("OK") >= 0 && response.indexOf("ERROR") < 0;
}

bool waitForModemText(const char *text, unsigned long timeoutMs) {
  String response;
  const unsigned long startedAt = millis();
  while (millis() - startedAt < timeoutMs) {
    while (modemSerial.available()) {
      const char ch = static_cast<char>(modemSerial.read());
      response += ch;
      Serial.print(ch);
    }
    if (response.indexOf(text) >= 0) return true;
    if (response.indexOf("\r\nERROR\r\n") >= 0) return false;
    delay(20);
  }
  return false;
}

String sendAtCommandAndWaitForText(const String &command, const char *text, unsigned long timeoutMs) {
  while (modemSerial.available()) {
    modemSerial.read();
  }

  Serial.printf("AT> %s\n", command.c_str());
  modemSerial.print(command);
  modemSerial.print("\r\n");

  String response;
  const unsigned long startedAt = millis();
  while (millis() - startedAt < timeoutMs) {
    while (modemSerial.available()) {
      const char ch = static_cast<char>(modemSerial.read());
      response += ch;
      Serial.print(ch);
    }

    if (response.indexOf(text) >= 0 || response.indexOf("\r\nERROR\r\n") >= 0) {
      return response;
    }
    delay(20);
  }
  return response;
}

String readModemUntilText(const char *text, unsigned long timeoutMs) {
  String response;
  const unsigned long startedAt = millis();
  while (millis() - startedAt < timeoutMs) {
    while (modemSerial.available()) {
      const char ch = static_cast<char>(modemSerial.read());
      response += ch;
      Serial.print(ch);
    }

    if (response.indexOf(text) >= 0 || response.indexOf("\r\nERROR\r\n") >= 0) {
      return response;
    }
    delay(20);
  }
  return response;
}

int waitForHttpActionStatus(unsigned long timeoutMs) {
  String response;
  const unsigned long startedAt = millis();
  while (millis() - startedAt < timeoutMs) {
    while (modemSerial.available()) {
      const char ch = static_cast<char>(modemSerial.read());
      response += ch;
      Serial.print(ch);
    }

    const int marker = response.indexOf("+HTTPACTION:");
    if (marker >= 0) {
      const int firstComma = response.indexOf(',', marker);
      const int secondComma = response.indexOf(',', firstComma + 1);
      if (firstComma >= 0 && secondComma > firstComma) {
        return response.substring(firstComma + 1, secondComma).toInt();
      }
    }

    if (response.indexOf("\r\nERROR\r\n") >= 0) return -1;
    delay(20);
  }
  return -1;
}

void telemetryQueueKey(uint8_t index, char *buffer, size_t bufferSize) {
  snprintf(buffer, bufferSize, "q%02u", static_cast<unsigned int>(index));
}

void initTelemetryQueue() {
  if (!telemetryQueuePrefs.begin("trackflowq", false)) {
    Serial.println("Fila persistente indisponivel; telemetria offline nao sera preservada.");
    return;
  }
  telemetryQueueReady = true;

  telemetryQueueHead = telemetryQueuePrefs.getUChar("head", 0);
  telemetryQueueCount = telemetryQueuePrefs.getUChar("count", 0);
  if (telemetryQueueHead >= TELEMETRY_QUEUE_CAPACITY || telemetryQueueCount > TELEMETRY_QUEUE_CAPACITY) {
    telemetryQueueHead = 0;
    telemetryQueueCount = 0;
    telemetryQueuePrefs.putUChar("head", telemetryQueueHead);
    telemetryQueuePrefs.putUChar("count", telemetryQueueCount);
  }
  Serial.printf("Fila persistente carregada: %u registro(s).\n", telemetryQueueCount);
}

void persistTelemetryQueueMetadata() {
  telemetryQueuePrefs.putUChar("head", telemetryQueueHead);
  telemetryQueuePrefs.putUChar("count", telemetryQueueCount);
}

bool enqueueTelemetry(const std::string &body) {
  if (!telemetryQueueReady) return false;

  const bool full = telemetryQueueCount == TELEMETRY_QUEUE_CAPACITY;
  const uint8_t writeIndex = full
    ? telemetryQueueHead
    : static_cast<uint8_t>((telemetryQueueHead + telemetryQueueCount) % TELEMETRY_QUEUE_CAPACITY);

  char key[8];
  telemetryQueueKey(writeIndex, key, sizeof(key));
  if (telemetryQueuePrefs.putString(key, body.c_str()) == 0) {
    Serial.println("Falha ao persistir telemetria offline.");
    return false;
  }

  if (full) {
    telemetryQueueHead = static_cast<uint8_t>((telemetryQueueHead + 1) % TELEMETRY_QUEUE_CAPACITY);
    Serial.println("Fila offline cheia: registro mais antigo descartado.");
  } else {
    telemetryQueueCount++;
  }

  persistTelemetryQueueMetadata();
  Serial.printf("Telemetria adicionada a fila offline. pendentes=%u\n", telemetryQueueCount);
  return true;
}

bool peekTelemetry(std::string &body) {
  if (!telemetryQueueReady || telemetryQueueCount == 0) return false;
  char key[8];
  telemetryQueueKey(telemetryQueueHead, key, sizeof(key));
  const String value = telemetryQueuePrefs.getString(key, "");
  if (value.length() == 0) return false;
  body = value.c_str();
  return true;
}

void popTelemetry() {
  if (!telemetryQueueReady || telemetryQueueCount == 0) return;
  char key[8];
  telemetryQueueKey(telemetryQueueHead, key, sizeof(key));
  telemetryQueuePrefs.remove(key);
  telemetryQueueHead = static_cast<uint8_t>((telemetryQueueHead + 1) % TELEMETRY_QUEUE_CAPACITY);
  telemetryQueueCount--;
  persistTelemetryQueueMetadata();
}

bool waitForModem() {
  for (int attempt = 1; attempt <= 10; attempt++) {
    const String response = sendAtCommand("AT", 1000);
    if (response.indexOf("OK") >= 0) return true;
    delay(1000);
  }
  return false;
}

bool isNetworkRegistered(const String &response) {
  return response.indexOf(",1") >= 0 || response.indexOf(",5") >= 0;
}

bool waitForCellularNetwork() {
  const unsigned long startedAt = millis();
  while (millis() - startedAt < CELLULAR_NETWORK_TIMEOUT_MS) {
    const String cereg = sendAtCommand("AT+CEREG?", 2000);
    if (isNetworkRegistered(cereg)) return true;

    const String creg = sendAtCommand("AT+CREG?", 2000);
    if (isNetworkRegistered(creg)) return true;

    delay(3000);
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
  if (!hasInternetAccess()) {
    Serial.println("Wi-Fi salvo sem acesso externo. Liberando fallback para 4G.");
    WiFi.disconnect(true);
    return false;
  }
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

bool connectCellular() {
  if (cellularConnected) return true;

  if (String(TRACKFLOW_CELLULAR_APN).length() == 0 || String(TRACKFLOW_CELLULAR_APN) == "XXXX") {
    Serial.println("TRACKFLOW_CELLULAR_APN nao configurado. 4G ignorado.");
    return false;
  }

  Serial.println("Iniciando conexao 4G pelo modem A7670SA...");

  String response = sendAtCommand("AT+CPIN?", 5000);
  if (response.indexOf("READY") < 0) {
    Serial.println("SIM nao esta pronto ou nao foi detectado.");
    return false;
  }

  sendAtCommand("AT+CSQ", 3000);
  sendAtCommand("AT+COPS?", 5000);

  if (!waitForCellularNetwork()) {
    Serial.println("Modem nao registrou na rede celular dentro do tempo esperado.");
    return false;
  }

  response = sendAtCommand(String("AT+CGDCONT=1,\"IP\",\"") + TRACKFLOW_CELLULAR_APN + "\"", 5000);
  if (!modemResponseOk(response)) {
    Serial.println("Nao foi possivel configurar APN.");
    return false;
  }

  if (String(TRACKFLOW_CELLULAR_USER).length() > 0 && String(TRACKFLOW_CELLULAR_USER) != "XXXX") {
    response = sendAtCommand(
      String("AT+CGAUTH=1,1,\"") + TRACKFLOW_CELLULAR_USER + "\",\"" + TRACKFLOW_CELLULAR_PASSWORD + "\"",
      5000,
      false
    );
    if (!modemResponseOk(response)) {
      Serial.println("Nao foi possivel configurar autenticacao da APN.");
      return false;
    }
  }

  response = sendAtCommand("AT+CGATT?", 5000);
  if (response.indexOf("+CGATT: 1") < 0) {
    response = sendAtCommand("AT+CGATT=1", CELLULAR_DATA_TIMEOUT_MS);
    if (!modemResponseOk(response)) {
      Serial.println("Attach manual falhou. Tentando ativar contexto PDP mesmo assim.");
    }
  }

  response = sendAtCommand("AT+CGACT=1,1", CELLULAR_DATA_TIMEOUT_MS);
  if (!modemResponseOk(response)) {
    Serial.println("Ativacao manual do PDP falhou. Seguindo para HTTPINIT para testar ativacao automatica.");
  }

  sendAtCommand("AT+CGPADDR=1", 5000);
  cellularConnected = true;
  Serial.println("4G conectado.");
  return true;
}

bool connectInternet() {
  if (WiFi.status() == WL_CONNECTED || cellularConnected) return true;

  bool savedWifiTried = TRACKFLOW_FORCE_CELLULAR_TEST;
  bool cellularTried = false;
  bool openWifiTried = false;

#if TRACKFLOW_FORCE_CELLULAR_TEST
  Serial.println("Modo teste 4G ativo: Wi-Fi salvo sera ignorado neste boot.");
#endif

  while (true) {
    switch (chooseNextTransport(savedWifiTried, cellularTried, openWifiTried)) {
      case Transport::SavedWifi:
        savedWifiTried = true;
        if (connectSavedWifi()) return true;
        break;
      case Transport::Cellular:
        cellularTried = true;
        if (connectCellular()) return true;
        break;
      case Transport::OpenWifi:
        openWifiTried = true;
        if (connectOpenWifiFallback()) return true;
        break;
      case Transport::None:
        Serial.println("Sem conectividade. Tentara novamente no proximo ciclo.");
        return false;
    }
  }
}

bool postTelemetryOverWifi(const std::string &body) {
  WiFiClientSecure client;
  client.setInsecure(); // Bring-up inicial. Depois trocaremos por CA raiz fixa.

  HTTPClient http;
  Serial.printf("POST Wi-Fi %s\n", TRACKFLOW_API_URL);
  if (!http.begin(client, TRACKFLOW_API_URL)) {
    Serial.println("Nao foi possivel iniciar HTTPS via Wi-Fi.");
    return false;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Mobile-Registration-Secret", TRACKFLOW_MOBILE_SECRET);

  const int statusCode = http.POST(String(body.c_str()));
  Serial.printf("HTTP Wi-Fi status=%d\n", statusCode);
  Serial.println(http.getString());
  http.end();
  return statusCode >= 200 && statusCode < 300;
}

bool sendCellularHttpData(const std::string &body) {
  String response = sendAtCommand(String("AT+HTTPDATA=") + body.length() + ",10000", 5000);
  if (response.indexOf("DOWNLOAD") < 0) {
    Serial.println("Modem nao aceitou HTTPDATA.");
    return false;
  }

  modemSerial.print(body.c_str());
  response = readModemResponse(15000);
  Serial.print(response);
  return modemResponseOk(response);
}

bool postTelemetryOverCellular(const std::string &body) {
  Serial.printf("POST 4G %s\n", TRACKFLOW_API_URL);
  sendAtCommand("AT+HTTPTERM", 3000);
  sendAtCommand("AT+CSSLCFG=\"sslversion\",0,4", 5000);
  sendAtCommand("AT+CSSLCFG=\"authmode\",0,0", 5000);
  sendAtCommand("AT+CSSLCFG=\"ignorelocaltime\",0,1", 5000);
  sendAtCommand("AT+CSSLCFG=\"enableSNI\",0,1", 5000);

  String response = sendAtCommand("AT+HTTPINIT", 10000);
  if (!modemResponseOk(response)) {
    Serial.println("Nao foi possivel iniciar HTTP no modem.");
    return false;
  }

  sendAtCommand("AT+HTTPPARA=\"CONNECTTO\",120", 5000);
  sendAtCommand("AT+HTTPPARA=\"RECVTO\",120", 5000);
  sendAtCommand("AT+HTTPPARA=\"SSLCFG\",0", 5000);

  response = sendAtCommand(String("AT+HTTPPARA=\"URL\",\"") + TRACKFLOW_API_URL + "\"", 10000);
  if (!modemResponseOk(response)) {
    Serial.println("Nao foi possivel configurar URL HTTP no modem.");
    sendAtCommand("AT+HTTPTERM", 3000);
    return false;
  }

  sendAtCommand("AT+HTTPPARA=\"CONTENT\",\"application/json\"", 5000);
  sendAtCommand(
    String("AT+HTTPPARA=\"USERDATA\",\"X-Mobile-Registration-Secret: ") + TRACKFLOW_MOBILE_SECRET + "\"",
    5000,
    false
  );

  if (!sendCellularHttpData(body)) {
    sendAtCommand("AT+HTTPTERM", 3000);
    return false;
  }

  response = sendAtCommand("AT+HTTPACTION=1", 10000);
  if (!modemResponseOk(response)) {
    Serial.println("POST 4G nao iniciou acao HTTP.");
    sendAtCommand("AT+HTTPTERM", 3000);
    return false;
  }

  const int statusCode = waitForHttpActionStatus(CELLULAR_HTTP_TIMEOUT_MS);
  Serial.printf("HTTP 4G status=%d\n", statusCode);
  if (statusCode < 200 || statusCode >= 300) {
    Serial.println("POST 4G nao retornou resultado HTTP.");
    sendAtCommand("AT+HTTPTERM", 3000);
    return false;
  }

  sendAtCommand("AT+HTTPREAD", 15000);
  sendAtCommand("AT+HTTPTERM", 3000);
  return true;
}

bool postTelemetryOverCellularTlsSocket(const std::string &body) {
  Serial.println("Tentando POST 4G por socket TLS direto...");

  sendAtCommand("AT+CCHSTOP", 5000);
  sendAtCommand("AT+CSSLCFG=\"sslversion\",0,4", 5000);
  sendAtCommand("AT+CSSLCFG=\"authmode\",0,0", 5000);
  sendAtCommand("AT+CSSLCFG=\"ignorelocaltime\",0,1", 5000);
  sendAtCommand("AT+CSSLCFG=\"enableSNI\",0,1", 5000);

  String response = sendAtCommandAndWaitForText("AT+CCHSTART", "+CCHSTART:", CELLULAR_HTTP_TIMEOUT_MS);
  if (response.indexOf("+CCHSTART: 0") < 0) {
    Serial.println("Servico TLS do modem nao iniciou.");
    return false;
  }

#if TRACKFLOW_MODEM_DIAGNOSTICS
  sendAtCommandAndWaitForText(
    String("AT+CDNSGIP=\"") + TRACKFLOW_API_HOST + "\"",
    "+CDNSGIP:",
    30000
  );
  response = sendAtCommandAndWaitForText(
    "AT+CCHOPEN=0,\"example.com\",443,1",
    "+CCHOPEN:",
    CELLULAR_HTTP_TIMEOUT_MS
  );
  if (response.indexOf("+CCHOPEN: 0,0") >= 0) {
    Serial.println("Diagnostico: internet 4G alcanca HTTPS publico.");
    sendAtCommandAndWaitForText("AT+CCHCLOSE=0", "+CCHCLOSE:", 20000);
  } else {
    Serial.println("Diagnostico: internet 4G nao abriu HTTPS publico.");
  }
  response = sendAtCommandAndWaitForText(
    String("AT+CCHOPEN=0,\"") + TRACKFLOW_API_HOST + "\",443,1",
    "+CCHOPEN:",
    CELLULAR_HTTP_TIMEOUT_MS
  );
  if (response.indexOf("+CCHOPEN: 0,0") >= 0) {
    Serial.println("Diagnostico: TCP na porta 443 conectado.");
    sendAtCommandAndWaitForText("AT+CCHCLOSE=0", "+CCHCLOSE:", 20000);
  } else {
    Serial.println("Diagnostico: TCP na porta 443 tambem falhou.");
  }
#endif

  response = sendAtCommand("AT+CCHSSLCFG=0,0", 5000);
  if (!modemResponseOk(response)) {
    sendAtCommand("AT+CCHSTOP", 5000);
    return false;
  }

  sendAtCommand("AT+CCHCFG=\"sendtimeout\",0,120", 5000);
  response = sendAtCommandAndWaitForText(
    String("AT+CCHOPEN=0,\"") + TRACKFLOW_API_HOST + "\",443,2",
    "+CCHOPEN:",
    CELLULAR_HTTP_TIMEOUT_MS
  );
  if (response.indexOf("+CCHOPEN: 0,0") < 0) {
    Serial.println("Socket TLS nao conectou ao TrackFlow.");
    sendAtCommand("AT+CCHSTOP", 5000);
    return false;
  }

  const String request =
    String("POST ") + TRACKFLOW_API_PATH + " HTTP/1.1\r\n" +
    "Host: " + TRACKFLOW_API_HOST + "\r\n" +
    "User-Agent: TrackFlow-A7670SA/1.0\r\n" +
    "Content-Type: application/json\r\n" +
    "X-Mobile-Registration-Secret: " + TRACKFLOW_MOBILE_SECRET + "\r\n" +
    "Content-Length: " + body.length() + "\r\n" +
    "Connection: close\r\n\r\n" +
    body.c_str();

  response = sendAtCommandAndWaitForText(
    String("AT+CCHSEND=0,") + request.length(),
    ">",
    10000
  );
  if (response.indexOf(">") < 0) {
    Serial.println("Socket TLS nao aceitou o payload HTTP.");
    sendAtCommand("AT+CCHCLOSE=0", 10000);
    sendAtCommand("AT+CCHSTOP", 5000);
    return false;
  }

  modemSerial.print(request);
  response = readModemUntilText("HTTP/1.", CELLULAR_HTTP_TIMEOUT_MS);
  const int statusStart = response.indexOf("HTTP/1.");
  const int statusCode = statusStart >= 0 ? response.substring(statusStart + 9, statusStart + 12).toInt() : -1;
  Serial.printf("Socket TLS status=%d\n", statusCode);

  sendAtCommand("AT+CCHCLOSE=0", 10000);
  sendAtCommand("AT+CCHSTOP", 5000);
  return statusCode >= 200 && statusCode < 300;
}

bool sendTelemetryBody(const std::string &body) {
  if (WiFi.status() == WL_CONNECTED) {
    return postTelemetryOverWifi(body);
  }

  if (cellularConnected) {
    if (postTelemetryOverCellular(body)) return true;
    if (postTelemetryOverCellularTlsSocket(body)) return true;
    cellularConnected = false;
  }
  return false;
}

bool ensureConnectivityWithBackoff(uint32_t nowMs) {
  if (!networkBackoff.canAttempt(nowMs)) {
    Serial.printf(
      "OFFLINE: reconexao em backoff. falhas=%u proxima_tentativa_ms=%lu\n",
      networkBackoff.failureCount(),
      static_cast<unsigned long>(networkBackoff.nextAttemptAtMs())
    );
    return false;
  }

  if (WiFi.status() == WL_CONNECTED || cellularConnected) return true;

  if (connectInternet()) return true;

  const uint32_t delayMs = networkBackoff.recordFailure(nowMs);
  Serial.printf("OFFLINE: nova tentativa de rede em %lu s.\n", static_cast<unsigned long>(delayMs / 1000));
  return false;
}

bool drainTelemetryQueue(uint32_t nowMs) {
  if (telemetryQueueCount == 0) return true;
  if (!ensureConnectivityWithBackoff(nowMs)) return false;

  size_t sent = 0;
  while (telemetryQueueCount > 0 && sent < QUEUE_DRAIN_BUDGET) {
    std::string queuedBody;
    if (!peekTelemetry(queuedBody)) {
      Serial.println("Fila offline inconsistente; removendo entrada vazia.");
      popTelemetry();
      continue;
    }

    if (!sendTelemetryBody(queuedBody)) {
      const uint32_t delayMs = networkBackoff.recordFailure(nowMs);
      Serial.printf("Falha ao reenviar fila. novo backoff=%lu s.\n", static_cast<unsigned long>(delayMs / 1000));
      return false;
    }

    networkBackoff.recordSuccess();
    popTelemetry();
    sent++;
  }

  if (sent > 0) {
    Serial.printf("Fila offline drenada: %u enviado(s), %u pendente(s).\n", static_cast<unsigned int>(sent), telemetryQueueCount);
  }
  return true;
}

void processTrackingCycle() {
  if (String(TRACKFLOW_MOBILE_SECRET).length() == 0) {
    Serial.println("TRACKFLOW_MOBILE_SECRET nao configurado. Ciclo ignorado.");
    return;
  }

  GnssFix fix{};
  if (!readGnssFix(fix)) {
#if TRACKFLOW_ALLOW_FIXED_LOCATION_FALLBACK
    fix = {true, -3.10194, -60.02500, 0.0, 0, 25.0, ""};
    Serial.println("Usando fallback fixo de teste.");
#else
    Serial.println("GNSS sem fix: nenhuma telemetria nova sera criada neste ciclo.");
    return;
#endif
  }

  const uint32_t nowMs = millis();
  const TrackingPoint point{fix.lat, fix.lng, fix.speedKmh, fix.heading};
  const TrackingDecision decision = adaptiveTracker.evaluate(point, nowMs);

  Serial.printf(
    "TRACK state=%s send=%s dist=%.1fm heading_delta=%d speed_delta=%.1fkmh queue=%u\n",
    trackingStateName(decision.state),
    decision.shouldSend ? "yes" : "no",
    decision.distanceFromLastTelemetryMeters,
    decision.headingDeltaDegrees,
    decision.speedDeltaKmh,
    telemetryQueueCount
  );

  if (!decision.shouldSend) {
    if (telemetryQueueCount > 0 && networkBackoff.canAttempt(nowMs)) {
      drainTelemetryQueue(nowMs);
    }
    return;
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

  bool acceptedForDelivery = false;
  if (ensureConnectivityWithBackoff(nowMs)) {
    const bool backlogReady = drainTelemetryQueue(nowMs);
    if (backlogReady && sendTelemetryBody(body)) {
      networkBackoff.recordSuccess();
      acceptedForDelivery = true;
    } else if (backlogReady) {
      const uint32_t delayMs = networkBackoff.recordFailure(nowMs);
      Serial.printf("Falha no envio atual. backoff=%lu s.\n", static_cast<unsigned long>(delayMs / 1000));
    }
  }

  if (!acceptedForDelivery) {
    acceptedForDelivery = enqueueTelemetry(body);
  }

  if (acceptedForDelivery) {
    adaptiveTracker.markTelemetryAccepted(point, nowMs);
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println();
  Serial.println("3DH TrackFlow LILYGO v2 - Adaptive Tracking");
  Serial.printf("Board=%s\n", TRACKFLOW_BOARD_NAME);

  WiFi.mode(WIFI_STA);
  deviceId = String(TRACKFLOW_DEVICE_ID).length() > 0
    ? std::string(TRACKFLOW_DEVICE_ID)
    : buildDeviceId(WiFi.macAddress().c_str());
  Serial.printf("Device ID=%s\n", deviceId.c_str());

  initTelemetryQueue();
  setupGnss();
  processTrackingCycle();
  lastGnssSampleAt = millis();
}

void loop() {
  if (millis() - lastGnssSampleAt >= GNSS_SAMPLE_INTERVAL_MS) {
    lastGnssSampleAt = millis();
    processTrackingCycle();
  }
  delay(50);
}
