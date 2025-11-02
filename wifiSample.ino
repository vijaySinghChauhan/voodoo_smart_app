#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

ESP8266WebServer server(80);
const char* AP_SSID = "VoodooSmart";
const char* AP_PASS = "";

// Pin Definitions
const int TRIGGER_PIN = 2;   // GPIO2 (was D4). Ultrasonic trigger
const int ECHO_PIN = 0;      // GPIO0 (was D3). Ultrasonic echo (use another pin)
const int LED_PIN = 4;     // 

const int RELAY_PIN = 5;     // GPIO5 (was D1). Relay control pin (D4 conflict resolved)

// Network credentials
String ssid = "";
String password = "";
float distance = 0.0;
// Ultrasonic settings
const unsigned long SAMPLE_INTERVAL = 500;
unsigned long lastMeasurement = 0;
float lastDistance = -1;

void setup() {
  Serial.begin(115200);
  
  // Initialize hardware pins
  pinMode(TRIGGER_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);  // Start with relay OFF

  // Start Access Point
  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);
  
  Serial.println("\nAccess Point Started");
  Serial.print("IP: ");
  Serial.println(WiFi.softAPIP());

  // Setup web server endpoints
  server.on("/", handleRoot);
  server.on("/connect", HTTP_POST, handleConnect);
  server.on("/status",  HTTP_GET,handleStatus);
  server.on("/switch",  HTTP_GET,handleSwitch);
  server.on("/getdata",  HTTP_GET,handleGetData);
  
  server.begin();
}

void loop() {
  server.handleClient();
  
  // Periodically update distance measurement
if (millis() - lastMeasurement > SAMPLE_INTERVAL) {
     distance = getDistance();
    
    // Only update if valid reading
    if (distance > 0) {
      lastDistance = distance;
      Serial.print("Distance: ");
      Serial.print(distance);
      Serial.println(" cm");
    }
    
    lastMeasurement = millis();
  }
  //  server.on("/getdata",  HTTP_GET,handleGetData);
}

// Mobile app landing page
void handleRoot() {
  String html = R"rawliteral(
  <!DOCTYPE html>
  <html>
  <body>
    <h1>ESP8266 Smart Device</h1>
    <form action="/connect" method="POST">
      SSID:      <input type="text" name="ssid"><br>
      Password: <input type="password" name="pass"><br>
      <input type="submit" value="Connect">
    </form>
    <p>Current Status: <span id="status">Loading...</span></p>
    <script>
      function updateStatus() {
        fetch('/status')
          .then(r => r.text())
          .then(t => document.getElementById('status').innerText = t);
      }
      setInterval(updateStatus, 2000);
    </script>
  </body>
  </html>
  )rawliteral";
  server.send(200, "text/html", html);
}

// Process credentials
void handleConnect() {
  ssid = server.arg("ssid");
  password = server.arg("pass");
  server.send(200, "text/plain", "Connecting...");
  connectToWiFi();
}

// Connection status
void handleStatus() {
  server.send(200, "text/plain", 
    WiFi.status() == WL_CONNECTED ? 
    "CONNECTED to " + WiFi.SSID() : 
    "DISCONNECTED");
}

// Relay control
void handleSwitch() {
  if (server.args() > 0 && server.argName(0) == "state") {
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
  } else {
    server.send(400, "text/plain", "Missing state parameter");
  }
}

// Sensor data retrieval
void handleGetData() {
  server.send(200, "text/plain", String(lastDistance));
}

// WiFi connection handler
void connectToWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid.c_str(), password.c_str());
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nConnected to WiFi!");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nConnection failed!");
  }
}

// Ultrasonic distance measurement
float getDistance() {
  digitalWrite(TRIGGER_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIGGER_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIGGER_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH);
  return duration * 0.0343 / 2;  // Calculate distance in cm
}