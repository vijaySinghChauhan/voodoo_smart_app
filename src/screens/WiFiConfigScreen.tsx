import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import esp8266Service from '../services/esp8266/esp8266Service';

const WiFiConfigScreen: React.FC = () => {
  const [ssid, setSSID] = useState('Airtel_vija_6651');
  const [password, setPassword] = useState('air00336');
  const [deviceIP, setDeviceIP] = useState('192.168.4.1');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<any>(null);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const ip = await esp8266Service.getDeviceIP();
      Toast.show({
        type: 'success',
        text1: 'IP',
        text2: ""+ip,
        position: 'bottom'
      });
      if (ip) {
        setDeviceIP(ip);
        const connected = await esp8266Service.checkConnection();
        setIsConnected(connected);
        if (connected) {
          fetchDeviceStatus();
        }
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const fetchDeviceStatus = async () => {
    try {
      const status = await esp8266Service.getDeviceStatus();
      setDeviceStatus(status);
    } catch (error) {
      console.error('Error fetching device status:', error);
    }
  };

  const handleConnect = async () => {

    if (!deviceIP) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter the device IP address',
        position: 'bottom'
      });
      return;
    }

    setIsConnecting(true);
    try {
      await esp8266Service.setDeviceIP(deviceIP);
      const connected = await esp8266Service.checkConnection();
      setIsConnected(connected);
      if (connected) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Connected to ESP8266 device',
          position: 'bottom'
        });
        fetchDeviceStatus();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to connect to ESP8266 device',
          position: 'bottom'
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to connect to ESP8266 device',
        position: 'bottom'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConfigureWiFi = async () => {
    if (!ssid || !password) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter both SSID and password',
        position: 'bottom'
      });
      return;
    }

    setIsConnecting(true);
    try {
      const success = await esp8266Service.configureWiFi({
        ssid,
        password,
        deviceIP,
      });

      if (success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'WiFi configuration sent to ESP8266',
          position: 'bottom'
        });
        fetchDeviceStatus();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to configure WiFi on ESP8266',
          position: 'bottom'
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to configure WiFi on ESP8266',
        position: 'bottom'
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleReset = async () => {
    try {
      const success = await esp8266Service.resetDevice();
      if (success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'ESP8266 device reset successfully',
          position: 'bottom'
        });
        setIsConnected(false);
        setDeviceStatus(null);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to reset ESP8266 device',
          position: 'bottom'
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to reset ESP8266 device',
        position: 'bottom'
      });
    }
  };

  const handleDisable = async () => {
    try {
      const success = await esp8266Service.disableDevice();
      if (success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'ESP8266 device disabled successfully',
          position: 'bottom'
        });
        setIsConnected(false);
        setDeviceStatus(null);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to disable ESP8266 device',
          position: 'bottom'
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to disable ESP8266 device',
        position: 'bottom'
      });
    }
  };

  // Rest of the component remains the same
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>ESP8266 WiFi Configuration</Text>
        
        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Device Connection</Text>
          <TextInput
            style={styles.input}
            placeholder="ESP8266 IP Address (e.g., 192.168.4.1)"
            value={deviceIP}
            onChangeText={setDeviceIP}
          />
          <TouchableOpacity
            style={[styles.button, isConnecting && styles.disabledButton]}
            onPress={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isConnected ? 'Reconnect' : 'Connect to Device'}
              </Text>
            )}
          </TouchableOpacity>

          {isConnected && (
            <>
              <Text style={styles.sectionTitle}>WiFi Configuration</Text>
              <TextInput
                style={styles.input}
                placeholder="WiFi SSID"
                value={ssid}
                onChangeText={setSSID}
              />
              <TextInput
                style={styles.input}
                placeholder="WiFi Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <TouchableOpacity
                style={[styles.button, isConnecting && styles.disabledButton]}
                onPress={handleConfigureWiFi}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Configure WiFi</Text>
                )}
              </TouchableOpacity>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.resetButton]}
                  onPress={handleReset}
                >
                  <Text style={styles.buttonText}>Reset Device</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.disableButton]}
                  onPress={handleDisable}
                >
                  <Text style={styles.buttonText}>Disable Device</Text>
                </TouchableOpacity>
              </View>

              {deviceStatus && (
                <View style={styles.statusContainer}>
                  <Text style={styles.sectionTitle}>Device Status</Text>
                  <Text style={styles.statusText}>
                    Connected to WiFi: {deviceStatus.connected ? 'Yes' : 'No'}
                  </Text>
                  {deviceStatus.ssid && (
                    <Text style={styles.statusText}>SSID: {deviceStatus.ssid}</Text>
                  )}
                  {deviceStatus.ip && (
                    <Text style={styles.statusText}>IP: {deviceStatus.ip}</Text>
                  )}
                  {deviceStatus.signal && (
                    <Text style={styles.statusText}>
                      Signal Strength: {deviceStatus.signal}dBm
                    </Text>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Existing styles remain the same
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    marginTop: 10,
    color: '#333',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#4a90e2',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  disabledButton: {
    backgroundColor: '#a0c0e8',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    flex: 0.48,
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#f5a623',
  },
  disableButton: {
    backgroundColor: '#e74c3c',
  },
  statusContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  statusText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
  },
});

export default WiFiConfigScreen;