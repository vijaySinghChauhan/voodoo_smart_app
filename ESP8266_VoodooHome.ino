/* ESP8266 Full Sketch – With WiFi LED, Ultrasonic, Flow Sensor, Dashboard, Relays
   THIS VERSION COMPILES WITHOUT ERRORS
*/

// ----------------------------------------------------------
//  Includes
// ----------------------------------------------------------
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// ----------------------------------------------------------
//  Pin Map
// ----------------------------------------------------------

// Ultrasonic
const int TRIGGER_PIN      = 12;  // D6
const int ECHO_PIN         = 14;  // D5

// Flow Sensor
const int FLOW_SENSOR_PIN  = 2;   // D4 (GPIO2) input only

// Active LOW devices
const int Device1 = 5;    // D1
const int Device2 = 4;    // D2
const int Device3 = 13;   // D7
const int Device4 = 16;   // D0
const int Device5 = 15;   // D8 (active-low relay)

// WiFi LED
const int WIFI_LED_PIN = 0;  // D3 (GPIO0)

// ----------------------------------------------------------
// Function Prototypes (Fixes compilation errors)
// ----------------------------------------------------------
void handleDashboard();
void handleConnect();
void handleStatus();
void handleGetData();
void handleDeviceStatus();
void handleSwitch();
float getDistance();
void connectToWiFi();
void sendDataToServer(float brightnessValue);

// ----------------------------------------------------------
// Globals
// ----------------------------------------------------------
ESP8266WebServer server(80);

const char* AP_SSID = "VoodooTech SmartHome";
const char* AP_PASS = "";

const String API_URL = "https://voodootechsystems.in/voodoo/api/devices/register-esp";
const String FIRMWARE_VERSION = "1.2.3";

String ssid = "";
String password = "";

// Flow sensor
volatile unsigned long pulseCount = 0;
float calibrationFactor = 7.5;
float flowRate = 0.0;
float totalLiters = 0.0;
unsigned long lastFlowSample = 0;

// Ultrasonic
float lastDistance = -1;
unsigned long lastMeasurement = 0;
const unsigned long SAMPLE_INTERVAL = 5000;

int tankTarget = 1000;

// ----------------------------------------------------------
// Interrupt Handler
// ----------------------------------------------------------
void IRAM_ATTR pulseCounter() {
  pulseCount++;
}

// ----------------------------------------------------------
// brightness helper
// ----------------------------------------------------------
String brightnessToPercent(float rawBrightness, int target) {
  float t = (target > 0) ? target : 100.0f;
  float percent = (rawBrightness / t) * 100.0f;
  percent = constrain(percent, 0, 100);
  return String(100 - percent, 2);
}

// ----------------------------------------------------------
// Setup
// ----------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(200);

  // Ultrasonic
  pinMode(TRIGGER_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  // Flow sensor
  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), pulseCounter, FALLING);

  // Devices (active-low relays)
  pinMode(Device1, OUTPUT);
  pinMode(Device2, OUTPUT);
  pinMode(Device3, OUTPUT);
  pinMode(Device4, OUTPUT);
  pinMode(Device5, OUTPUT);

  // OFF initially
  digitalWrite(Device1, LOW);
  digitalWrite(Device2, LOW);
  digitalWrite(Device3, LOW);
  digitalWrite(Device4, LOW);
  digitalWrite(Device5, LOW);

  // WiFi LED

  pinMode(WIFI_LED_PIN, OUTPUT);
  digitalWrite(WIFI_LED_PIN, LOW);

  // AP Mode
  WiFi.mode(WIFI_AP);
  WiFi.softAP(AP_SSID, AP_PASS);

  Serial.println("\nAP Started");
  Serial.println(AP_SSID);
  Serial.println(WiFi.softAPIP());

  // Routes
  server.on("/", [](){ server.sendHeader("Location","/dashboard");server.send(302,""); });
  server.on("/dashboard", handleDashboard);
  server.on("/connect", HTTP_POST, handleConnect);
  server.on("/status", handleStatus);
  server.on("/getdata", handleGetData);
  server.on("/devicestatus", handleDeviceStatus);
  server.on("/switch", handleSwitch);
  server.on("/scan", HTTP_GET, handleWiFiScan);

 // http://192.168.4.1/wifi
  server.on("/wifi", HTTP_GET, handleWiFiPage);
  server.begin();
  Serial.println("HTTP server started");
}

