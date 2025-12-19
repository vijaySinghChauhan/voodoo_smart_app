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
  Vibration,
  Platform,
  Alert,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../../services/notifications/notificationService';

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
  const [targetValue, setTargetValue] = useState<number>(1000);
  const [targetInput, setTargetInput] = useState<string>("");

  const [waterLevel, setWaterLevel] = useState(0); // Example water level in pixels
  const [brightness, setBrightness] = useState<number | undefined>(0);
  const [socketRef, setSocketRef] = useState<Socket | null>(null);
  const [device2On, setDevice2On] = useState<boolean>(false);
  const [device3On, setDevice3On] = useState<boolean>(false);
  const [device4On, setDevice4On] = useState<boolean>(false);
  const [device5On, setDevice5On] = useState<boolean>(false);
  const [subLabels, setSubLabels] = useState<{
    subdevice1?: string;
    subdevice2?: string;
    subdevice3?: string;
    subdevice4?: string;
    subdevice5?: string;
  }>({});
  const [flowRate, setFlowRate] = useState<number | undefined>(undefined);
  const [totalLiters, setTotalLiters] = useState<number | undefined>(undefined);
  const [showRemaining, setShowRemaining] = useState<boolean>(true);
  const brightnessBufferRef = React.useRef<number[]>([]);
  const SMOOTH_WINDOW = 5;
  const { user } = useAuth();
  const [activeSocketHost, setActiveSocketHost] = useState<string | null>(null);
  // Automation: dual rules (Turn ON / Turn OFF) based on tank level
  const [onEnabled, setOnEnabled] = useState<boolean>(false);
  const [onOperator, setOnOperator] = useState<'lt' | 'ge'>('lt');
  const [onThreshold, setOnThreshold] = useState<number>(50);
  const [offEnabled, setOffEnabled] = useState<boolean>(false);
  const [offOperator, setOffOperator] = useState<'lt' | 'ge'>('ge');
  const [offThreshold, setOffThreshold] = useState<number>(80);
  const [showOnOperatorMenu, setShowOnOperatorMenu] = useState<boolean>(false);
  const [showOnPercentMenu, setShowOnPercentMenu] = useState<boolean>(false);
  const [showOffOperatorMenu, setShowOffOperatorMenu] = useState<boolean>(false);
  const [showOffPercentMenu, setShowOffPercentMenu] = useState<boolean>(false);
  const [lastAutoAt, setLastAutoAt] = useState<number>(0);
  // Full tank alert state
  const prevWaterLevelRef = React.useRef<number>(0);
  const lastFullAlertAtRef = React.useRef<number>(0);
  const fullAlertArmedRef = React.useRef<boolean>(true); // re-arm when level drops sufficiently
  
// Smooth brightness to reduce jitter
const smoothValue = (newVal: number) => {
  const buf = brightnessBufferRef.current;
  buf.push(newVal);
  if (buf.length > SMOOTH_WINDOW) buf.shift();
  const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
  return avg;
};

// Helper: map brightness to percentage of target (filled)
// filled = clamp((brightness/target) * 100, 0, 100)

