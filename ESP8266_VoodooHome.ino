#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h> // HTTPS support

// ------------------ Configuration ------------------
ESP8266WebServer server(80);

const char* AP_SSID = "VoodooSmart1";
const char* AP_PASS = "";

// Safe pins for ultrasonic (avoid GPIO0/15/16)
const int TRIGGER_PIN = 12; // D6
const int ECHO_PIN = 14;    // D5
const int RELAY_PIN = 5;    // D1
const int LED_PIN = 4;      // D2

// API details
const String API_URL = "https://apnabanda.in/voodoo/api/devices/register-esp";
const String FIRMWARE_VERSION = "1.2.3";

// WiFi credentials
String ssid = "";
String password = "";

// Sensor data
float lastDistance = -1;

// Timing
const unsigned long SAMPLE_INTERVAL = 5000; // every 5 sec
unsigned long lastMeasurement = 0;

// ---------------------------------------------------

void setup() {
  Serial.begin(115200);
  delay(200);

  pinMode(TRIGGER_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);

  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);

  Serial.println("\n📶 Access Point Started");
  Serial.print("SSID: "); Serial.println(AP_SSID);
  Serial.print("IP: "); Serial.println(WiFi.softAPIP());

  // Server endpoints
  server.on("/", handleRoot);
  server.on("/connect", HTTP_POST, handleConnect);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/switch", HTTP_GET, handleSwitch);
  server.on("/getdata", HTTP_GET, handleGetData);

  server.begin();
  Serial.println("🌐 HTTP Server started");
}

void loop() {
  server.handleClient();

  if (millis() - lastMeasurement > SAMPLE_INTERVAL) {
    float distance = getDistance();
    if (distance > 2 && distance < 400) {
      lastDistance = distance;
      Serial.printf("📏 Distance: %.2f cm\n", distance);

      if (WiFi.status() == WL_CONNECTED) {
        sendDataToServer(distance);
      }
    } else {
      Serial.println("⚠️ Invalid ultrasonic reading");
    }
    lastMeasurement = millis();
  }
}

// ------------------ Web Handlers ------------------

void handleRoot() {
  String html = R"rawliteral(
  <!DOCTYPE html>
  <html>
  <body>
    <h1>ESP8266 Smart Device</h1>
    <form action="/connect" method="POST">
      SSID: <input type="text" name="ssid"><br>
      Password: <input type="password" name="pass"><br>
      <input type="submit" value="Connect">
    </form>
    <p>Status: <span id="status">Loading...</span></p>
    <script>
      function updateStatus() {
        fetch('/status')
          .then(r => r.text())
          .then(t => document.getElementById('status').innerText = t);
      }
      updateStatus();
      setInterval(updateStatus, 2000);
    </script>
  </body>
  </html>
  )rawliteral";
  server.send(200, "text/html", html);
}

void handleConnect() {
  ssid = server.arg("ssid");
  password = server.arg("pass");
  server.send(200, "text/plain", "Connecting to WiFi...");
  delay(500);
  connectToWiFi();
}

void handleStatus() {
  String msg = (WiFi.status() == WL_CONNECTED)
                 ? "CONNECTED to " + WiFi.SSID()
                 : "DISCONNECTED";
  server.send(200, "text/plain", msg);
}

void handleSwitch() {
  if (!server.hasArg("state")) {
    server.send(400, "text/plain", "Missing state parameter");
    return;
  }

  String state = server.arg("state");
  if (state == "on") {
    digitalWrite(RELAY_PIN, HIGH);
    server.send(200, "text/plain", "Device ON");
  } else if (state == "off") {
    digitalWrite(RELAY_PIN, LOW);
    server.send(200, "text/plain", "Device OFF");
  } else {
    server.send(400, "text/plain", "Invalid state");
  }
}

void handleGetData() {
  String json = "{\"distance_cm\": " + String(lastDistance, 2) + "}";
  server.send(200, "application/json", json);
}

// ------------------ WiFi ------------------

void connectToWiFi() {
  if (ssid == "" || password == "") {
    Serial.println("❌ Missing SSID or Password");
    return;
  }

  WiFi.disconnect(true);
  delay(1000);
  WiFi.mode(WIFI_STA);

  Serial.print("\n🔗 Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid.c_str(), password.c_str());

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ WiFi Connection Failed!");
  }
}

// ------------------ Ultrasonic ------------------

float getDistance() {
  digitalWrite(TRIGGER_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIGGER_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIGGER_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout

  if (duration == 0) {
    Serial.println("⚠️ No Echo received!");
    return -1;
  }

  float distance = duration * 0.0343 / 2.0; // in cm
  return distance;
}

// ------------------ API Communication ------------------

void sendDataToServer(float brightnessValue) {
  WiFiClientSecure client;
  HTTPClient https;

  client.setInsecure(); // Skip SSL certificate validation

  if (https.begin(client, API_URL)) {
    https.addHeader("Content-Type", "application/json");

    String payload = "{";
    payload += "\"macAddress\": \"" + WiFi.macAddress() + "\",";
    payload += "\"ipAddress\": \"" + WiFi.localIP().toString() + "\",";
    payload += "\"ssid\": \"" + WiFi.SSID() + "\",";
    payload += "\"firmwareVersion\": \"" + FIRMWARE_VERSION + "\",";
    payload += "\"brightness\": " + String(brightnessValue, 2);
    payload += "}";

    Serial.println("\n📤 Sending JSON payload:");
    Serial.println(payload);

    int httpCode = https.POST(payload);
    if (httpCode > 0) {
      Serial.printf("✅ Response Code: %d\n", httpCode);
      String response = https.getString();
      Serial.println("📥 Server Response: " + response);
    } else {
      Serial.printf("❌ POST failed, error: %s\n", https.errorToString(httpCode).c_str());
    }

    https.end();
  } else {
    Serial.println("❌ HTTPS Connection failed");
  }
}
