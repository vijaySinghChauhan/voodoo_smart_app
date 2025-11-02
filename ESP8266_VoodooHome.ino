#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <ArduinoJson.h>
#include <EEPROM.h>

// Configuration
const char* AP_SSID = "VoodooTech_Setup";
const char* AP_PASSWORD = "voodootech123";
const char* API_BASE_URL = "http://your-nodejs-api.com/api";

// EEPROM addresses
const int SSID_ADDR = 0;
const int PASS_ADDR = 50;
const int EEPROM_SIZE = 100;

// Global variables
String wifiSSID = "";
String wifiPassword = "";
String deviceId = "";
String apiToken = "";
bool isConnected = false;

WiFiServer server(80);

void setup() {
  Serial.begin(115200);
  Serial.println("VoodooHome ESP8266 Device Starting...");
  
  // Initialize EEPROM
  EEPROM.begin(EEPROM_SIZE);
  
  // Load saved credentials
  loadCredentials();
  
  // Generate unique device ID if not set
  if (deviceId == "") {
    deviceId = WiFi.macAddress();
    deviceId.replace(":", "");
  }
  
  // Try to connect to WiFi
  if (wifiSSID.length() > 0) {
    connectToWiFi();
  }
  
  // Start AP mode if not connected
  if (!isConnected) {
    startAPMode();
  }
  
  // Start HTTP server
  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  // Handle client connections
  WiFiClient client = server.available();
  if (client) {
    handleClientRequest(client);
  }
  
  // If connected, periodically report status to backend
  if (isConnected && millis() % 30000 == 0) {
    reportDeviceStatus();
  }
}

void loadCredentials() {
  wifiSSID = "";
  wifiPassword = "";
  
  // Read SSID from EEPROM
  for (int i = SSID_ADDR; i < SSID_ADDR + 32; i++) {
    char c = EEPROM.read(i);
    if (c == 0) break;
    wifiSSID += c;
  }
  
  // Read password from EEPROM
  for (int i = PASS_ADDR; i < PASS_ADDR + 32; i++) {
    char c = EEPROM.read(i);
    if (c == 0) break;
    wifiPassword += c;
  }
  
  Serial.print("Loaded SSID: ");
  Serial.println(wifiSSID);
}

void saveCredentials() {
  // Clear EEPROM
  for (int i = SSID_ADDR; i < SSID_ADDR + 32; i++) {
    EEPROM.write(i, 0);
  }
  for (int i = PASS_ADDR; i < PASS_ADDR + 32; i++) {
    EEPROM.write(i, 0);
  }
  
  // Write new credentials
  for (unsigned int i = 0; i < wifiSSID.length(); i++) {
    EEPROM.write(SSID_ADDR + i, wifiSSID[i]);
  }
  for (unsigned int i = 0; i < wifiPassword.length(); i++) {
    EEPROM.write(PASS_ADDR + i, wifiPassword[i]);
  }
  
  EEPROM.commit();
  Serial.println("Credentials saved to EEPROM");
}

void connectToWiFi() {
  Serial.println("Connecting to WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());
  
  int timeout = 20; // 20 seconds timeout
  while (WiFi.status() != WL_CONNECTED && timeout > 0) {
    delay(1000);
    Serial.print(".");
    timeout--;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    isConnected = true;
    Serial.println("");
    Serial.print("Connected to WiFi. IP address: ");
    Serial.println(WiFi.localIP());
    
    // Register device with backend
    registerDevice();
  } else {
    isConnected = false;
    Serial.println("");
    Serial.println("Failed to connect to WiFi");
  }
}

void startAPMode() {
  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASSWORD);
  
  Serial.println("");
  Serial.print("AP Mode. IP address: ");
  Serial.println(WiFi.softAPIP());
}

void handleClientRequest(WiFiClient &client) {
  Serial.println("New client");
  
  // Wait for data from client
  while (!client.available()) {
    delay(1);
  }
  
  // Read first line of request
  String request = client.readStringUntil('\r');
  client.flush();
  
  // Handle different request types
  if (request.indexOf("/status") != -1) {
    handleStatusRequest(client);
  } else if (request.indexOf("/configure") != -1) {
    handleConfigureRequest(client);
  } else {
    client.println("HTTP/1.1 404 Not Found");
    client.println("Content-Type: text/plain");
    client.println("");
    client.println("404 Not Found");
  }
  
  delay(1);
  Serial.println("Client disconnected");
}

