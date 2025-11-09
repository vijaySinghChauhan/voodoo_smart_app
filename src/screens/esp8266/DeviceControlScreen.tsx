import React, { useState, useEffect, Component } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Switch,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import esp8266Service from '../../services/esp8266/esp8266Service';
import WaterTank from './WaterTank';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import * as appConstants from '../../constants/constatantsV';
import authService from '../../services/auth/authService';
import logService from '../../services/logging/logService';

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

const DeviceControlScreen: React.FC<{ navigation: any, route?: { params?: { deviceId?: string, fromDiscovery?: boolean } } }> = ({ navigation, route }) => {
  const [deviceName, setDeviceName] = useState('');
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPowerOn, setIsPowerOn] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedDeviceIp, setSelectedDeviceIp] = useState<string | null>(null);
  const [targetValue, setTargetValue] = useState<number>(0);

  const [waterLevel, setWaterLevel] = useState(0); // Example water level in pixels
  const [brightness, setBrightness] = useState<number | undefined>(undefined);
  const [socketRef, setSocketRef] = useState<Socket | null>(null);
  const [device2On, setDevice2On] = useState<boolean>(false);
  const [device3On, setDevice3On] = useState<boolean>(false);
  const [device4On, setDevice4On] = useState<boolean>(false);
  const [device5On, setDevice5On] = useState<boolean>(false);
  const [flowRate, setFlowRate] = useState<number | undefined>(undefined);
  const [totalLiters, setTotalLiters] = useState<number | undefined>(undefined);
  const [showRemaining, setShowRemaining] = useState<boolean>(true);
  const brightnessBufferRef = React.useRef<number[]>([]);
  const SMOOTH_WINDOW = 5;
  const { user } = useAuth();
  
// Smooth brightness to reduce jitter
const smoothValue = (newVal: number) => {
  const buf = brightnessBufferRef.current;
  buf.push(newVal);
  if (buf.length > SMOOTH_WINDOW) buf.shift();
  const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
  return avg;
};