// ----------------------------------------------------------
// Loop
// ----------------------------------------------------------
void loop() {
//  digitalWrite(WIFI_LED_PIN, LOW);
  // setColor(255, 0, 0, 0, 0);   // Red
  server.handleClient();

  // FLOW sensor every 1s
  if (millis() - lastFlowSample >= 1000) {
    detachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN));
    unsigned long pulses = pulseCount;
    pulseCount = 0;
    attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), pulseCounter, FALLING);

    flowRate = (float)pulses / calibrationFactor;
    totalLiters += flowRate / 60.0;

    lastFlowSample = millis();
  }

  // Ultrasonic measurement
  if (millis() - lastMeasurement >= SAMPLE_INTERVAL) {
    lastDistance = getDistance();

    if (WiFi.status() == WL_CONNECTED) {
      digitalWrite(WIFI_LED_PIN, HIGH);
      //  setColor(0, 255, 0, 0, 0);   // Green

      sendDataToServer(lastDistance);
        Serial.println("WIFI connected");

    } else {
      digitalWrite(WIFI_LED_PIN, LOW);
        Serial.println("WIFI Disconnected");
    //   setColor(255, 0, 0, 0, 0);   // Red
     }

    lastMeasurement = millis();
  }
}

void handleWiFiScan() {
  int n = WiFi.scanNetworks();
  DynamicJsonDocument doc(1024);

  JsonArray arr = doc.to<JsonArray>();

  for (int i = 0; i < n; i++) {
    JsonObject obj = arr.createNestedObject();
    obj["ssid"] = WiFi.SSID(i);
    obj["rssi"] = WiFi.RSSI(i);
    // obj["secure"] = (WiFi.encryptionType(i) != WIFI_AUTH_OPEN);
  }

  String out;
  serializeJson(arr, out);
  server.send(200, "application/json", out);
}

// ----------------------------------------------------------
// Ultrasonic Distance
// ----------------------------------------------------------
float getDistance() {
  digitalWrite(TRIGGER_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIGGER_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIGGER_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration <= 0) return -1;

  return (duration * 0.0343) / 2.0;
}

// ----------------------------------------------------------
// WiFi Connect
// ----------------------------------------------------------
void connectToWiFi() {
  WiFi.disconnect(true);
  delay(200);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 30) {
    delay(500);
    tries++;
  }
}


void handleWiFiPage() {
    String html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Connect WiFi</title>
  <style>
    body {
      background: #0e1524;
      font-family: Arial, sans-serif;
      color: #e6eef6;
      text-align: center;
      padding: 30px;
    }
    .card {
      background: #1a2333;
      padding: 20px;
      max-width: 350px;
      margin: auto;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.4);
    }
    input[type=text], input[type=password] {
      width: 100%;
      padding: 12px;
      margin: 10px 0;
      border-radius: 8px;
      border: none;
      background: #0d1422;
      color: #fff;
      font-size: 16px;
    }
    button {
      width: 100%;
      padding: 12px;
      margin-top: 15px;
      background: #1e90ff;
      border: none;
      border-radius: 8px;
      font-size: 18px;
      color: #fff;
      cursor: pointer;
    }
    button:hover {
      background: #4aa3ff;
    }
  </style>
</head>
<body>
  <h2>Connect to WiFi</h2>
  <div class="card">
    <form action="/connect" method="POST">
      <input type="text" name="ssid" placeholder="WiFi Name (SSID)" required>
      <input type="password" name="pass" placeholder="Password">
      <button type="submit">Connect</button>
    </form>
  </div>
</body>
</html>
    )rawliteral";

    server.send(200, "text/html", html);
}

