#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h> // HTTPS support
#include <ArduinoJson.h>

//  GPIO 1.  TX
//  GPIO 2.  D4
//  GPIO 3.  RX 
//  GPIO 4.  D2
//  GPIO 5.  D1
//  GPIO 12.  D6
//  GPIO 13.  D7
//  GPIO 14.  D5
//  GPIO 16.  D0
//  GPIO 15.  D8
//  GPIO 0.  D3
//  GPIO 0.  D3

// ------------------ Configuration ------------------
ESP8266WebServer server(80);

const char* AP_SSID = "VoodooTech SmartHome";
const char* AP_PASS = "";

// Safe pins for ultrasonic (avoid GPIO0/15/16)
const int TRIGGER_PIN = 12; // D6
const int ECHO_PIN = 14;    // D5
const int RELAY_PIN = 5;    // D1
const int Device1 = 4;      // D2

const int Device2 = 0;      // D3
//const int Device3 = 2;      // D4
const int Device4 = 16;      // D0
const int Device5 = 13;      // D7


// Water flow sensor
const int FLOW_SENSOR_PIN = 2;  // D4 / GPIO2
volatile unsigned long pulseCount = 0;  // Count pulses
float calibrationFactor = 7.5;  // YF-S201 typical value
unsigned long lastFlowSample = 0;
float flowRate = 0.0;
float totalLiters = 0.0;

// -----------------------------------------------------------------------------
// Flow-sensor interrupt
// -----------------------------------------------------------------------------
void IRAM_ATTR pulseCounter() {
  pulseCount++;
}



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

  pinMode(Device1, OUTPUT);
  pinMode(Device2, OUTPUT);
  //pinMode(Device3, OUTPUT);
  pinMode(Device4, OUTPUT);
  pinMode(Device5, OUTPUT);

  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), pulseCounter, FALLING);
  Serial.println("💧 Flow sensor initialized on D4");

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


  // 1-second flow calculations
  if (millis() - lastFlowSample >= 1000) {
    detachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN));
    float freq = pulseCount;     // pulses per second
    pulseCount = 0;
    flowRate = freq / calibrationFactor;      // L/min
    totalLiters += (flowRate / 60.0);         // add per second
    Serial.printf("💧 Flow: %.2f L/min | Total: %.3f L\n", flowRate, totalLiters);
    attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), pulseCounter, FALLING);
    lastFlowSample = millis();
  }

  if (millis() - lastMeasurement > SAMPLE_INTERVAL) {
    float distance = getDistance();
    if (distance > 0 && distance < 99999) {
      lastDistance = distance;
      Serial.printf("📏 Distance: %.2f cm\n", distance);

      if (WiFi.status() == WL_CONNECTED) {
        sendDataToServer(distance);
        Serial.println("⚠️ WiFI Connected");

      }
      else
      {
        Serial.println("⚠️ WiFI Disconnected");
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
  String json = "{\"distance\":" + String(lastDistance, 2) +
                ",\"flowRate\":" + String(flowRate, 2) +
                ",\"totalLiters\":" + String(totalLiters, 3) + "}";
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

  if (duration < 0) {
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
    payload += "\"firmwareVersion\": \"" + String(FIRMWARE_VERSION) + "\",";
    payload += "\"brightness\": " + String(brightnessValue, 2) + ",";
    payload += "\"flowRate\": " + String(flowRate, 3) + ",";
    payload += "\"totalLiters\": " + String(totalLiters, 4);
    payload += "}";

    Serial.println("\n📤 Sending JSON payload:");
    Serial.println(payload);

    int httpCode = https.POST(payload);
    if (httpCode > 0) {
      Serial.printf("✅ Response Code: %d\n", httpCode);
      String response = https.getString();
      Serial.println("📥 Server Response: " + response);
       // 🧠 Parse JSON
      DynamicJsonDocument doc(1024 * 4); // enough memory for your response
      DeserializationError error = deserializeJson(doc, response);

      if (error) {
        Serial.print("❌ JSON parse failed: ");
        Serial.println(error.c_str());
      } else {
        // Extract variables
        bool success = doc["success"];
        bool updated = doc["updated"];
        int deviceId = doc["data"]["id"];
        const char* name = doc["data"]["name"];
        const char* deviceType = doc["data"]["deviceType"];
        const char* ip = doc["data"]["ipAddress"];
        int brightness = doc["data"]["brightness"];
        int target = doc["data"]["target"];
        bool isOn = doc["data"]["isOn"];
        const char* firmware = doc["data"]["firmwareVersion"];
        const char* ssidResp = doc["data"]["ssid"];
        bool device1 = doc["data"]["device1"];
        bool device2 = doc["data"]["device2"];
        bool device3 = doc["data"]["device3"];
        bool device4 = doc["data"]["device4"];
        bool device5 = doc["data"]["device5"];
        // Print extracted values
        Serial.println("----- Parsed Values -----");
        Serial.print("Success: "); Serial.println(success);
        Serial.print("Updated: "); Serial.println(updated);
        Serial.print("Device ID: "); Serial.println(deviceId);
        Serial.print("Name: "); Serial.println(name);
        Serial.print("Device Type: "); Serial.println(deviceType);
        Serial.print("IP Address: "); Serial.println(ip);
        Serial.print("SSID: "); Serial.println(ssidResp);
        Serial.print("Brightness: "); Serial.println(brightness);
        Serial.print("Target: "); Serial.println(target);
        Serial.print("Is On: "); Serial.println(isOn ? "true" : "false");
        Serial.print("Firmware: "); Serial.println(firmware);
         Serial.print("Device1: "); Serial.println(device1);
         Serial.print("Device2: "); Serial.println(device2);
         Serial.print("Device3: "); Serial.println(device3);
         Serial.print("Device4: "); Serial.println(device4);
         Serial.print("Device5: "); Serial.println(device5);
        Serial.println("--------------------------");

        // ✅ You can now store or use them in logic:
        if (isOn==1) {
          digitalWrite(Device1, HIGH);
                 
           Serial.println("Motor swithed on");

        } else {
          digitalWrite(Device1, LOW);
          Serial.println("Motor swithed off");
        }
        if(device2==1)
        {
          digitalWrite(Device2, HIGH);
                     Serial.println("Lock swithed on");
          delay(1000);
          digitalWrite(Device2, LOW);
                     Serial.println("Lock swithed off");
        } else {
          digitalWrite(Device2, LOW);
                     Serial.println("Lock swithed off");

        }
         if(device3==1)
        {
          digitalWrite(FLOW_SENSOR_PIN, HIGH);
                     Serial.println("FLOW_SENSOR_PIN swithed on");

        } else {
          digitalWrite(FLOW_SENSOR_PIN, LOW);
                     Serial.println("FLOW_SENSOR_PIN swithed off");

        }
        
         if(device4==1)
        {
          digitalWrite(Device4, HIGH);
                     Serial.println("device4 swithed on");

        } else {
          digitalWrite(Device4, LOW);
                     Serial.println("device4 swithed off");

        }
        if(device5==1)
        {
          digitalWrite(Device5, HIGH);
                     Serial.println("device5 swithed on");

        } else {
          digitalWrite(Device5, LOW);
                     Serial.println("device5 swithed off");

        }
      }
       
  
    } else {
      Serial.printf("❌ POST failed, error: %s\n", https.errorToString(httpCode).c_str());
    }

    https.end();
  } else {
    Serial.println("❌ HTTPS Connection failed");
  }
}