// Helper: map to percent with optional remaining view
// remaining = 100 - (brightness/target * 100); filled = (brightness/target * 100)
const brightnessToPercent = (rawBrightness: number, target: number) => {
 

  if (typeof rawBrightness !== 'number' || isNaN(rawBrightness)) {
    return 0;
  }

  const val = Math.max(0, rawBrightness);
  const t = Number.isFinite(target) && target > 0 ? target : 100;
  const pctRaw = Math.min(100, Math.max(0, (val / t) * 100));
  let pct = showRemaining ? 100 - pctRaw : pctRaw;
  // Floor: avoid near-empty visuals from noise, but keep true zero as zero
  if (pct > 0 && pct < 5) pct = 5;
  return Math.round(Math.max(0, Math.min(100, pct)));
};

  

  useEffect(() => {
    // Determine deviceId from route params if available
    const initialDeviceId = route?.params?.deviceId || null;
    const fromDiscovery = !!route?.params?.fromDiscovery;
    if (initialDeviceId) {
      setSelectedDeviceId(initialDeviceId);
      loadDeviceInfo(initialDeviceId);
    } else if (fromDiscovery) {
      // Allow discovery flow to proceed without deviceId (IP-based control)
      loadDeviceInfo(null);
    } else {
      // No deviceId and not from discovery: redirect to list first
      navigation.navigate('DevicesList');
      return;
    }

    // Initialize socket for brightness updates using API socket host
    (async () => {
      try {
        const token = (await authService.getToken()) || '';
        const socket = io(appConstants.CHAT_BASE_URL, {
          transports: __DEV__ ? ['polling'] : ['websocket', 'polling'],
          upgrade: __DEV__ ? false : true,
          path: '/voodoo/socket.io',
          reconnection: true,
          timeout: 15000,
          forceNew: true,
          reconnectionAttempts: 999999, // keep trying forever
          reconnectionDelay: 1200,
          reconnectionDelayMax: 5000,
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
            // Subscribe to brightness updates; include IP when available to enable device polling
            if (ip) {
              socket.emit('brightness:subscribe', { deviceId: did, ip });
            } else {
              socket.emit('brightness:subscribe', { deviceId: did });
            }
            // Subscribe to flow updates (DB-based)
            socket.emit('flow:subscribe', { deviceId: did });
            Toast.show({ type: 'info', text1: 'Connected', text2: `Subscribed to Data updates for ${did}`, position: 'bottom' });
          } catch (e) {
            console.warn('Failed to subscribe brightness:', e);
          }
        });
        socket.on('connect_error', (err) => {
          console.warn('Socket connect error:', err?.message || err);
        });
        socket.on('reconnect', () => {
          try {
            const did = route?.params?.deviceId || selectedDeviceId;
            if (!did) return;
            if (selectedDeviceIp) {
              socket.emit('brightness:subscribe', { deviceId: did, ip: selectedDeviceIp });
            } else {
              socket.emit('brightness:subscribe', { deviceId: did });
            }
          } catch (e) {}
        });
        socket.on('brightness:update', (payload) => {
          let raw: number | undefined;
          if (typeof payload?.brightness === 'number') {
            raw = payload.brightness;
          } else if (typeof payload?.value === 'number') {
            raw = payload.value;
          } else if (typeof payload === 'string') {
            const parsed = parseFloat(payload);
            raw = isNaN(parsed) ? undefined : parsed;
          } else if (typeof payload === 'number') {
            raw = payload;
          }
         
          if (typeof raw === 'number' && isFinite(raw)) {
            setBrightness(raw);
            const smoothed = smoothValue(raw);
            setWaterLevel(brightnessToPercent(smoothed, targetValue));
            Toast.show({ type: 'info', text1: 'Data Update', text2: `Received: ${raw} (Target: ${targetValue})`, position: 'bottom' });
          }
        });
        socket.on('flow:update', (payload) => {
          const frRaw = payload?.flowRate;
          const tlRaw = payload?.totalLiters;
          const fr = typeof frRaw === 'number' ? frRaw : (typeof frRaw === 'string' ? parseFloat(frRaw) : undefined);
          const tl = typeof tlRaw === 'number' ? tlRaw : (typeof tlRaw === 'string' ? parseFloat(tlRaw) : undefined);
          if (typeof fr === 'number' && isFinite(fr)) setFlowRate(fr);
          if (typeof tl === 'number' && isFinite(tl)) setTotalLiters(tl);
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
        socketRef.emit('flow:unsubscribe', { deviceId: did });
        socketRef.disconnect();
      }
    };
  }, []);

  useEffect(() =>{
    if(device2On)
      setTimeout(() => {
        setDevice2On(false);
      }, 500);
  })

  // Re-subscribe brightness updates when IP becomes available or changes
  useEffect(() => {
    if (socketRef && selectedDeviceId) {
      try {
          socketRef.emit('brightness:unsubscribe', { deviceId: selectedDeviceId });
        if (selectedDeviceIp) {
          socketRef.emit('brightness:subscribe', { deviceId: selectedDeviceId, ip: selectedDeviceIp });
        } else {
          socketRef.emit('brightness:subscribe', { deviceId: selectedDeviceId });
        }
        socketRef.emit('flow:unsubscribe', { deviceId: selectedDeviceId });
        socketRef.emit('flow:subscribe', { deviceId: selectedDeviceId });
      } catch (e) {
        console.warn('Failed to resubscribe brightness on IP change:', e);
      }
    }
  }, [selectedDeviceIp, selectedDeviceId, socketRef]);

  // Recalculate water level when brightness or target changes
  useEffect(() => {
    if (typeof brightness === 'number' && isFinite(brightness)) {
      const smoothed = smoothValue(brightness);
      setWaterLevel(brightnessToPercent(smoothed, targetValue));
    }
  }, [brightness, targetValue, showRemaining]);

  const loadDeviceInfo = async (preferredDeviceId?: string | null) => {
    setIsLoading(true);
    try {
      let useDeviceId = preferredDeviceId || selectedDeviceId;
      let devDetail: any | null = null;
      if (useDeviceId) {
        // fetch device info for name and ip
        const dev = await esp8266Service.getDeviceFromServer(useDeviceId);
        devDetail = dev || null;
        if (devDetail) {
          setDeviceName(devDetail.name || 'Device');
          setSelectedDeviceIp(devDetail.ipAddress || devDetail.ip || null);
          if (devDetail.target !== undefined && devDetail.target !== null) {
            setTargetValue(devDetail.target);
          }
          setDevice2On(!!devDetail.device2);
          setDevice3On(!!devDetail.device3);
          setDevice4On(!!devDetail.device4);
          setDevice5On(!!devDetail.device5);
        }
      } else {
        // No deviceId context: keep minimal UI; details may be IP-based
        devDetail = null;
      }

      const serverState = useDeviceId ? await esp8266Service.getDeviceStateFromServer(useDeviceId) : null;
      if (serverState) {
        const mapped: DeviceStatus = {
          connected: !!serverState.isConnected,
          powerState: serverState.isOn ? 'on' : 'off',
          lastUpdated: serverState.lastSeen || undefined,
          energyUsage: undefined,
          // Prefer device detail fields, fallback to server state
          ip: (devDetail?.ipAddress || devDetail?.ip || serverState.ipAddress) || undefined,
          macAddress: (devDetail?.macAddress || serverState.macAddress) || undefined,
          ssid: (devDetail?.ssid || serverState.ssid) || undefined,
          firmwareVersion: (devDetail?.firmwareVersion || serverState.firmwareVersion) || undefined,
        };
        setDeviceStatus(mapped);
        setIsPowerOn(serverState.isOn);
        // Flow data
        const frRaw = devDetail?.flowRate ?? serverState.flowRate;
        const tlRaw = devDetail?.totalLiters ?? serverState.totalLiters;
        const fr = typeof frRaw === 'number' ? frRaw : (typeof frRaw === 'string' ? parseFloat(frRaw) : undefined);
        const tl = typeof tlRaw === 'number' ? tlRaw : (typeof tlRaw === 'string' ? parseFloat(tlRaw) : undefined);
        if (typeof fr === 'number' && isFinite(fr)) setFlowRate(fr);
        if (typeof tl === 'number' && isFinite(tl)) setTotalLiters(tl);
        // Fetch initial brightness via server API for immediate UI feedback
        const b = await esp8266Service.getDeviceBrightnessFromServer(useDeviceId!);
        if (typeof b === 'number') {
          setBrightness(b);
          const smoothed = smoothValue(b);
          setWaterLevel(brightnessToPercent(smoothed, targetValue));
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

  const toggleDeviceField = async (field: 'device2'|'device3'|'device4'|'device5', value: boolean) => {
    try {
      // Log toggle intent
      await logService.logButtonClick(`Toggle ${field}`, { value });
      if (!selectedDeviceId) throw new Error('No device selected');
      const ok = await esp8266Service.updateDeviceOnServer(selectedDeviceId, { [field]: value ? 1 : 0 });
      if (!ok) throw new Error('Update failed');
      Toast.show({ type: 'success', text1: 'Updated', text2: `${field} ${value ? 'ON' : 'OFF'}`, position: 'bottom' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: `Failed to update ${field}`, position: 'bottom' });
    }
  };

  const handleSaveTarget = async () => {
    try {
      await logService.logButtonClick('Save Target', { targetValue });
      if (!selectedDeviceId) {
        Toast.show({ type: 'error', text1: 'No Device', text2: 'Select a device first', position: 'bottom' });
        return;
      }
      if (targetValue !== null && (isNaN(targetValue) || !isFinite(targetValue))) {
        Toast.show({ type: 'error', text1: 'Invalid Value', text2: 'Enter a numeric target', position: 'bottom' });
        return;
      }
      const ok = await esp8266Service.updateDeviceOnServer(selectedDeviceId, { target: targetValue });
      if (ok) {
        Toast.show({ type: 'success', text1: 'Saved', text2: 'Target updated on server', position: 'bottom' });
        // Recalculate local tank percent immediately using current brightness
         
              const smoothed = smoothValue(brightness ?? 0);
              setWaterLevel(brightnessToPercent(smoothed, targetValue));
        
        await loadDeviceInfo(selectedDeviceId);
      } else {
        Toast.show({ type: 'error', text1: 'Save Failed', text2: 'Could not update target', position: 'bottom' });
      }
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to save target', position: 'bottom' });
    }
  };

  const handlePowerToggle = async (value: boolean) => {
    try { await logService.logButtonClick('Power Toggle', { value }); } catch (e) {}
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
      await logService.logButtonClick('Refresh Device');
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
      await logService.logButtonClick('Reset Device');
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
      await logService.logButtonClick('Disable Device');
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
        {/* Mapping toggle: Remaining vs Filled */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ color: '#333', fontWeight: '600' }}>Show Remaining %</Text>
          <Switch
            value={showRemaining}
            onValueChange={setShowRemaining}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
            thumbColor={showRemaining ? '#fff' : '#f4f3f4'}
          />
        </View>
        <WaterTank percentage={waterLevel ?? 0} />
        <View style={{ marginTop: 10 }}>
          <Text style={{ color: '#666' }}>Exact Data: {brightness ?? '—'}</Text>
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

        <View style={[styles.controlSection, { marginTop: 10 }] }>
          <Text style={styles.sectionTitle}>GPIO Controls</Text>
          <View style={styles.powerControl}>
          <Text style={styles.powerLabel}>Device2</Text>
          <Switch
            value={device2On}
            onValueChange={(val) => {
              setDevice2On(val);
              toggleDeviceField('device2', val);
              if (val) {
                setTimeout(() => {
                  setDevice2On(false);
                  toggleDeviceField('device2', false);
                }, 1000);
              }
            }}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
            thumbColor={device2On ? '#fff' : '#f4f3f4'}
          />
        </View>
        <View style={styles.powerControl}>
          <Text style={styles.powerLabel}>Device3</Text>
          <Switch
            value={device3On}
            onValueChange={(val) => { setDevice3On(val); toggleDeviceField('device3', val); }}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
            thumbColor={device3On ? '#fff' : '#f4f3f4'}
          />
        </View>
       
          <View style={{ marginTop: 12 }}>
            <Text style={styles.sectionTitle}>Flow Data (Device3)</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Flow Rate</Text>
              <Text style={styles.infoValue}>{typeof flowRate === 'number' ? `${flowRate} L/min` : '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Liters</Text>
              <Text style={styles.infoValue}>{typeof totalLiters === 'number' ? `${totalLiters} L` : '—'}</Text>
            </View>
          </View>
          <View style={styles.powerControl}>
            <Text style={styles.powerLabel}>Device4</Text>
            <Switch
              value={device4On}
              onValueChange={(val) => { setDevice4On(val); toggleDeviceField('device4', val); }}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={device4On ? '#fff' : '#f4f3f4'}
            />
          </View>
          <View style={styles.powerControl}>
            <Text style={styles.powerLabel}>Device5</Text>
            <Switch
              value={device5On}
              onValueChange={(val) => { setDevice5On(val); toggleDeviceField('device5', val); }}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={device5On ? '#fff' : '#f4f3f4'}
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

          <View style={{ marginTop: 15 }}>
            <Text style={styles.sectionTitle}>Target Depth (100%)</Text>
            <TextInput
              style={{
                backgroundColor: '#fff',
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 8,
                color: '#333'
              }}
              keyboardType="numeric"
              placeholder="Enter target depth"
              value={targetValue.toString()}
              onChangeText={(text) => setTargetValue(Number(text))}
            />
            <TouchableOpacity style={styles.configButton} onPress={handleSaveTarget}>
              <Text style={styles.buttonText}>Save Target</Text>
            </TouchableOpacity>
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
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
});
export default DeviceControlScreen;