void handleStatusRequest(WiFiClient &client) {
  DynamicJsonDocument doc(1024);
  
  doc["deviceId"] = deviceId;
  doc["connected"] = isConnected;
  
  if (isConnected) {
    doc["ssid"] = wifiSSID;
    doc["ip"] = WiFi.localIP().toString();
    doc["signal"] = WiFi.RSSI();
    doc["macAddress"] = WiFi.macAddress();
  } else {
    doc["apIp"] = WiFi.softAPIP().toString();
  }
  
  String response;
  serializeJson(doc, response);
  
  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: application/json");
  client.println("");
  client.println(response);
}

void handleConfigureRequest(WiFiClient &client) {
  // Read the request headers first
  String headers;
  while (client.available()) {
    String line = client.readStringUntil('\n');
    if (line == "\r") break; // End of headers
    headers += line;
  }

  // Check for Content-Type header
  bool isJson = headers.indexOf("Content-Type: application/json") != -1;

  // Read the request body
  String body;
  while (client.available()) {
    body += (char)client.read();
  }
  
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, body);
  
  if (!error) {
    // Get credentials from either JSON or form data
    if (isJson) {
      wifiSSID = doc["ssid"].as<String>();
      wifiPassword = doc["password"].as<String>();
    } else {
      // Handle form data (from mobile app)
      int ssidStart = body.indexOf("ssid=") + 5;
      int ssidEnd = body.indexOf("&", ssidStart);
      int passStart = body.indexOf("pass=") + 5;
      int passEnd = body.indexOf("&", passStart);
      
      if (ssidStart >= 5 && passStart >= 5) {
        wifiSSID = body.substring(ssidStart, ssidEnd != -1 ? ssidEnd : body.length());
        wifiPassword = body.substring(passStart, passEnd != -1 ? passEnd : body.length());
        
        // URL decode the values
        wifiSSID.replace("+", " ");
        wifiPassword.replace("+", " ");
      }
    }
    
    // Save credentials to EEPROM
    saveCredentials();
    
    // Try to connect to WiFi
    connectToWiFi();
    
    // Send response
    client.println("HTTP/1.1 200 OK");
    client.println("Content-Type: application/json");
    client.println("");
    
    if (WiFi.status() == WL_CONNECTED) {
      client.println("{\"status\":\"success\",\"message\":\"WiFi configuration saved and connected\",\"ip\":\"" + WiFi.localIP().toString() + "\"}");
    } else {
      client.println("{\"status\":\"success\",\"message\":\"WiFi configuration saved but connection failed\"}");
    }
  } else {
    client.println("HTTP/1.1 400 Bad Request");
    client.println("Content-Type: application/json");
    client.println("");
    client.println("{\"status\":\"error\",\"message\":\"Invalid configuration data\"}");
  }
}

void registerDevice() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  WiFiClient client;
  HTTPClient http;
  
  String url = String(API_BASE_URL) + "/devices/register";
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  
  DynamicJsonDocument doc(1024);
  doc["deviceId"] = deviceId;
  doc["macAddress"] = WiFi.macAddress();
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["ssid"] = wifiSSID;
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  
  if (httpCode == HTTP_CODE_OK) {
    String response = http.getString();
    DynamicJsonDocument resDoc(1024);
    deserializeJson(resDoc, response);
    
    apiToken = resDoc["token"].as<String>();
    Serial.println("Device registered successfully");
  } else {
    Serial.println("Failed to register device");
  }
  
  http.end();
}

void reportDeviceStatus() {
  if (WiFi.status() != WL_CONNECTED || apiToken == "") return;
  
  WiFiClient client;
  HTTPClient http;
  
  String url = String(API_BASE_URL) + "/devices/" + deviceId + "/status";
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + apiToken);
  
  DynamicJsonDocument doc(1024);
  doc["connected"] = true;
  doc["ssid"] = wifiSSID;
  doc["ip"] = WiFi.localIP().toString();
  doc["signal"] = WiFi.RSSI();
  doc["uptime"] = millis() / 1000;
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  
  if (httpCode == HTTP_CODE_OK) {
    Serial.println("Status reported successfully");
  } else {
    Serial.println("Failed to report status");
  }
  
  http.end();
}