const brightnessToPercent = (rawBrightness: number, target: number) => {
  if (!Number.isFinite(rawBrightness)) {
    return 0;
  }
  const val = Math.max(0, rawBrightness);
  const t = Number.isFinite(target) && target > 0 ? target : 100;
  const filled = Math.min(100, Math.max(0, (val / t) * 100));
  return 100-Math.round(filled);
};

  
  // Track whether we've received brightness via socket; used for failover
  const brightnessReceivedRef = React.useRef<boolean>(false);
  const fallbackTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const fallbackPathRetriedRef = React.useRef<boolean>(false);
  const fallbackNoAuthRetriedRef = React.useRef<boolean>(false);
  const fallbackHttpRetriedRef = React.useRef<boolean>(false);

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
        const isDev = (typeof __DEV__ !== 'undefined' ? __DEV__ : (process.env.NODE_ENV !== 'production'));
        const transportList = Platform.OS === 'android' ? ['polling'] : (isDev ? ['polling'] : ['websocket', 'polling']);
        brightnessReceivedRef.current = false;
        const socket = io(appConstants.CHAT_BASE_URL, {
          transports: transportList,
          upgrade: transportList.includes('websocket'),
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
          setActiveSocketHost(appConstants.CHAT_BASE_URL);
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
          const msg = err?.message || String(err || 'Unknown error');
          console.warn('Socket connect error:', msg);
          Toast.show({ type: 'error', text1: 'Socket Error', text2: msg, position: 'bottom' });
        });
        socket.on('brightness:subscribed', ({ deviceId }) => {
          Toast.show({ type: 'info', text1: 'Subscribed', text2: `Brightness for ${deviceId}`, position: 'bottom' });
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
          brightnessReceivedRef.current = true;
          let raw: number | undefined;
          if (typeof payload?.brightness === 'number') {
            raw = payload.brightness;
          } else if (typeof payload?.value === 'number') {
            raw = payload.value;
          } else if (typeof payload?.brightness === 'string') {
            const parsed = parseFloat(payload.brightness);
            raw = isNaN(parsed) ? undefined : parsed;
          } else if (typeof payload?.value === 'string') {
            const parsed = parseFloat(payload.value);
            raw = isNaN(parsed) ? undefined : parsed;
          } else if (typeof payload === 'string') {
            const parsed = parseFloat(payload);
            raw = isNaN(parsed) ? undefined : parsed;
          } else if (typeof payload === 'number') {
            raw = payload;
          }
         
          if (typeof raw === 'number' && isFinite(raw)) {
            setBrightness(raw);
            const smoothed = smoothValue(raw);
            // Treat helper as "filled" computation (100 - normalized)
            const filled = brightnessToPercent(smoothed, Number(targetInput));
            setWaterLevel(filled);
            Toast.show({ type: 'info', text1: 'Data Update', text2: `Received: ${raw} (Target: ${targetInput})`, position: 'bottom' });
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
        // If no brightness arrives within 7s, switch to fallback host
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
        }
        if (appConstants.DISABLE_FALLBACK_SOCKET) {
          console.warn('Fallback socket disabled by config. Skipping fallback attempts.');
        } else {
        fallbackTimerRef.current = setTimeout(async () => {
          if (!brightnessReceivedRef.current) {
            try { socket.disconnect(); } catch {}
            const fbSocket = io(appConstants.CHAT_FALLBACK_URL, {
              transports: transportList,
              upgrade: transportList.includes('websocket'),
              path: '/voodoo/socket.io',
              reconnection: true,
              timeout: 15000,
              forceNew: true,
              reconnectionAttempts: 999999,
              reconnectionDelay: 1200,
              reconnectionDelayMax: 5000,
              auth: { token },
              query: { token },
              extraHeaders: { Authorization: `Bearer ${token}` },
            });
            // Only set as active socket when fallback actually connects
            fbSocket.on('connect', async () => {
              setSocketRef(fbSocket);
              setActiveSocketHost(appConstants.CHAT_FALLBACK_URL);
              try {
                const did = initialDeviceId || selectedDeviceId;
                if (!did) return;
                const dev = await esp8266Service.getDeviceFromServer(did);
                const ip = dev?.ipAddress || dev?.ip || null;
                setSelectedDeviceIp(ip);
                if (ip) {
                  fbSocket.emit('brightness:subscribe', { deviceId: did, ip });
                } else {
                  fbSocket.emit('brightness:subscribe', { deviceId: did });
                }
                fbSocket.emit('flow:subscribe', { deviceId: did });
              } catch (e) {}
            });
            fbSocket.on('brightness:update', (payload) => {
              brightnessReceivedRef.current = true;
              let raw: number | undefined;
              if (typeof payload?.brightness === 'number') raw = payload.brightness;
              else if (typeof payload?.value === 'number') raw = payload.value;
              else if (typeof payload?.brightness === 'string') { const parsed = parseFloat(payload.brightness); raw = isNaN(parsed) ? undefined : parsed; }
              else if (typeof payload?.value === 'string') { const parsed = parseFloat(payload.value); raw = isNaN(parsed) ? undefined : parsed; }
              else if (typeof payload === 'string') { const parsed = parseFloat(payload); raw = isNaN(parsed) ? undefined : parsed; }
              else if (typeof payload === 'number') raw = payload;
              if (typeof raw === 'number' && isFinite(raw)) {
                setBrightness(raw);
                const smoothed = smoothValue(raw);
                const filled = brightnessToPercent(smoothed, Number(targetInput));
                setWaterLevel(filled);
              }
            });
            fbSocket.on('flow:update', (payload) => {
              const frRaw = payload?.flowRate;
              const tlRaw = payload?.totalLiters;
              const fr = typeof frRaw === 'number' ? frRaw : (typeof frRaw === 'string' ? parseFloat(frRaw) : undefined);
              const tl = typeof tlRaw === 'number' ? tlRaw : (typeof tlRaw === 'string' ? parseFloat(tlRaw) : undefined);
              if (typeof fr === 'number' && isFinite(fr)) setFlowRate(fr);
              if (typeof tl === 'number' && isFinite(tl)) setTotalLiters(tl);
            });
            fbSocket.on('connect_error', (err) => {
              const msg = err?.message || String(err || 'Unknown error');
              console.warn('Fallback socket connect error:', msg);
              // Suppress user-facing toast for fallback errors to reduce noise
              // Try default Socket.IO path once if the custom path fails
              if (!fallbackPathRetriedRef.current) {
                fallbackPathRetriedRef.current = true;
                try { fbSocket.disconnect(); } catch {}
                const fbSocket2 = io(appConstants.CHAT_FALLBACK_URL, {
                  transports: transportList,
                  upgrade: transportList.includes('websocket'),
                  path: '/socket.io',
                  reconnection: true,
                  timeout: 15000,
                  forceNew: true,
                  reconnectionAttempts: 999999,
                  reconnectionDelay: 1200,
                  reconnectionDelayMax: 5000,
                  auth: { token },
                  query: { token },
                  extraHeaders: { Authorization: `Bearer ${token}` },
                });
                // Only set as active socket when fallback actually connects
                fbSocket2.on('connect', async () => {
                  setSocketRef(fbSocket2);
                  setActiveSocketHost(appConstants.CHAT_FALLBACK_URL);
                  try {
                    const did = initialDeviceId || selectedDeviceId;
                    if (!did) return;
                    const dev = await esp8266Service.getDeviceFromServer(did);
                    const ip = dev?.ipAddress || dev?.ip || null;
                    setSelectedDeviceIp(ip);
                    if (ip) { fbSocket2.emit('brightness:subscribe', { deviceId: did, ip }); }
                    else { fbSocket2.emit('brightness:subscribe', { deviceId: did }); }
                    fbSocket2.emit('flow:subscribe', { deviceId: did });
                  } catch (e) {}
                });
                fbSocket2.on('brightness:update', (payload) => {
                  brightnessReceivedRef.current = true;
                  let raw: number | undefined;
                  if (typeof payload?.brightness === 'number') raw = payload.brightness;
                  else if (typeof payload?.value === 'number') raw = payload.value;
                  else if (typeof payload?.brightness === 'string') { const parsed = parseFloat(payload.brightness); raw = isNaN(parsed) ? undefined : parsed; }
                  else if (typeof payload?.value === 'string') { const parsed = parseFloat(payload.value); raw = isNaN(parsed) ? undefined : parsed; }
                  else if (typeof payload === 'string') { const parsed = parseFloat(payload); raw = isNaN(parsed) ? undefined : parsed; }
                  else if (typeof payload === 'number') raw = payload;
                  if (typeof raw === 'number' && isFinite(raw)) {
                    setBrightness(raw);
                    const smoothed = smoothValue(raw);
                    const filled = brightnessToPercent(smoothed, Number(targetInput));
                    setWaterLevel(filled);
                  }
                });
                fbSocket2.on('flow:update', (payload) => {
                  const frRaw = payload?.flowRate;
                  const tlRaw = payload?.totalLiters;
                  const fr = typeof frRaw === 'number' ? frRaw : (typeof frRaw === 'string' ? parseFloat(frRaw) : undefined);
                  const tl = typeof tlRaw === 'number' ? tlRaw : (typeof tlRaw === 'string' ? parseFloat(tlRaw) : undefined);
                  if (typeof fr === 'number' && isFinite(fr)) setFlowRate(fr);
                  if (typeof tl === 'number' && isFinite(tl)) setTotalLiters(tl);
                });
                fbSocket2.on('connect_error', (err2) => {
                  const msg2 = err2?.message || String(err2 || 'Unknown error');
                  console.warn('Fallback socket (default path) connect error:', msg2);
                  // Suppress user-facing toast for fallback errors to reduce noise
                  // If unauthorized, attempt one more time without any auth/query/headers
                  if (/unauthorized/i.test(msg2) && !fallbackNoAuthRetriedRef.current) {
                    fallbackNoAuthRetriedRef.current = true;
                    try { fbSocket2.disconnect(); } catch {}
                    const fbSocket3 = io(appConstants.CHAT_FALLBACK_URL, {
                      transports: transportList,
                      upgrade: transportList.includes('websocket'),
                      path: '/socket.io',
                      reconnection: true,
                      timeout: 15000,
                      forceNew: true,
                      reconnectionAttempts: 999999,
                      reconnectionDelay: 1200,
                      reconnectionDelayMax: 5000,
                    });
                    // Only set as active socket when fallback actually connects
                    fbSocket3.on('connect', async () => {
                      setSocketRef(fbSocket3);
                      setActiveSocketHost(appConstants.CHAT_FALLBACK_URL);
                      try {
                        const did = initialDeviceId || selectedDeviceId;
                        if (!did) return;
                        const dev = await esp8266Service.getDeviceFromServer(did);
                        const ip = dev?.ipAddress || dev?.ip || null;
                        setSelectedDeviceIp(ip);
                        if (ip) { fbSocket3.emit('brightness:subscribe', { deviceId: did, ip }); }
                        else { fbSocket3.emit('brightness:subscribe', { deviceId: did }); }
                        fbSocket3.emit('flow:subscribe', { deviceId: did });
                      } catch (e) {}
                    });
                    fbSocket3.on('brightness:update', (payload) => {
                      brightnessReceivedRef.current = true;
                      let raw: number | undefined;
                      if (typeof payload?.brightness === 'number') raw = payload.brightness;
                      else if (typeof payload?.value === 'number') raw = payload.value;
                      else if (typeof payload?.brightness === 'string') { const parsed = parseFloat(payload.brightness); raw = isNaN(parsed) ? undefined : parsed; }
                      else if (typeof payload?.value === 'string') { const parsed = parseFloat(payload.value); raw = isNaN(parsed) ? undefined : parsed; }
                      else if (typeof payload === 'string') { const parsed = parseFloat(payload); raw = isNaN(parsed) ? undefined : parsed; }
                      else if (typeof payload === 'number') raw = payload;
                      if (typeof raw === 'number' && isFinite(raw)) {
                        setBrightness(raw);
                        const smoothed = smoothValue(raw);
                        const filled = brightnessToPercent(smoothed, Number(targetInput));
                        setWaterLevel(filled);
                      }
                    });
                    fbSocket3.on('flow:update', (payload) => {
                      const frRaw = payload?.flowRate;
                      const tlRaw = payload?.totalLiters;
                      const fr = typeof frRaw === 'number' ? frRaw : (typeof frRaw === 'string' ? parseFloat(frRaw) : undefined);
                      const tl = typeof tlRaw === 'number' ? tlRaw : (typeof tlRaw === 'string' ? parseFloat(tlRaw) : undefined);
                      if (typeof fr === 'number' && isFinite(fr)) setFlowRate(fr);
                      if (typeof tl === 'number' && isFinite(tl)) setTotalLiters(tl);
                    });
                    fbSocket3.on('connect_error', (err3) => {
                      const msg3 = err3?.message || String(err3 || 'Unknown error');
                      console.warn('Fallback socket (no auth) connect error:', msg3);
                      // Suppress user-facing toast for fallback errors to reduce noise
                      // Final attempt: try HTTP scheme in case HTTPS/TLS or CORS blocks
                      if (!fallbackHttpRetriedRef.current) {
                        fallbackHttpRetriedRef.current = true;
                        try { fbSocket3.disconnect(); } catch {}
                        const httpUrl = appConstants.CHAT_FALLBACK_URL.replace(/^https:/, 'http:');
                        const fbSocket4 = io(httpUrl, {
                          transports: transportList,
                          upgrade: transportList.includes('websocket'),
                          path: '/socket.io',
                          reconnection: true,
                          timeout: 15000,
                          forceNew: true,
                          reconnectionAttempts: 999999,
                          reconnectionDelay: 1200,
                          reconnectionDelayMax: 5000,
                        });
                        fbSocket4.on('connect', async () => {
                          setSocketRef(fbSocket4);
                          setActiveSocketHost(httpUrl);
                          try {
                            const did = initialDeviceId || selectedDeviceId;
                            if (!did) return;
                            const dev = await esp8266Service.getDeviceFromServer(did);
                            const ip = dev?.ipAddress || dev?.ip || null;
                            setSelectedDeviceIp(ip);
                            if (ip) { fbSocket4.emit('brightness:subscribe', { deviceId: did, ip }); }
                            else { fbSocket4.emit('brightness:subscribe', { deviceId: did }); }
                            fbSocket4.emit('flow:subscribe', { deviceId: did });
                          } catch (e) {}
                        });
                        fbSocket4.on('brightness:update', (payload) => {
                          brightnessReceivedRef.current = true;
                          let raw: number | undefined;
                          if (typeof payload?.brightness === 'number') raw = payload.brightness;
                          else if (typeof payload?.value === 'number') raw = payload.value;
                          else if (typeof payload?.brightness === 'string') { const parsed = parseFloat(payload.brightness); raw = isNaN(parsed) ? undefined : parsed; }
                          else if (typeof payload?.value === 'string') { const parsed = parseFloat(payload.value); raw = isNaN(parsed) ? undefined : parsed; }
                          else if (typeof payload === 'string') { const parsed = parseFloat(payload); raw = isNaN(parsed) ? undefined : parsed; }
                          else if (typeof payload === 'number') raw = payload;
                          if (typeof raw === 'number' && isFinite(raw)) {
                            setBrightness(raw);
                            const smoothed = smoothValue(raw);
                            const filled = brightnessToPercent(smoothed, Number(targetInput));
                            setWaterLevel(filled);
                          }
                        });
                        fbSocket4.on('flow:update', (payload) => {
                          const frRaw = payload?.flowRate;
                          const tlRaw = payload?.totalLiters;
                          const fr = typeof frRaw === 'number' ? frRaw : (typeof frRaw === 'string' ? parseFloat(frRaw) : undefined);
                          const tl = typeof tlRaw === 'number' ? tlRaw : (typeof tlRaw === 'string' ? parseFloat(tlRaw) : undefined);
                          if (typeof fr === 'number' && isFinite(fr)) setFlowRate(fr);
                          if (typeof tl === 'number' && isFinite(tl)) setTotalLiters(tl);
                        });
                        fbSocket4.on('connect_error', (err4) => {
                          const msg4 = err4?.message || String(err4 || 'Unknown error');
                          console.warn('Fallback socket (HTTP) connect error:', msg4);
                        });
                      }
                    });
                    fbSocket3.on('brightness:subscribed', ({ deviceId }) => {
                      Toast.show({ type: 'info', text1: 'Subscribed (fallback no auth)', text2: `Brightness for ${deviceId}`, position: 'bottom' });
                    });
                  }
                });
                fbSocket2.on('brightness:subscribed', ({ deviceId }) => {
                  Toast.show({ type: 'info', text1: 'Subscribed (fallback default path)', text2: `Brightness for ${deviceId}`, position: 'bottom' });
                });
              }
            });
            fbSocket.on('brightness:subscribed', ({ deviceId }) => {
              Toast.show({ type: 'info', text1: 'Subscribed (fallback)', text2: `Brightness for ${deviceId}`, position: 'bottom' });
            });
          }
        }, Platform.OS === 'android' ? 20000 : 10000);
        }
      } catch (err) {
        console.warn('Socket init failed:', err);
      }
    })();

    return () => {
      try {
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }
        if (socketRef) {
          const did = route?.params?.deviceId || selectedDeviceId || 'unknown';
          socketRef.emit('brightness:unsubscribe', { deviceId: did });
          socketRef.emit('flow:unsubscribe', { deviceId: did });
          socketRef.disconnect();
        }
      } catch {}
    };
  }, []);

  // Respond to route param changes when navigating to this screen repeatedly
  useEffect(() => {
    const nextDeviceId = route?.params?.deviceId;
    const fromDiscovery = !!route?.params?.fromDiscovery;
    // If a different deviceId is provided, update selection and reload info
    if (nextDeviceId && nextDeviceId !== selectedDeviceId) {
      setSelectedDeviceId(nextDeviceId);
      loadDeviceInfo(nextDeviceId);
    } else if (!nextDeviceId && fromDiscovery) {
      // Discovery flow without specific id can still refresh
      loadDeviceInfo(null);
    }
  }, [route?.params?.deviceId]);

  useEffect(() =>{
    if(device2On)
      setTimeout(() => {
        setDevice2On(false);
      }, 7000);
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

  // Load saved automation rules for selected device
  useEffect(() => {
    const loadRules = async () => {
      try {
        if (!selectedDeviceId) return;
        const key = `auto_rules_${selectedDeviceId}`;
        const json = await AsyncStorage.getItem(key);
        if (json) {
          const r = JSON.parse(json);
          setOnEnabled(!!r?.on?.enabled);
          setOnOperator(r?.on?.operator === 'ge' ? 'ge' : 'lt');
          const onThr = Number(r?.on?.threshold);
          setOnThreshold(Number.isFinite(onThr) ? onThr : 50);
          setOffEnabled(!!r?.off?.enabled);
          setOffOperator(r?.off?.operator === 'lt' ? 'lt' : 'ge');
          const offThr = Number(r?.off?.threshold);
          setOffThreshold(Number.isFinite(offThr) ? offThr : 80);
        } else {
          // Migrate old single-rule if present
          const oldJson = await AsyncStorage.getItem(`auto_rule_${selectedDeviceId}`);
          if (oldJson) {
            const r = JSON.parse(oldJson);
            if (r?.action === 'off') {
              setOffEnabled(!!r.enabled);
              setOffOperator(r.operator === 'lt' ? 'lt' : 'ge');
              const t = Number(r.threshold);
              setOffThreshold(Number.isFinite(t) ? t : 80);
            } else {
              setOnEnabled(!!r.enabled);
              setOnOperator(r.operator === 'ge' ? 'ge' : 'lt');
              const t = Number(r.threshold);
              setOnThreshold(Number.isFinite(t) ? t : 50);
            }
          }
        }
      } catch (e) {}
    };
    loadRules();
  }, [selectedDeviceId]);

  const persistRules = async () => {
    try {
      if (!selectedDeviceId) return;
      const payload = {
        on: { enabled: onEnabled, operator: onOperator, threshold: onThreshold },
        off: { enabled: offEnabled, operator: offOperator, threshold: offThreshold },
      };
      await AsyncStorage.setItem(`auto_rules_${selectedDeviceId}`, JSON.stringify(payload));
    } catch (e) {}
  };

  // Recalculate water level when brightness or target changes
  useEffect(() => {
    if (typeof brightness === 'number' && isFinite(brightness)) {
      const smoothed = smoothValue(brightness);
      const filled = brightnessToPercent(smoothed, Number(targetInput));
      setWaterLevel(filled);
    }
  }, [brightness, targetInput, showRemaining]);

  // Automation: evaluate ON/OFF rules with a small cooldown to avoid rapid toggles
  useEffect(() => {
    try {
      if (!selectedDeviceId) return;
      const now = Date.now();
      if (now - lastAutoAt < 2000) return; // 2s cooldown
      const level = Number(waterLevel);
      if (!Number.isFinite(level)) return;
      // ON rule
      if (onEnabled) {
        const onMet = onOperator === 'lt' ? level < onThreshold : level >= onThreshold;
        if (onMet && !isPowerOn) {
          toggleDeviceField('device1', true);
          setIsPowerOn(true);
          setLastAutoAt(now);
          Toast.show({ type: 'success', text1: 'Automation', text2: `Power ON at ${level}%`, position: 'bottom' });
          return;
        }
      }
      // OFF rule
      if (offEnabled) {
        const offMet = offOperator === 'lt' ? level < offThreshold : level >= offThreshold;
        if (offMet && isPowerOn) {
          toggleDeviceField('device1', false);
          setIsPowerOn(false);
          setLastAutoAt(now);
          Toast.show({ type: 'success', text1: 'Automation', text2: `Power OFF at ${level}%`, position: 'bottom' });
          return;
        }
      }
    } catch (e) {}
  }, [waterLevel, onEnabled, onOperator, onThreshold, offEnabled, offOperator, offThreshold, lastAutoAt]);

  // New rule: if flow rate drops below 5, switch off device1
  useEffect(() => {
    try {
      if (!selectedDeviceId) return;
      const fr = flowRate;
      if (typeof fr !== 'number' || !isFinite(fr)) return;
      const now = Date.now();
      if (now - lastAutoAt < 2000) return; // reuse cooldown to prevent rapid toggles
      if (fr < 5 && isPowerOn) {
        toggleDeviceField('device1', false);
        setIsPowerOn(false);
        setLastAutoAt(now);
        Toast.show({ type: 'success', text1: 'Automation', text2: `Flow low (${fr}). Power OFF`, position: 'bottom' });
      }
    } catch {}
  }, [flowRate, isPowerOn, selectedDeviceId, lastAutoAt]);

  // Alert when tank reaches 100%
  useEffect(() => {
    try {
      const level = Number(waterLevel);
      const prev = Number(prevWaterLevelRef.current || 0);
      const now = Date.now();
      const recentlyAlerted = now - (lastFullAlertAtRef.current || 0) < 30_000; // 30s cooldown

      // Re-arm alert after level drops below 95%
      if (level <= 95) {
        fullAlertArmedRef.current = true;
      }

      // Trigger only on rising edge crossing to >= 100
      if (!recentlyAlerted && fullAlertArmedRef.current && prev < 100 && level >= 100) {
        try {
          Toast.show({ type: 'success', text1: 'Tank Full', text2: 'Water tank reached 100%', position: 'bottom' });
        } catch {}

        // System notification (web and native where available)
        try { notificationService.showSystemNotification('Tank Full', 'Water tank reached 100%'); } catch {}

        // Play alternating beeps on web; vibrate on native as a fallback
        if (Platform.OS === 'web') {
          // Dynamically import web shim to avoid bundling issues elsewhere
          import('../../shims/audioShim.web')
            .then((mod) => {
              try { mod.playAlternatingBeeps({ count: 6, durationMs: 180, gapMs: 120, freqs: [880, 1320] }); } catch {}
            })
            .catch(() => {});
        } else {
          try { Vibration.vibrate([0, 400, 150, 400, 150, 400], false); } catch {}
        }

        lastFullAlertAtRef.current = now;
        fullAlertArmedRef.current = false; // disarm until it drops below threshold
      }

      prevWaterLevelRef.current = level;
    } catch {}
  }, [waterLevel]);

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
              const tRaw = devDetail.target;
              const tNum = typeof tRaw === 'number' ? tRaw : (typeof tRaw === 'string' ? parseFloat(tRaw) : undefined);
              if (typeof tNum === 'number' && isFinite(tNum) && tNum > 0) {
           
           //     setTargetValue(tNum);
                setTargetInput(targetInput);
              }
            }
            // Initialize brightness from API detail if available (fallback until socket updates arrive)
            const bRaw = devDetail?.brightness;
            const bNum = typeof bRaw === 'number' ? bRaw : (typeof bRaw === 'string' ? parseFloat(bRaw) : undefined);
            if (typeof bNum === 'number' && isFinite(bNum)) {
              setBrightness(bNum);
              const smoothed = smoothValue(bNum);
              const filled = brightnessToPercent(smoothed, Number(targetInput));
              setWaterLevel(filled);
            }
            setDevice2On(!!devDetail.device2);
            setDevice3On(!!devDetail.device3);
            setDevice4On(!!devDetail.device4);
            setDevice5On(!!devDetail.device5);
            // Resolve subdevice labels from API or stored values
            try {
              const storedLabels = await esp8266Service.getSubdeviceLabels();
              const resolveLabel = (apiValue: any, ...alts: (string | undefined)[]) => {
                if (typeof apiValue === 'string' && apiValue.trim().length) return apiValue.trim();
                for (const a of alts) {
                  if (a && a.trim && a.trim().length) return a.trim();
                }
                return undefined;
              };
              setSubLabels({
                subdevice1: resolveLabel(
                  devDetail.subdevice1,
                  devDetail.device1Name,
                  devDetail.device1_label,
                  storedLabels?.subdevice1
                ),
                subdevice2: resolveLabel(
                  devDetail.subdevice2,
                  devDetail.device2Name,
                  devDetail.device2_label,
                  storedLabels?.subdevice2
                ),
                subdevice3: resolveLabel(
                  devDetail.subdevice3,
                  devDetail.device3Name,
                  devDetail.device3_label,
                  storedLabels?.subdevice3
                ),
                subdevice4: resolveLabel(
                  devDetail.subdevice4,
                  devDetail.device4Name,
                  devDetail.device4_label,
                  storedLabels?.subdevice4
                ),
                subdevice5: resolveLabel(
                  devDetail.subdevice5,
                  devDetail.device5Name,
                  devDetail.device5_label,
                  storedLabels?.subdevice5
                ),
              });
            } catch (e) {}
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
        // Initialize brightness from server state if present (fallback until socket updates arrive)
        const sbRaw = serverState?.brightness;
        const sbNum = typeof sbRaw === 'number' ? sbRaw : (typeof sbRaw === 'string' ? parseFloat(sbRaw) : undefined);
        if (typeof sbNum === 'number' && isFinite(sbNum)) {
          setBrightness(sbNum);
          const smoothed = smoothValue(sbNum);
          const filled = brightnessToPercent(smoothed, Number(targetInput));
          setWaterLevel(filled);
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

  const toggleDeviceField = async (field: 'device1'|'device2'|'device3'|'device4'|'device5', value: boolean) => {
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
      await logService.logButtonClick('Save Target', { targetInput});
      if (!selectedDeviceId) {
        Toast.show({ type: 'error', text1: 'No Device', text2: 'Select a device first', position: 'bottom' });
        return;
      }
      const parsed = parseFloat(targetInput);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        Alert.alert(
          'Invalid Value',
          'Please enter a positive numeric target value.',
          [{ text: 'OK' }],
          { cancelable: true }
        );
        return;
      }
      const ok = await esp8266Service.updateDeviceOnServer(selectedDeviceId, { target: parsed });
      if (ok) {
        Toast.show({ type: 'success', text1: 'Saved', text2: 'Target updated on server', position: 'bottom' });
        // Update local target and recalc using current brightness

  //      setTargetValue(targetValue);
       setTargetInput(targetInput);
        const smoothed = smoothValue(brightness ?? 0);
        const filled = brightnessToPercent(smoothed, Number(targetInput));
        setWaterLevel(showRemaining ? 100 - filled : filled);
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
      if (!selectedDeviceId) {
        throw new Error('No device selected');
      }
      const ok = await esp8266Service.controlDeviceOnServer(selectedDeviceId, value ? 'on' : 'off');
      if (ok) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `Device turned ${value ? 'on' : 'off'} successfully`,
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
          {activeSocketHost ? (
            <Text style={{ color: '#666', marginTop: 4 }}>Socket Host: {activeSocketHost}</Text>
          ) : null}
          <TouchableOpacity onPress={handleRefresh} style={{ marginTop: 8 }}>
            <Text style={{ color: '#4a90e2', fontWeight: '600' }}>Refresh</Text>
          </TouchableOpacity>
        </View>
        {/* Display: Tank Filled percent */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ color: '#333', fontWeight: '600' }}>Tank Filled %</Text>
        </View>
        <WaterTank percentage={waterLevel ?? 0} />
        <View style={{ marginTop: 10 }}>
          <Text style={{ color: '#666' }}>Exact Data: {brightness ?? '—'}</Text>
        </View>
        <View style={styles.controlSection}>
          <Text style={styles.sectionTitle}>Power Control</Text>
          <View style={styles.powerControl}>
            <Text style={styles.powerLabel}>{subLabels?.subdevice1 || 'Power'}</Text>
            <Switch
              value={isPowerOn}
              onValueChange={(val) => {
                setIsPowerOn(val);
                toggleDeviceField('device1', val);
            
              }}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={isPowerOn ? '#fff' : '#f4f3f4'}
            />
          </View>
          {/* Automation rules UI: Turn ON and Turn OFF */}
          <View style={{ marginTop: 12 }}>
            <Text style={styles.sectionTitle}>Automation Rules: Power</Text>
            {/* Turn ON Rule */}
            <View style={{ marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eee' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={styles.powerLabel}>Turn ON rule</Text>
                <Switch
                  value={onEnabled}
                  onValueChange={(v) => { setOnEnabled(v); persistRules(); }}
                  trackColor={{ false: '#767577', true: '#4CAF50' }}
                  thumbColor={onEnabled ? '#fff' : '#f4f3f4'}
                />
              </View>
              <Text style={styles.infoLabel}>When level is</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <TouchableOpacity
                  onPress={() => setShowOnOperatorMenu((s) => !s)}
                  style={{ paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fafafa', flex: 1, marginRight: 8 }}
                >
                  <Text style={{ color: '#333' }}>{onOperator === 'lt' ? 'Less than' : 'More than or equal'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowOnPercentMenu((s) => !s)}
                  style={{ paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fafafa', flex: 1, marginLeft: 8 }}
                >
                  <Text style={{ color: '#333' }}>{onThreshold}%</Text>
                </TouchableOpacity>
              </View>
              {showOnOperatorMenu && (
                <View style={{ marginTop: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff' }}>
                  {[
                    { key: 'lt', label: 'Less than' },
                    { key: 'ge', label: 'More than or equal' },
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => {
                        const next = opt.key === 'ge' ? 'ge' : 'lt';
                        setOnOperator(next);
                        setShowOnOperatorMenu(false);
                        persistRules();
                      }}
                      style={{ paddingVertical: 10, paddingHorizontal: 12 }}
                    >
                      <Text style={{ color: '#333' }}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {showOnPercentMenu && (
                <View style={{ marginTop: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff' }}>
                  {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((p) => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => {
                        setOnThreshold(p);
                        setShowOnPercentMenu(false);
                        persistRules();
                      }}
                      style={{ paddingVertical: 10, paddingHorizontal: 12 }}
                    >
                      <Text style={{ color: '#333' }}>{p}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Turn OFF Rule */}
            <View style={{ marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#eee' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={styles.powerLabel}>Turn OFF rule</Text>
                <Switch
                  value={offEnabled}
                  onValueChange={(v) => { setOffEnabled(v); persistRules(); }}
                  trackColor={{ false: '#767577', true: '#4CAF50' }}
                  thumbColor={offEnabled ? '#fff' : '#f4f3f4'}
                />
              </View>
              <Text style={styles.infoLabel}>When level is</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <TouchableOpacity
                  onPress={() => setShowOffOperatorMenu((s) => !s)}
                  style={{ paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fafafa', flex: 1, marginRight: 8 }}
                >
                  <Text style={{ color: '#333' }}>{offOperator === 'lt' ? 'Less than' : 'More than or equal'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowOffPercentMenu((s) => !s)}
                  style={{ paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fafafa', flex: 1, marginLeft: 8 }}
                >
                  <Text style={{ color: '#333' }}>{offThreshold}%</Text>
                </TouchableOpacity>
              </View>
              {showOffOperatorMenu && (
                <View style={{ marginTop: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff' }}>
                  {[
                    { key: 'lt', label: 'Less than' },
                    { key: 'ge', label: 'More than or equal' },
                  ].map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => {
                        const next = opt.key === 'lt' ? 'lt' : 'ge';
                        setOffOperator(next);
                        setShowOffOperatorMenu(false);
                        persistRules();
                      }}
                      style={{ paddingVertical: 10, paddingHorizontal: 12 }}
                    >
                      <Text style={{ color: '#333' }}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {showOffPercentMenu && (
                <View style={{ marginTop: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, backgroundColor: '#fff' }}>
                  {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((p) => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => {
                        setOffThreshold(p);
                        setShowOffPercentMenu(false);
                        persistRules();
                      }}
                      style={{ paddingVertical: 10, paddingHorizontal: 12 }}
                    >
                      <Text style={{ color: '#333' }}>{p}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <Text style={{ marginTop: 8, color: '#666' }}>Current level: {waterLevel}%</Text>
          </View>
               <View style={{ marginTop: 12 }}>
            <Text style={styles.sectionTitle}>Flow Data </Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Flow Rate</Text>
              <Text style={styles.infoValue}>{typeof flowRate === 'number' ? `${flowRate} L/min` : '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total Liters</Text>
              <Text style={styles.infoValue}>{typeof totalLiters === 'number' ? `${totalLiters} L` : '—'}</Text>
            </View>
          </View>
        </View>
     
        <View style={[styles.controlSection, { marginTop: 10 }] }>
          <Text style={styles.sectionTitle}>GPIO Controls</Text>
          <View style={styles.powerControl}>
          <Text style={styles.powerLabel}>{subLabels?.subdevice2 || 'Door Lock'}</Text>
          <Switch
            value={device2On}
            onValueChange={(val) => {
              setDevice2On(val);
              toggleDeviceField('device2', val);
              if (val) {
                setTimeout(() => {
                  setDevice2On(false);
                  toggleDeviceField('device2', false);
                }, 7000);
              }
            }}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
            thumbColor={device2On ? '#fff' : '#e0cae0ff'}
          />
        </View>
        <View style={styles.powerControl}>
          <Text style={styles.powerLabel}>{subLabels?.subdevice3 || 'Watering Plants'}</Text>
          <Switch
            value={device3On}
            onValueChange={(val) => { setDevice3On(val); toggleDeviceField('device3', val); }}
            trackColor={{ false: '#767577', true: '#4CAF50' }}
            thumbColor={device3On ? '#fff' : '#e6d2e6ff'}
          />
        </View>
       
         
          <View style={styles.powerControl}>
            <Text style={styles.powerLabel}>{subLabels?.subdevice4 || 'Dog Feed'}</Text>
            <Switch
              value={device4On}
              onValueChange={(val) => { setDevice4On(val); toggleDeviceField('device4', val); }}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={device4On ? '#fff' : '#f4f3f4'}
            />
          </View>
          <View style={styles.powerControl}>
            <Text style={styles.powerLabel}>{subLabels?.subdevice5 || 'AC Control'}</Text>
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
              value={targetInput}
              onChangeText={(text) => setTargetInput(text)}
              onBlur={() => {
                const parsed = parseFloat(targetInput);
                if (!Number.isFinite(parsed) || parsed <= 0) {
                  Alert.alert(
                    'Invalid Value',
                    'Please enter a positive numeric target value.',
                    [{ text: 'OK' }],
                    { cancelable: true }
                  );
                }
              }}
              onEndEditing={() => {
                const parsed = parseFloat(targetInput);
                if (!Number.isFinite(parsed) || parsed <= 0) {
                  Alert.alert(
                    'Invalid Value',
                    'Please enter a positive numeric target value.',
                    [{ text: 'OK' }],
                    { cancelable: true }
                  );
                }
              }}
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