// ----------------------------------------------------------
// Dashboard Page
// ----------------------------------------------------------
void handleDashboard() {
  String html = R"=====(
  <!doctype html>
  <html>
  <head>
  <meta name='viewport' content='width=device-width,initial-scale=1'>
  <title>VoodooTech Dashboard</title>
  <style>
    body{background:#0e1524;color:white;font-family:Arial;padding:20px;}
    .card{background:#0a1120;padding:15px;border-radius:10px;margin-bottom:10px;}
    .btn{padding:10px 14px;border-radius:8px;border:none;font-weight:bold;}
    .btn-on{background:#22c55e;color:#062815;}
    .btn-off{background:#ef4444;color:#2a0707;}
  </style>
  </head>
  <body>
  <h2>VoodooTech Smart Device</h2>

  <div class='card'>
    <b>WiFi:</b> <span id='wifiStatus'>—</span><br>
    <b>IP:</b> <span id='ipAddr'>—</span>
  </div>

  <div class='card'>
    <b>Distance:</b> <span id='distance'>—</span> cm<br>
    <b>Flow:</b> <span id='flow'>—</span>
  </div>

  <div class='card'>
    <b>Device Control:</b><br><br>
    <button id='d1Btn' class='btn'>D1</button>
    <button id='d2Btn' class='btn'>D2</button>
    <button id='d3Btn' class='btn'>D3</button>
    <button id='d4Btn' class='btn'>D4</button>
    <button id='d5Btn' class='btn'>D5</button>
  </div>

  <script>
    async function update(){
      const r=await fetch('/devicestatus');
      const d=await r.json();

      document.getElementById('wifiStatus').innerText = d.wifi.connected ? 'CONNECTED':'DISCONNECTED';
      document.getElementById('ipAddr').innerText = d.wifi.ip;
      document.getElementById('distance').innerText = d.distance.toFixed(2);
      document.getElementById('flow').innerText =
          d.flow.flowRate.toFixed(2)+" L/min | "+d.flow.totalLiters.toFixed(2)+" L";

      setBtn('d1Btn',d.devices.d1,'d1');
      setBtn('d2Btn',d.devices.d2,'d2');
      setBtn('d3Btn',d.devices.d3,'d3');
      setBtn('d4Btn',d.devices.d4,'d4');
      setBtn('d5Btn',d.devices.d5,'d5');
    }

    function setBtn(id,isOn,key){
      const b=document.getElementById(id);
      b.innerText=isOn?'ON':'OFF';
      b.className='btn '+(isOn?'btn-on':'btn-off');
      b.onclick=()=>fetch('/switch?'+key+'='+(isOn?0:1)).then(update);
    }

    update();
    setInterval(update,3000);
  </script>
  </body>
  </html>
  )=====";

  server.send(200, "text/html", html);
}

// ----------------------------------------------------------
// Connect Handler
// ----------------------------------------------------------
void handleConnect() {
  ssid = server.arg("ssid");
  password = server.arg("pass");
  server.send(200,"text/plain","Connecting...");
  
  // setColor(255, 150, 0, 50, 100); // Mix colors

  connectToWiFi();
}

// ----------------------------------------------------------
// Simple Status
// ----------------------------------------------------------
void handleStatus() {
  server.send(200,"text/plain",
    WiFi.status()==WL_CONNECTED?"CONNECTED":"DISCONNECTED");

}

// ----------------------------------------------------------
// Simple Data Endpoint
// ----------------------------------------------------------
void handleGetData() {
  String json =
    "{\"distance\":"+String(lastDistance,2)+
    ",\"flowRate\":"+String(flowRate,2)+
    ",\"totalLiters\":"+String(totalLiters,2)+"}";
  server.send(200,"application/json",json);
}

// ----------------------------------------------------------
// Device Status JSON
// ----------------------------------------------------------
void handleDeviceStatus() {
  DynamicJsonDocument doc(512);

  JsonObject dev = doc.createNestedObject("devices");
  dev["d1"] = (digitalRead(Device1)==LOW);
  dev["d2"] = (digitalRead(Device2)==LOW);
  dev["d3"] = (digitalRead(Device3)==LOW);
  dev["d4"] = (digitalRead(Device4)==LOW);
  dev["d5"] = (digitalRead(Device5)==LOW);

  JsonObject wifi = doc.createNestedObject("wifi");
  wifi["connected"] = (WiFi.status()==WL_CONNECTED);
  wifi["ip"] = WiFi.localIP().toString();

  JsonObject flow = doc.createNestedObject("flow");
  flow["flowRate"] = flowRate;
  flow["totalLiters"] = totalLiters;

  doc["distance"] = lastDistance;

  String out;
  serializeJson(doc,out);
  server.send(200,"application/json",out);
}

// ----------------------------------------------------------
// Switch Handler
// ----------------------------------------------------------
void handleSwitch() {
  if (server.hasArg("d1")) digitalWrite(Device1, server.arg("d1").toInt()?LOW:HIGH);
  if (server.hasArg("d2")) digitalWrite(Device2, server.arg("d2").toInt()?LOW:HIGH);
  if (server.hasArg("d3")) digitalWrite(Device3, server.arg("d3").toInt()?LOW:HIGH);
  if (server.hasArg("d4")) digitalWrite(Device4, server.arg("d4").toInt()?LOW:HIGH);
  if (server.hasArg("d5")) digitalWrite(Device5, server.arg("d5").toInt()?LOW:HIGH);

  server.send(200,"application/json","{\"result\":\"OK\"}");
}

// void setColor(int r, int g, int b, int w, int a) {
//   analogWrite(WIFI_LED_PIN, r);
//   analogWrite(WIFI_LED_PIN, g);
//   analogWrite(WIFI_LED_PIN, b);
//   analogWrite(WIFI_LED_PIN, w);
//   analogWrite(WIFI_LED_PIN, a);
// }
// ----------------------------------------------------------
// Send Data To Server
// ----------------------------------------------------------
void sendDataToServer(float brightnessValue) {
  if (WiFi.status() != WL_CONNECTED) return;
  Serial.println("Sending data....");

  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient https;
  if (!https.begin(client, API_URL)) return;

  https.addHeader("Content-Type", "application/json");

  String payload = "{";
  payload += "\"macAddress\":\""+WiFi.macAddress()+"\",";
  payload += "\"ipAddress\":\""+WiFi.localIP().toString()+"\",";
  payload += "\"ssid\":\""+WiFi.SSID()+"\",";
  payload += "\"firmwareVersion\":\""+FIRMWARE_VERSION+"\",";
  payload += "\"brightness\":"+String(brightnessValue,4)+",";
  payload += "\"flowRate\":"+String(flowRate,3)+",";
  payload += "\"totalLiters\":"+String(totalLiters,3);
  payload += "}";

  int code = https.POST(payload);

  if (code > 0) {
 Serial.print("Data response code = ");
  Serial.println(code);
    String resp = https.getString();
    Serial.println("Server Response:");
    Serial.println(resp);
    DynamicJsonDocument doc(4096);
    if (deserializeJson(doc,resp)==DeserializationError::Ok) {

      JsonObject data = doc["data"];
      int d1 = data["device1"] ;
      int d2 = data["device2"] ;
      int d3 = data["device3"] ;
      int d4 = data["device4"] ;
      int d5 = data["device5"] ;

          Serial.print("Data parsed ");
          Serial.print(d1); Serial.print("-");
          Serial.print(d2); Serial.print("-");
          Serial.print(d3); Serial.print("-");
          Serial.print(d4); Serial.print("-");
          Serial.println(d5);
  //  ACTIVE-LOW RELAY LOGIC FIXED
    digitalWrite(Device1, d1 ? HIGH : LOW);
    digitalWrite(Device2, d2 ? HIGH : LOW);
    delay(1500);
    digitalWrite(Device2, LOW);
    digitalWrite(Device3, d3 ? HIGH : LOW);
    digitalWrite(Device4, d4 ? HIGH : LOW);
    digitalWrite(Device5, d5 ? HIGH : LOW);
      // if (d1!=0) {digitalWrite(Device1, HIGH);} else{digitalWrite(Device1, LOW);}
      // if (d2!=0) {digitalWrite(Device2, HIGH);} else{digitalWrite(Device2, LOW);}
      // if (d3!=0) {digitalWrite(Device3, HIGH);} else{digitalWrite(Device3, LOW);}
      // if (d4!=0) {digitalWrite(Device4, HIGH);} else{digitalWrite(Device4, LOW);}
      // if (d5!=0) {digitalWrite(Device5, HIGH);} else{digitalWrite(Device5, LOW);}

      if (data.containsKey("target"))
        tankTarget = data["target"].as<int>();


    }
  }

  https.end();
}
