import React, { useState, useEffect, Component } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import esp8266Service from '../../services/esp8266/esp8266Service';
import WaterTank from './WaterTank';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import * as appConstants from '../../constants/constatantsV';
import authService from '../../services/auth/authService';

interface DeviceStatus {
  connected: boolean;
  ssid?: string;
  ip?: string;
  macAddress?: string;
  powerState?: 'on' | 'off';
  firmwareVersion?: string;
  lastUpdated?: string;
  energyUsage?: number;
}

const DeviceControlScreen: React.FC<{ navigation: any, route?: { params?: { deviceId?: string } } }> = ({ navigation, route }) => {
  const [deviceName, setDeviceName] = useState('');
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPowerOn, setIsPowerOn] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedDeviceIp, setSelectedDeviceIp] = useState<string | null>(null);

  const fullTankHeight = 150;
  const [waterLevel, setWaterLevel] = useState(5); // Example water level in pixels
  const [brightness, setBrightness] = useState<number | undefined>(undefined);
  const [socketRef, setSocketRef] = useState<Socket | null>(null);
  const { user } = useAuth();
  

  useEffect(() => {
    // Determine deviceId from route params if available
    const initialDeviceId = route?.params?.deviceId || null;
    if (initialDeviceId) {
      setSelectedDeviceId(initialDeviceId);
    }
    loadDeviceInfo(initialDeviceId);

    // Initialize socket for brightness updates using API socket host
    (async () => {
      try {
        const token = (await authService.getToken()) || '';
        const socket = io(appConstants.CHAT_BASE_URL, {
          transports: ['polling'],
          upgrade: false,
          path: '/voodoo/socket.io',
          reconnection: true,
          timeout: 15000,
          forceNew: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1200,
          auth: { token },
          query: { token },
          extraHeaders: { Authorization: `Bearer ${token}` },
        });
        setSocketRef(socket);
        socket.on('connect', async () => {
          try {
            const did = initialDeviceId || selectedDeviceId;
            if (!did) return;
            const dev = await esp8266Service.getDeviceFromServer(did);
            const ip = dev?.ipAddress || dev?.ip || null;
            setSelectedDeviceIp(ip);
            // Force DB-based updates by not passing IP (avoids device polling timeouts on server)
            socket.emit('brightness:subscribe', { deviceId: did });
            Toast.show({ type: 'info', text1: 'Connected', text2: `Subscribed to brightness updates for ${did}`, position: 'bottom' });
          } catch (e) {
            console.warn('Failed to subscribe brightness:', e);
          }
        });
        socket.on('connect_error', (err) => {
          console.warn('Socket connect error:', err?.message || err);
        });
        socket.on('brightness:update', ({ value }) => {
          if (typeof value === 'number') {
            setBrightness(value);
            Toast.show({ type: 'info', text1: 'Brightness Update', text2: `Received: ${value}`, position: 'bottom' });
            setWaterLevel(Math.max(0, Math.min(100, value)));
          }
        });
        socket.on('brightness:error', ({ error }) => {
          // Suppress noisy device polling timeouts and missing IP warnings
          const msg = String(error || '');
          if (/timeout/i.test(msg) || /Missing device IP/i.test(msg)) return;
          console.warn('Brightness socket error:', msg);
        });
      } catch (err) {
        console.warn('Socket init failed:', err);
      }
    })();

    return () => {
      if (socketRef) {
        const did = route?.params?.deviceId || selectedDeviceId || 'unknown';
        socketRef.emit('brightness:unsubscribe', { deviceId: did });
        socketRef.disconnect();
      }
    };
  }, []);

  const loadDeviceInfo = async (preferredDeviceId?: string | null) => {
    setIsLoading(true);
    try {
      let useDeviceId = preferredDeviceId || selectedDeviceId;
      if (!useDeviceId) {
        // fallback: fetch devices and use the first
        const devices = await esp8266Service.getDevicesFromServer();
        if (!devices || devices.length === 0) {
          Toast.show({ type: 'info', text1: 'No Devices', text2: 'Add a device first', position: 'bottom' });
          setIsLoading(false);
          return;
        }
        const dev = devices[0];
        useDeviceId = dev._id || dev.id;
        setSelectedDeviceId(useDeviceId);
        setDeviceName(dev.name || 'Device');
        setSelectedDeviceIp(dev.ipAddress || dev.ip || null);
      } else {
        // fetch device info for name and ip
        const dev = await esp8266Service.getDeviceFromServer(useDeviceId);
        if (dev) {
          setDeviceName(dev.name || 'Device');
          setSelectedDeviceIp(dev.ipAddress || dev.ip || null);
        }
      }

      const serverState = useDeviceId ? await esp8266Service.getDeviceStateFromServer(useDeviceId) : null;
      if (serverState) {
        const mapped: DeviceStatus = {
          connected: !!serverState.isConnected,
          powerState: serverState.isOn ? 'on' : 'off',
          lastUpdated: serverState.lastSeen || undefined,
          energyUsage: undefined,
        };
        setDeviceStatus(mapped);
        setIsPowerOn(serverState.isOn);
        // Fetch initial brightness via server API for immediate UI feedback
        const b = await esp8266Service.getDeviceBrightnessFromServer(useDeviceId!);
        if (typeof b === 'number') {
          setBrightness(b);
          setWaterLevel(Math.max(0, Math.min(100, b)));
        }
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load device information',
        position: 'bottom'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePowerToggle = async (value: boolean) => {
    setIsPowerOn(value);
    
    try {
      const state = value ? 'on' : 'off';
      if (!selectedDeviceId) {
        throw new Error('No device selected');
      }
      const ok = await esp8266Service.controlDeviceOnServer(selectedDeviceId, state);
      if (ok) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `Device turned ${state} successfully`,
          position: 'bottom'
        });
        // Refresh device state from server and update UI
        const serverState = await esp8266Service.getDeviceStateFromServer(selectedDeviceId);
        if (serverState) {
          setIsPowerOn(!!serverState.isOn);
          // Keep brightness coming from socket updates only
        }
      } else {
        throw new Error('Invalid response from device');
      }
    } catch (error) {
      // Revert the switch if the operation failed
      setIsPowerOn(!value);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: `Failed to turn device ${value ? 'on' : 'off'}`,
        position: 'bottom'
      });
      console.error('Device control error:', error);
    }
  };
  const handleRefresh = async () => {
    try {
      await loadDeviceInfo(selectedDeviceId);
      Toast.show({ type: 'success', text1: 'Refreshed', text2: 'Device state updated', position: 'bottom' });
      // Re-subscribe brightness if we have ip and socket
      if (socketRef && selectedDeviceId && selectedDeviceIp) {
        socketRef.emit('brightness:unsubscribe', { deviceId: selectedDeviceId });
        socketRef.emit('brightness:subscribe', { deviceId: selectedDeviceId, ip: selectedDeviceIp });
      }
    } catch (e) {
      console.warn('Refresh failed:', e);
      Toast.show({ type: 'error', text1: 'Refresh Failed', text2: 'Could not refresh device', position: 'bottom' });
    }
  }
  const handleReset = async () => {
    try {
      const success = await esp8266Service.resetDevice();
      if (success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Device reset successfully',
          position: 'bottom'
        });
        // Navigate back to discovery screen after reset
        navigation.navigate('DeviceDiscovery');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to reset device',
          position: 'bottom'
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to reset device',
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
          text2: 'Device disabled successfully',
          position: 'bottom'
        });
        // Navigate back to discovery screen after disabling
        navigation.navigate('DeviceDiscovery');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to disable device',
          position: 'bottom'
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to disable device',
        position: 'bottom'
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text style={styles.loadingText}>Loading device information...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.deviceName}>{deviceName}</Text>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: deviceStatus?.connected ? '#4CAF50' : '#ff6b6b' }]} />
            <Text style={styles.statusText}>{deviceStatus?.connected ? 'Connected' : 'Disconnected'}</Text>
          </View>
          <TouchableOpacity onPress={handleRefresh} style={{ marginTop: 8 }}>
            <Text style={{ color: '#4a90e2', fontWeight: '600' }}>Refresh</Text>
          </TouchableOpacity>
        </View>
        <WaterTank percentage={waterLevel} />
        <View style={{ marginTop: 10 }}>
          <Text style={{ color: '#666' }}>Brightness: {brightness ?? '—'}%</Text>
        </View>
        <View style={styles.controlSection}>
          <Text style={styles.sectionTitle}>Power Control</Text>
          <View style={styles.powerControl}>
            <Text style={styles.powerLabel}>Power</Text>
            <Switch
              value={isPowerOn}
              onValueChange={handlePowerToggle}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={isPowerOn ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={[styles.controlSection, { marginTop: 20 }]}>
          <Text style={styles.sectionTitle}>Device Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>IP Address</Text>
            <Text style={styles.infoValue}>{deviceStatus?.ip || 'Unknown'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>MAC Address</Text>
            <Text style={styles.infoValue}>{deviceStatus?.macAddress || 'Unknown'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Connected to</Text>
            <Text style={styles.infoValue}>{deviceStatus?.ssid || 'Not connected'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Firmware Version</Text>
            <Text style={styles.infoValue}>{deviceStatus?.firmwareVersion || 'Unknown'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Updated</Text>
            <Text style={styles.infoValue}>{deviceStatus?.lastUpdated || 'Unknown'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Energy Usage</Text>
            <Text style={styles.infoValue}>{deviceStatus?.energyUsage ? `${deviceStatus.energyUsage} kWh` : 'Unknown'}</Text>
          </View>
        </View>

        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>Device Actions</Text>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.resetButton]}
            onPress={handleReset}
          >
            <Text style={styles.resetButtonText}>Reset Device</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.disableButton]}
            onPress={handleDisable}
          >
            <Text style={styles.disableButtonText}>Disable Device</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.configButton]}
            onPress={() => navigation.navigate('WiFiConfig')}
          >
            <Text style={styles.buttonText}>Configure WiFi</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  infoRow:{
   
  },
  infoValue:{
   fontSize:16,
   color:'#666',
   marginLeft:5,
  },
  configButton:{
  width:'100%',
  backgroundColor:'#4a90e2',
  padding:10,
  borderRadius:8,
  marginTop:10,
  alignItems:'center',
  justifyContent:'center',
  marginBottom:10,
  },
  infoLabel:{
    fontSize:16,
    color:'#666',
    marginBottom:5,
  },
  actionSection:{
   width:'100%',
   backgroundColor:'#fff',
   borderRadius:8,
   padding:10,
   marginTop:20,
   borderWidth:1,
   borderColor:'#ddd',
  },
  actionButton:{
  
  },
  disableButtonText:{

  },
  buttonText:{

  },
  resetButtonText:{

  },
  disableButton:{

  },
  resetButton:{

  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  scrollView: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  deviceName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  controlSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  powerControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  powerLabel: {
    fontSize: 16,
    color: '#333',
  },
});
export default DeviceControlScreen;
