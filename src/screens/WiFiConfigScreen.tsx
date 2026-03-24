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
import { Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import * as constantsV from '../constants/constatantsV';
import Ionicons from 'react-native-vector-icons/Ionicons';

const WiFiConfigScreen: React.FC = () => {
  const { user } = useAuth();
  const [ssid, setSSID] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deviceIP, setDeviceIP] = useState('192.168.4.1');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<any>(null);
  const [showProfiles, setShowProfiles] = useState(false);
  const isTester = !!user && ((user as any).tester === 1 || (user as any).tester === '1' || (user as any).tester === true);
const NetworkInfoSafe: any = (() => {
  try {
    if (Platform.OS === 'web') {
      return { getIPV4Address: async () => '', getSSID: async () => '' };
    }
    const mod = require('react-native-network-info');
    return (mod && (mod.NetworkInfo || mod.default || mod)) || {};
  } catch {
    return { getIPV4Address: async () => '', getSSID: async () => '' };
  }
})();

NetworkInfoSafe.getIPV4Address().then((ipAddress: string) => {
  console.log('📡 Device IP Address:', ipAddress);
 // setDeviceIP(ipAddress || '');
});

NetworkInfoSafe.getSSID().then((ssid: string) => {
  console.log('📶 Connected SSID:', ssid);
});


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

  const handleDisconnect = async () => {
    setIsConnecting(true);
    try {
      const success = await esp8266Service.disconnectDevice();
      if (success) {
        setIsConnected(false);
        setDeviceIP('');
        setDeviceStatus(null);
        Toast.show({ type: 'success', text1: 'Disconnected', text2: 'Device connection cleared', position: 'bottom' });
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to disconnect device', position: 'bottom' });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to disconnect device', position: 'bottom' });
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

  const canDisconnect = isConnected || !!deviceIP;

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

          {(!!deviceIP || isConnected) && (
            <View style={styles.statusInline}>
              <Text style={styles.statusTextSmall}>Current IP: {deviceIP || '—'}</Text>
              <Text style={styles.statusTextSmall}>Status: {isConnected ? 'Connected' : 'Not connected'}</Text>
            </View>
          )}
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

          <TouchableOpacity
            style={[
              styles.button,
              styles.disableButton,
              (!canDisconnect || isConnecting) && styles.disabledButton,
            ]}
            onPress={handleDisconnect}
            disabled={isConnecting || !canDisconnect}
          >
            {isConnecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Disconnect</Text>
            )}
          </TouchableOpacity>

          {isConnected && (
            <>
              <Text style={styles.sectionTitle}>WiFi Configuration</Text>
              {isTester && (
                <View style={{ marginBottom: 10 }}>
                  <TouchableOpacity
                    style={[styles.button, styles.disabledButton]}
                    onPress={() => setShowProfiles((s) => !s)}
                  >
                    <Text style={styles.buttonText}>{showProfiles ? 'Hide Tester Defaults' : 'Select Tester Default WiFi'}</Text>
                  </TouchableOpacity>
                  {showProfiles && (
                    <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8 }}>
                      {constantsV.DEFAULT_WIFI_PROFILES.map((p) => (
                        <TouchableOpacity key={p.label} style={{ padding: 12 }} onPress={() => { setSSID(p.ssid); setPassword(p.password); setShowProfiles(false); }}>
                          <Text style={{ color: '#333' }}>{p.label}</Text>
                          <Text style={{ color: '#777', fontSize: 12 }}>SSID: {p.ssid}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
              <TextInput
                style={styles.input}
                placeholder="WiFi SSID"
                value={ssid}
                onChangeText={setSSID}
              />
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="WiFi Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
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
    color:'#000',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9',
  },
  passwordRow: {
    position: 'relative',
    marginBottom: 15,
  },
  passwordInput: {
    marginBottom: 0,
    paddingRight: 46,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    height: 50,
    width: 46,
    alignItems: 'center',
    justifyContent: 'center',
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
  statusInline: {
    marginBottom: 10,
  },
  statusTextSmall: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
});

export default WiFiConfigScreen;
