import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Vibration,
  Platform,
  Alert,
  Modal,
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
import subscriptionService from '../../services/subscriptions/subscriptionService';

import { SimpleDateTime } from '../../components/SimpleDateTime';
import { AppSwitch } from '../../components/AppSwitch';
import { DateTimePickerManager, DateTimePickerManagerRef } from '../../components/DateTimePickerManager';
import { COLORS, SHADOWS } from '../../theme/theme';
import Svg, { Path } from 'react-native-svg';


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




const formatOneTimeDate = (date: Date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const DeviceControlScreen: React.FC<{ navigation: any, route?: { params?: { deviceId?: string, fromDiscovery?: boolean } } }> = ({ navigation, route }) => {
  const [deviceName, setDeviceName] = useState('');
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPowerOn, setIsPowerOn] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedDeviceIp, setSelectedDeviceIp] = useState<string | null>(null);
  const [targetValue, setTargetValue] = useState<number>(0);
  const targetValueRef = useRef<number>(0);
  const [targetInput, setTargetInput] = useState<string>("");

  useEffect(() => {
    targetValueRef.current = targetValue;
  }, [targetValue]);


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
  const [subscriptionActive, setSubscriptionActive] = useState<0 | 1>(1);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);
  const brightnessBufferRef = React.useRef<number[]>([]);
  const SMOOTH_WINDOW = 5;
  const { user } = useAuth();
  const [activeSocketHost, setActiveSocketHost] = useState<string | null>(null);
  // Debug panel state
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [lastBrightness, setLastBrightness] = useState<number | null>(null);
  const [lastBrightnessAt, setLastBrightnessAt] = useState<number | null>(null);
  const [lastFlowRate, setLastFlowRate] = useState<number | null>(null);
  const [lastTotalLiters, setLastTotalLiters] = useState<number | null>(null);
  const [lastFlowAt, setLastFlowAt] = useState<number | null>(null);
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
  // No-flow auto OFF rule
  const [noFlowAutoOffEnabled, setNoFlowAutoOffEnabled] = useState<boolean>(false);
  const [noFlowDelaySec, setNoFlowDelaySec] = useState<number>(40);
  const [showNoFlowDelayMenu, setShowNoFlowDelayMenu] = useState<boolean>(false);

  // Supply Water Timer State
  const [supplyWaterTimerEnabled, setSupplyWaterTimerEnabled] = useState<boolean>(false);
  const [supplyWaterFrequency, setSupplyWaterFrequency] = useState<'once' | 'everyday'>('everyday');
  const [morningScheduleEnabled, setMorningScheduleEnabled] = useState<boolean>(true);
  const [morningStartTime, setMorningStartTime] = React.useState<Date | null>(null);
  const [morningEndTime, setMorningEndTime] = React.useState<Date | null>(null);
  const [eveningScheduleEnabled, setEveningScheduleEnabled] = useState<boolean>(true);
  const [eveningStartTime, setEveningStartTime] = React.useState<Date | null>(null);
  const [eveningEndTime, setEveningEndTime] = React.useState<Date | null>(null);
  const [lastTimerCheck, setLastTimerCheck] = useState<number>(0);
  const [debugCurrentTime, setDebugCurrentTime] = useState<Date>(new Date());
  const [supplyWaterTimerStatus, setSupplyWaterTimerStatus] = useState<string>('Idle');
  const [lastForcedOn, setLastForcedOn] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => setDebugCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Watering Plants Timer State
  const [wateringPlantsTimerEnabled, setWateringPlantsTimerEnabled] = useState<boolean>(false);
  const [wateringPlantsFrequency, setWateringPlantsFrequency] = useState<'once' | 'everyday'>('everyday');
  const [wateringPlantsMorningEnabled, setWateringPlantsMorningEnabled] = useState<boolean>(true);
  const [wateringPlantsMorningStart, setWateringPlantsMorningStart] = React.useState<Date | null>(null);
  const [wateringPlantsMorningEnd, setWateringPlantsMorningEnd] = React.useState<Date | null>(null);
  const [wateringPlantsEveningEnabled, setWateringPlantsEveningEnabled] = useState<boolean>(true);
  const [wateringPlantsEveningStart, setWateringPlantsEveningStart] = React.useState<Date | null>(null);
  const [wateringPlantsEveningEnd, setWateringPlantsEveningEnd] = React.useState<Date | null>(null);

  // Dog Feed Timer State
  const [dogFeedTimerEnabled, setDogFeedTimerEnabled] = useState<boolean>(false);
  const [dogFeedFrequency, setDogFeedFrequency] = useState<'once' | 'everyday'>('everyday');
  const [dogFeedMorningEnabled, setDogFeedMorningEnabled] = useState<boolean>(true);
  const [dogFeedMorningStart, setDogFeedMorningStart] = React.useState<Date | null>(null);
  const [dogFeedMorningEnd, setDogFeedMorningEnd] = React.useState<Date | null>(null);
  const [dogFeedEveningEnabled, setDogFeedEveningEnabled] = useState<boolean>(true);
  const [dogFeedEveningStart, setDogFeedEveningStart] = React.useState<Date | null>(null);
  const [dogFeedEveningEnd, setDogFeedEveningEnd] = React.useState<Date | null>(null);

  // AC Control Timer State
  const [acControlTimerEnabled, setAcControlTimerEnabled] = useState<boolean>(false);
  const [acControlFrequency, setAcControlFrequency] = useState<'once' | 'everyday'>('everyday');
  const [acControlMorningEnabled, setAcControlMorningEnabled] = useState<boolean>(true);
  const [acControlMorningStart, setAcControlMorningStart] = React.useState<Date | null>(null);
  const [acControlMorningEnd, setAcControlMorningEnd] = React.useState<Date | null>(null);
  const [acControlEveningEnabled, setAcControlEveningEnabled] = useState<boolean>(true);
  const [acControlEveningStart, setAcControlEveningStart] = React.useState<Date | null>(null);
  const [acControlEveningEnd, setAcControlEveningEnd] = React.useState<Date | null>(null);

  // Gate automation until rules are loaded to avoid unintended toggles
  const rulesLoadedRef = React.useRef<boolean>(false);
  const [rulesLoaded, setRulesLoaded] = useState<boolean>(false);
  const noFlowTimerRef = React.useRef<any>(null);
  
  const pickerRef = useRef<DateTimePickerManagerRef>(null);

  const validateTimeSelection = (
    newDate: Date,
    type: 'start' | 'end',
    frequency: 'once' | 'everyday',
    otherDate: Date | null,
    setter: (d: Date) => void
  ) => {
    const now = new Date();
    
    // 1. Check for Past Time (Strictly for 'once' frequency)
    if (frequency === 'once') {
       if (newDate < now) {
         Alert.alert('Invalid Time', 'Please select a future date and time.');
         return;
       }
    }

    // 2. Check Start < End difference
    if (otherDate) {
       if (frequency === 'once') {
          // Compare full dates
          if (type === 'start' && newDate >= otherDate) {
             Alert.alert('Invalid Time', 'Start time must be before end time.');
             return;
          }
          if (type === 'end' && newDate <= otherDate) {
             Alert.alert('Invalid Time', 'End time must be after start time.');
             return;
          }
       } else {
          // Compare HH:MM only
          const newMins = newDate.getHours() * 60 + newDate.getMinutes();
          const otherMins = otherDate.getHours() * 60 + otherDate.getMinutes();
          
          if (type === 'start' && newMins >= otherMins) {
             Alert.alert('Invalid Time', 'Start time must be earlier than end time.');
             return;
          }
          if (type === 'end' && newMins <= otherMins) {
             Alert.alert('Invalid Time', 'End time must be later than start time.');
             return;
          }
       }
    }

    setter(newDate);
  };

  const openPicker = (config: { value: Date | null, onChange: (d: Date) => void, type: 'date'|'time'|'datetime' }) => {
      pickerRef.current?.open(config);
  };

  const isPowerOnRef = React.useRef<boolean>(false);
  const flowRateRef = React.useRef<number | undefined>(undefined);
  // Ensure UI shows power OFF by default on first load
  // Full tank alert state
  const prevWaterLevelRef = React.useRef<number>(0);
  const lastFullAlertAtRef = React.useRef<number>(0);
  const fullAlertArmedRef = React.useRef<boolean>(true); // re-arm when level drops sufficiently
  const isFirstLoadRef = React.useRef<boolean>(true);
  // Subscription plan to display price on per-device buttons
  const [billingPlan, setBillingPlan] = useState<{ id: string; name: string; price: number; currency: string; interval: string } | null>(null);
  const canControl = React.useMemo(() => {
    if (user?.role === 'admin') return true;
    if (subscriptionActive !== 1) return false;
    if (!subscriptionEndDate) return false;
    const exp = new Date(String(subscriptionEndDate));
    if (isNaN(exp.getTime())) return false;
    const now = new Date();
    exp.setHours(23, 59, 59, 999);
    return exp.getTime() >= now.getTime();
  }, [user?.role, subscriptionActive, subscriptionEndDate]);
  
  // React.useMemo(() => {
  //   if (subscriptionActive !== 1 ) return false;
  //   if (!subscriptionEndDate) return false;
  //   const exp = new Date(String(subscriptionEndDate));
  //   if (isNaN(exp.getTime())) return false;
  //   const now = new Date();
  //   exp.setHours(23, 59, 59, 999);
  //   return exp.getTime() >= now.getTime();
  // }, [subscriptionActive, subscriptionEndDate]);

  useEffect(() => {
    (async () => {
      try {
        const ps = await subscriptionService.getPlans();
        const preferred = ps?.find((p) => p.id === 'monthly_99');
        // fallback to cheapest plan if monthly not found
        const cheapest = ps && ps.length ? ps.reduce((min, p) => (p.price < min.price ? p : min), ps[0]) : null;
        setBillingPlan(preferred || cheapest || null);
      } catch (_) {
        // fallback local default
        setBillingPlan({ id: 'monthly_99', name: 'Monthly', price: 99, currency: 'INR', interval: 'month' });
      }
    })();
  }, []);

  const navigateToSubscriptionCheckout = (planOverride?: { id: string; name: string; price: number; currency: string; interval: string }) => {
    const plan = planOverride || billingPlan;
    if (!plan) {
      Toast.show({ type: 'error', text1: 'Plans unavailable', text2: 'Please try again later', position: 'bottom' });
      return;
    }
    try { logService.logButtonClick('Subscribe Device'); } catch {}
    const parent = navigation?.getParent?.();
    if (parent) parent.navigate('Subscriptions', { screen: 'SubscriptionCheckout', params: { plan } });
    else navigation.navigate('SubscriptionCheckout', { plan });
  };
  
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
  if (rawBrightness === -1) return 0; // Handle specific error code for empty tank
  if (!Number.isFinite(rawBrightness)) {
    return 0;
  }
  // Offset correction: user indicates that when sensor reads 25, the actual distance is 10.
  // This implies an offset of 15 (25 - 10 = 15).
  // Corrected Distance = Sensor Reading - 15.
  const SENSOR_OFFSET = 15;
  const correctedDistance = Math.max(0, rawBrightness - SENSOR_OFFSET);
  
  const t = Number.isFinite(target) && target > 0 ? target : 100;
  
  // Percentage = ((Target - CorrectedDistance) / Target) * 100
  // Note: if CorrectedDistance > Target (empty), result is near 0%.
  // If CorrectedDistance is 0 (full), result is 100%.
  
  // Calculate percentage of EMPTY space
  const emptyPercent = (correctedDistance / t) * 100;
  
  // Fill percent is 100 - emptyPercent
  const filled = 100 - emptyPercent;
  
  return Math.max(0, Math.min(100, Math.round(filled)));
};

  
  // Track whether we've received brightness via socket; used for failover
  const brightnessReceivedRef = React.useRef<boolean>(false);
  const flowReceivedRef = React.useRef<boolean>(false);
  const fallbackTimerRef = React.useRef<any>(null);
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
        const isDev = (typeof __DEV__ !== 'undefined' ? __DEV__ : false);
        const transportList = Platform.OS === 'android' ? ['polling'] : (isDev ? ['polling'] : ['websocket', 'polling']);
        const socketPath = '/voodoo/socket.io';
        brightnessReceivedRef.current = false;
        flowReceivedRef.current = false;

        const handleFlowUpdate = (payload: any) => {
          console.log('[Socket] Flow update received:', JSON.stringify(payload));
          let frRaw = payload?.flowRate ?? payload?.flow_rate ?? payload?.FlowRate;
          if (frRaw === undefined && payload?.data) {
             frRaw = payload.data.flowRate ?? payload.data.flow_rate ?? payload.data.FlowRate;
          }
          let tlRaw = payload?.totalLiters ?? payload?.total_liters ?? payload?.TotalLiters;
          if (tlRaw === undefined && payload?.data) {
             tlRaw = payload.data.totalLiters ?? payload.data.total_liters ?? payload.data.TotalLiters;
          }
          const fr = typeof frRaw === 'number' ? frRaw : (typeof frRaw === 'string' ? parseFloat(frRaw) : undefined);
          const tl = typeof tlRaw === 'number' ? tlRaw : (typeof tlRaw === 'string' ? parseFloat(tlRaw) : undefined);

          if (typeof fr === 'number' && isFinite(fr)) {
             setFlowRate(fr);
             setLastFlowRate(fr);
           }
          if (typeof tl === 'number' && isFinite(tl)) {
             setTotalLiters(tl);
             setLastTotalLiters(tl);
          }
          setLastFlowAt(Date.now());
          flowReceivedRef.current = true;
        };

        const handleBrightnessUpdate = (payload: any) => {
          brightnessReceivedRef.current = true;
          let raw: number | undefined;
          // Unwrap data if present
          const data = payload?.data || payload;

          if (typeof data?.brightness === 'number') {
            raw = data.brightness;
          } else if (typeof data?.value === 'number') {
            raw = data.value;
          } else if (typeof data?.brightness === 'string') {
            const parsed = parseFloat(data.brightness);
            raw = isNaN(parsed) ? undefined : parsed;
          } else if (typeof data?.value === 'string') {
            const parsed = parseFloat(data.value);
            raw = isNaN(parsed) ? undefined : parsed;
          } else if (typeof payload === 'string') {
            const parsed = parseFloat(payload);
            raw = isNaN(parsed) ? undefined : parsed;
          } else if (typeof payload === 'number') {
            raw = payload;
          }

          if (typeof raw === 'number' && isFinite(raw)) {
            const smoothed = smoothValue(raw);
            setBrightness(smoothed);
            const filled = brightnessToPercent(smoothed, targetValueRef.current);
            setWaterLevel(filled);
            setLastBrightness(raw);
            setLastBrightnessAt(Date.now());
          }
        };

        const socket = io(appConstants.CHAT_BASE_URL, {
          transports: transportList,
          upgrade: transportList.includes('websocket'),
          path: socketPath,
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
          setSocketConnected(true);
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
          //  Toast.show({ type: 'info', text1: 'Connected', text2: `Subscribed to Data updates for ${did}`, position: 'bottom' });
          } catch (e) {
            console.warn('Failed to subscribe brightness:', e);
          }
        });
        socket.on('connect_error', (err) => {
          const msg = err?.message || String(err || 'Unknown error');
          console.warn('Socket connect error:', msg);
          Toast.show({ type: 'error', text1: 'Socket Error', text2: msg, position: 'bottom' });
          setSocketConnected(false);
          // If custom path fails, retry once with default Socket.IO path on primary host
          try {
            if (!(globalThis as any).__primaryPathRetried) {
              (globalThis as any).__primaryPathRetried = true;
              try { socket.disconnect(); } catch {}
              const tokenRetry = (async () => (await authService.getToken()) || '')();
              Promise.resolve(tokenRetry).then((tkn) => {
                const retrySocket = io(appConstants.CHAT_BASE_URL, {
                  transports: transportList,
                  upgrade: transportList.includes('websocket'),
                  path: socketPath,
                  reconnection: true,
                  timeout: 15000,
                  forceNew: true,
                  reconnectionAttempts: 999999, // keep trying forever
                  reconnectionDelay: 1200,
                  reconnectionDelayMax: 5000,
                  auth: { token: tkn },
                  query: { token: tkn },
                  extraHeaders: { Authorization: `Bearer ${tkn}` },
                });
                setSocketRef(retrySocket);
                retrySocket.on('connect', async () => {
                  setSocketConnected(true);
                  setActiveSocketHost(appConstants.CHAT_BASE_URL);
                  try {
                    const did = initialDeviceId || selectedDeviceId;
                    if (!did) return;
                    const dev = await esp8266Service.getDeviceFromServer(did);
                    const ip = dev?.ipAddress || dev?.ip || null;
                    setSelectedDeviceIp(ip);
                    if (ip) retrySocket.emit('brightness:subscribe', { deviceId: did, ip });
                    else retrySocket.emit('brightness:subscribe', { deviceId: did });
                    retrySocket.emit('flow:subscribe', { deviceId: did });
                  } catch (e2) {}
                });
              });
            }
          } catch {}
        });
        socket.on('disconnect', () => {
          setSocketConnected(false);
        });
        socket.on('brightness:subscribed', ({ deviceId }) => {
        //  Toast.show({ type: 'info', text1: 'Subscribed', text2: `Brightness for ${deviceId}`, position: 'bottom' });
        });
        socket.on('flow:subscribed', ({ deviceId }) => {
         // Toast.show({ type: 'info', text1: 'Subscribed', text2: `Flow for ${deviceId}`, position: 'bottom' });
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
            // Ensure flow subscription is also restored on reconnect
            socket.emit('flow:subscribe', { deviceId: did });
          } catch (e) {}
        });
        socket.on('brightness:update', handleBrightnessUpdate);
        socket.on('flow:update', handleFlowUpdate);
        socket.on('brightness:error', ({ error }) => {
          // Suppress noisy device polling timeouts and missing IP warnings
          const msg = String(error || '');
          if (/timeout/i.test(msg) || /Missing device IP/i.test(msg)) return;
          console.warn('Brightness socket error:', msg);
        });
        // If no brightness or flow arrives within timeout, switch to fallback host
        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
        }
        if (appConstants.DISABLE_FALLBACK_SOCKET) {
          console.warn('Fallback socket disabled by config. Skipping fallback attempts.');
        } else {
        fallbackTimerRef.current = setTimeout(async () => {
          if (!brightnessReceivedRef.current && !flowReceivedRef.current) {
            try { socket.disconnect(); } catch {}
            const fbSocket = io(appConstants.CHAT_FALLBACK_URL, {
              transports: transportList,
              upgrade: transportList.includes('websocket'),
              path: socketPath,
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
            fbSocket.on('brightness:update', handleBrightnessUpdate);
            fbSocket.on('flow:update', handleFlowUpdate);
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
                fbSocket2.on('brightness:update', handleBrightnessUpdate);
                fbSocket2.on('flow:update', handleFlowUpdate);
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
                    fbSocket3.on('brightness:update', handleBrightnessUpdate);
                    fbSocket3.on('flow:update', handleFlowUpdate);
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
                        fbSocket4.on('brightness:update', handleBrightnessUpdate);
                        fbSocket4.on('flow:update', handleFlowUpdate);
                        fbSocket4.on('connect_error', (err4) => {
                          const msg4 = err4?.message || String(err4 || 'Unknown error');
                          console.warn('Fallback socket (HTTP) connect error:', msg4);
                        });
                      }
                    });
                    fbSocket3.on('brightness:subscribed', ({ deviceId }) => {
                      // Toast.show({ type: 'info', text1: 'Subscribed (fallback no auth)', text2: `Brightness for ${deviceId}`, position: 'bottom' });
                    });
                  }
                });
                fbSocket2.on('brightness:subscribed', ({ deviceId }) => {
                //  Toast.show({ type: 'info', text1: 'Subscribed (fallback default path)', text2: `Brightness for ${deviceId}`, position: 'bottom' });
                });
              }
            });
            fbSocket.on('brightness:subscribed', ({ deviceId }) => {
            //  Toast.show({ type: 'info', text1: 'Subscribed (fallback)', text2: `Brightness for ${deviceId}`, position: 'bottom' });
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

  // Polling fallback to ensure data freshness regardless of socket status
  useEffect(() => {
    let isMounted = true;
    const intervalId = setInterval(async () => {
      if (!selectedDeviceId) return;
      try {
        const state = await esp8266Service.getDeviceStateFromServer(selectedDeviceId);
        if (state && isMounted) {
          // Log polled state for debugging
          console.log('[Polling] State:', JSON.stringify(state));

          // 1. Update Flow Rate
          let frRaw = state.flowRate ?? state.flow_rate ?? state.FlowRate;
          if (frRaw === undefined && state.data) {
             frRaw = state.data.flowRate ?? state.data.flow_rate;
          }
          const fr = typeof frRaw === 'number' ? frRaw : (typeof frRaw === 'string' ? parseFloat(frRaw) : undefined);
          if (typeof fr === 'number' && isFinite(fr)) {
            setFlowRate(fr);
            setLastFlowRate(fr);
          }

          // 2. Update Total Liters
          let tlRaw = state.totalLiters ?? state.total_liters ?? state.TotalLiters;
           if (tlRaw === undefined && state.data) {
             tlRaw = state.data.totalLiters ?? state.data.total_liters;
          }
          const tl = typeof tlRaw === 'number' ? tlRaw : (typeof tlRaw === 'string' ? parseFloat(tlRaw) : undefined);
          if (typeof tl === 'number' && isFinite(tl)) {
            setTotalLiters(tl);
            setLastTotalLiters(tl);
          }
          
          setLastFlowAt(Date.now());

          // 3. Update Brightness / Water Level if available
          let brRaw = state.brightness ?? state.value ?? state.waterLevel;
          if (brRaw === undefined && state.data) {
             brRaw = state.data.brightness ?? state.data.value;
          }
           const br = typeof brRaw === 'number' ? brRaw : (typeof brRaw === 'string' ? parseFloat(brRaw) : undefined);
           if (typeof br === 'number' && isFinite(br)) {
              const smoothed = smoothValue(br);
              setBrightness(smoothed);
              const filled = brightnessToPercent(smoothed, targetValueRef.current);
              setWaterLevel(filled);
              setLastBrightness(br);
              setLastBrightnessAt(Date.now());
           }
        }
      } catch (e) {
         console.warn('[Polling] Failed:', e);
      }
    }, 2000); // Poll every 2 seconds

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [selectedDeviceId]);

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
      }, 3000);
  })

  // Re-subscribe brightness updates when IP becomes available or changes
  useEffect(() => {
    if (socketRef && selectedDeviceId) {
      try {
          brightnessReceivedRef.current = false;
          flowReceivedRef.current = false;
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

  // Helper to safely parse date/time strings
  const getSafeDate = (val: any): Date | null => {
    if (!val) return null;
    if (val instanceof Date) return val;

    // Handle legacy space-separated dates
    const cleanVal = typeof val === 'string' ? val.replace(' ', 'T') : val;
    
    // Try as ISO or full date
    const d = new Date(cleanVal);
    if (!isNaN(d.getTime())) return d;
    
    // Try as HH:MM
    if (typeof val === 'string' && val.includes(':')) {
        const parts = val.split(':');
        if (parts.length >= 2) {
             const now = new Date();
             const h = parseInt(parts[0], 10);
             const m = parseInt(parts[1], 10);
             if (!isNaN(h) && !isNaN(m)) {
                now.setHours(h, m, 0, 0);
                return now;
             }
        }
    }
    return null;
  };

  const checkSchedule = (now: Date, enabled: boolean, frequency: string, start: Date | null, end: Date | null) => {
      if (!enabled || !start || !end) return { active: false, finished: false };
      
      // Safety check for invalid dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          console.warn('[Schedule] Invalid start/end date', { start, end });
          return { active: false, finished: false };
      }

      let active = false;
      let finished = false;
      
      if (frequency === 'once') {
           const s = new Date(start);
           const e = new Date(end);
           if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
                       active = now >= s && now < e;
                       // For 'once', we want to catch it even if we missed the exact end time
                       // because we will disable the timer immediately after handling it.
                       finished = now >= e; 
                   }
              } else {
           const currentMins = now.getHours() * 60 + now.getMinutes();
           const sMins = start.getHours() * 60 + start.getMinutes();
           const eMins = end.getHours() * 60 + end.getMinutes();
           
           if (sMins < eMins) {
               active = currentMins >= sMins && currentMins < eMins;
           } else {
               // Overnight
               active = currentMins >= sMins || currentMins < eMins;
           }
           
           // Simple finished check (within 5 mins after end)
           // Handle midnight wrap for finished check if needed, but keeping simple for now
           const diff = (currentMins - eMins + 1440) % 1440;
           finished = diff >= 0 && diff < 5;
      }
      return { active, finished };
  };

  const applyRules = (r: any) => {
    if (!r) return;

    setOnEnabled(!!r?.on?.enabled);
    setOnOperator(r?.on?.operator === 'ge' ? 'ge' : 'lt');
    const onThr = Number(r?.on?.threshold);
    setOnThreshold(Number.isFinite(onThr) ? onThr : 50);
    setOffEnabled(!!r?.off?.enabled);
    setOffOperator(r?.off?.operator === 'lt' ? 'lt' : 'ge');
    const offThr = Number(r?.off?.threshold);
    setOffThreshold(Number.isFinite(offThr) ? offThr : 80);
    // No-flow rule
    setNoFlowAutoOffEnabled(!!r?.noFlow?.enabled);
    const nfDelay = Number(r?.noFlow?.delaySec);
    setNoFlowDelaySec(Number.isFinite(nfDelay) ? nfDelay : 40);
    
    // Supply Water Timer
    setSupplyWaterTimerEnabled(!!r?.supplyWater?.enabled);
    setSupplyWaterFrequency(r?.supplyWater?.frequency === 'once' ? 'once' : 'everyday');
    setMorningScheduleEnabled(r?.supplyWater?.morningEnabled !== false);
    setMorningStartTime(getSafeDate(r?.supplyWater?.morningStart));
    setMorningEndTime(getSafeDate(r?.supplyWater?.morningEnd));
    setEveningScheduleEnabled(r?.supplyWater?.eveningEnabled !== false);
    setEveningStartTime(getSafeDate(r?.supplyWater?.eveningStart));
    setEveningEndTime(getSafeDate(r?.supplyWater?.eveningEnd));

    // Watering Plants Timer
    setWateringPlantsTimerEnabled(!!r?.wateringPlants?.enabled);
    setWateringPlantsFrequency(r?.wateringPlants?.frequency === 'once' ? 'once' : 'everyday');
    setWateringPlantsMorningEnabled(r?.wateringPlants?.morningEnabled !== false);
    setWateringPlantsMorningStart(getSafeDate(r?.wateringPlants?.morningStart));
    setWateringPlantsMorningEnd(getSafeDate(r?.wateringPlants?.morningEnd));
    setWateringPlantsEveningEnabled(r?.wateringPlants?.eveningEnabled !== false);
    setWateringPlantsEveningStart(getSafeDate(r?.wateringPlants?.eveningStart));
    setWateringPlantsEveningEnd(getSafeDate(r?.wateringPlants?.eveningEnd));

    // Dog Feed Timer
    setDogFeedTimerEnabled(!!r?.dogFeed?.enabled);
    setDogFeedFrequency(r?.dogFeed?.frequency === 'once' ? 'once' : 'everyday');
    setDogFeedMorningEnabled(r?.dogFeed?.morningEnabled !== false);
    setDogFeedMorningStart(getSafeDate(r?.dogFeed?.morningStart));
    setDogFeedMorningEnd(getSafeDate(r?.dogFeed?.morningEnd));
    setDogFeedEveningEnabled(r?.dogFeed?.eveningEnabled !== false);
    setDogFeedEveningStart(getSafeDate(r?.dogFeed?.eveningStart));
    setDogFeedEveningEnd(getSafeDate(r?.dogFeed?.eveningEnd));

    // AC Control Timer
    setAcControlTimerEnabled(!!r?.acControl?.enabled);
    setAcControlFrequency(r?.acControl?.frequency === 'once' ? 'once' : 'everyday');
    setAcControlMorningEnabled(r?.acControl?.morningEnabled !== false);
    setAcControlMorningStart(getSafeDate(r?.acControl?.morningStart));
    setAcControlMorningEnd(getSafeDate(r?.acControl?.morningEnd));
    setAcControlEveningEnabled(r?.acControl?.eveningEnabled !== false);
    setAcControlEveningStart(getSafeDate(r?.acControl?.eveningStart));
    setAcControlEveningEnd(getSafeDate(r?.acControl?.eveningEnd));

    setRulesLoaded(true);
  };

  // Load saved automation rules for selected device
  useEffect(() => {
    const loadRules = async () => {
      try {
        if (!selectedDeviceId) return;
        const key = `auto_rules_${selectedDeviceId}`;
        const json = await AsyncStorage.getItem(key);
        if (json) {
          const r = JSON.parse(json);
          applyRules(r);
        } else {
          // Migrate old single-rule if present
          const oldJson = await AsyncStorage.getItem(`auto_rule_${selectedDeviceId}`);
          if (oldJson) {
            const r = JSON.parse(oldJson);
            if (r?.action === 'off') {
              // Do not auto-enable legacy rules on migration; require explicit opt-in
              setOffEnabled(false);
              setOffOperator(r.operator === 'lt' ? 'lt' : 'ge');
              const t = Number(r.threshold);
              setOffThreshold(Number.isFinite(t) ? t : 80);
            } else {
              // Do not auto-enable legacy rules on migration; require explicit opt-in
              setOnEnabled(false);
              setOnOperator(r.operator === 'ge' ? 'ge' : 'lt');
              const t = Number(r.threshold);
              setOnThreshold(Number.isFinite(t) ? t : 50);
            }
            // Persist migrated rules with enabled=false to avoid unexpected auto toggles
            try {
              const payload = {
                on: { enabled: false, operator: onOperator, threshold: onThreshold },
                off: { enabled: false, operator: offOperator, threshold: offThreshold },
                noFlow: { enabled: noFlowAutoOffEnabled, delaySec: noFlowDelaySec },
              };
              await AsyncStorage.setItem(`auto_rules_${selectedDeviceId}`, JSON.stringify(payload));
            } catch {}
            setRulesLoaded(true);
          } else {
            // No rules found at all; keep defaults and mark loaded
            setRulesLoaded(true);
          }
        }
      } catch (e) {}
    };
    loadRules();
  }, [selectedDeviceId]);

  const persistRules = async (showFeedback = false) => {
    try {
      if (!selectedDeviceId) return;
      const payload = {
        on: { enabled: onEnabled, operator: onOperator, threshold: onThreshold },
        off: { enabled: offEnabled, operator: offOperator, threshold: offThreshold },
        noFlow: { enabled: noFlowAutoOffEnabled, delaySec: noFlowDelaySec },
        supplyWater: {
          enabled: supplyWaterTimerEnabled,
          frequency: supplyWaterFrequency,
          morningEnabled: morningScheduleEnabled,
          morningStart: morningStartTime,
          morningEnd: morningEndTime,
          eveningEnabled: eveningScheduleEnabled,
          eveningStart: eveningStartTime,
          eveningEnd: eveningEndTime,
        },
        wateringPlants: {
          enabled: wateringPlantsTimerEnabled,
          frequency: wateringPlantsFrequency,
          morningEnabled: wateringPlantsMorningEnabled,
          morningStart: wateringPlantsMorningStart,
          morningEnd: wateringPlantsMorningEnd,
          eveningEnabled: wateringPlantsEveningEnabled,
          eveningStart: wateringPlantsEveningStart,
          eveningEnd: wateringPlantsEveningEnd,
        },
        dogFeed: {
          enabled: dogFeedTimerEnabled,
          frequency: dogFeedFrequency,
          morningEnabled: dogFeedMorningEnabled,
          morningStart: dogFeedMorningStart,
          morningEnd: dogFeedMorningEnd,
          eveningEnabled: dogFeedEveningEnabled,
          eveningStart: dogFeedEveningStart,
          eveningEnd: dogFeedEveningEnd,
        },
        acControl: {
          enabled: acControlTimerEnabled,
          frequency: acControlFrequency,
          morningEnabled: acControlMorningEnabled,
          morningStart: acControlMorningStart,
          morningEnd: acControlMorningEnd,
          eveningEnabled: acControlEveningEnabled,
          eveningStart: acControlEveningStart,
          eveningEnd: acControlEveningEnd,
        },
      };
      await AsyncStorage.setItem(`auto_rules_${selectedDeviceId}`, JSON.stringify(payload));
      // Sync rules to server
      await esp8266Service.updateDeviceOnServer(selectedDeviceId, { automationRules: payload });
      
      if (showFeedback) {
        Toast.show({
          type: 'success',
          text1: 'Configuration Saved',
          text2: 'All timers and rules have been saved successfully.',
          position: 'bottom'
        });
      }
    } catch (e) {
      if (showFeedback) {
        Toast.show({
          type: 'error',
          text1: 'Save Failed',
          text2: 'Could not save configuration.',
          position: 'bottom'
        });
      }
    }
  };

  // Auto-persist rules when state changes to ensure latest state is saved
  useEffect(() => {
    if (rulesLoaded && selectedDeviceId) {
      const timer = setTimeout(() => {
        persistRules(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [
    rulesLoaded, selectedDeviceId,
    onEnabled, onOperator, onThreshold, offEnabled, offOperator, offThreshold, noFlowAutoOffEnabled, noFlowDelaySec,
    supplyWaterTimerEnabled, supplyWaterFrequency, morningScheduleEnabled, morningStartTime, morningEndTime, eveningScheduleEnabled, eveningStartTime, eveningEndTime,
    wateringPlantsTimerEnabled, wateringPlantsFrequency, wateringPlantsMorningEnabled, wateringPlantsMorningStart, wateringPlantsMorningEnd, wateringPlantsEveningEnabled, wateringPlantsEveningStart, wateringPlantsEveningEnd,
    dogFeedTimerEnabled, dogFeedFrequency, dogFeedMorningEnabled, dogFeedMorningStart, dogFeedMorningEnd, dogFeedEveningEnabled, dogFeedEveningStart, dogFeedEveningEnd,
    acControlTimerEnabled, acControlFrequency, acControlMorningEnabled, acControlMorningStart, acControlMorningEnd, acControlEveningEnabled, acControlEveningStart, acControlEveningEnd
  ]);

  // Recalculate water level when target changes (or brightness updates via state)
  // Note: Socket updates also set waterLevel directly using targetValueRef to ensure realtime accuracy without stale state.
  useEffect(() => {
    if (typeof brightness === 'number' && isFinite(brightness)) {
      const t = Number(targetInput) > 0 ? Number(targetInput) : targetValueRef.current;
      const filled = brightnessToPercent(brightness, t);
      setWaterLevel(filled);
    }
  }, [brightness, targetInput, showRemaining]);

  // Automation: evaluate ON/OFF rules with a small cooldown to avoid rapid toggles
  useEffect(() => {
    // Do not run automation until rules are loaded
    if (!rulesLoaded) return;
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
          // 1. Direct IP Control (Fastest/Most Reliable on Local Network)
          if (selectedDeviceIp) {
               esp8266Service.setDeviceIP(selectedDeviceIp).then(() => {
                   esp8266Service.turnOn().catch(console.warn);
               }).catch(console.warn);
          }
          // 2. Server Control Endpoint
          esp8266Service.controlDeviceOnServer(selectedDeviceId, 'on').catch(console.warn);
          // 3. State Update (triggers DB/Socket)
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
          // 1. Direct IP Control
          if (selectedDeviceIp) {
               esp8266Service.setDeviceIP(selectedDeviceIp).then(() => {
                   esp8266Service.turnOff().catch(console.warn);
               }).catch(console.warn);
          }
          // 2. Server Control Endpoint
          esp8266Service.controlDeviceOnServer(selectedDeviceId, 'off').catch(console.warn);
          // 3. State Update
          toggleDeviceField('device1', false);

          setIsPowerOn(false);
          setLastAutoAt(now);
          Toast.show({ type: 'success', text1: 'Automation', text2: `Power OFF at ${level}%`, position: 'bottom' });
          return;
        }
      }
    } catch (e) {}
  }, [waterLevel, onEnabled, onOperator, onThreshold, offEnabled, offOperator, offThreshold, lastAutoAt, isPowerOn, selectedDeviceIp, selectedDeviceId]);

 

  // Keep refs in sync to avoid stale closures in timers
  useEffect(() => { isPowerOnRef.current = isPowerOn; }, [isPowerOn]);
  useEffect(() => { flowRateRef.current = flowRate; }, [flowRate]);

  // Start/clear delayed no-flow auto OFF timer when power state or rule changes
  useEffect(() => {
    try {
      // Clear any existing timer
      if (noFlowTimerRef.current) {
        clearTimeout(noFlowTimerRef.current);
        noFlowTimerRef.current = null;
      }
      // Arm new timer only if rule enabled and power currently ON
      if (noFlowAutoOffEnabled && isPowerOn) {
        noFlowTimerRef.current = setTimeout(() => {
          try {
            const fr = flowRateRef.current;
            const stillOn = isPowerOnRef.current;
            if (stillOn && typeof fr === 'number' && isFinite(fr) && fr < 6.5) {
              // 1. Direct IP Control
              if (selectedDeviceIp) {
                   esp8266Service.setDeviceIP(selectedDeviceIp).then(() => {
                       esp8266Service.turnOff().catch(console.warn);
                   }).catch(console.warn);
              }
              // 2. Server Control Endpoint
              if (selectedDeviceId) esp8266Service.controlDeviceOnServer(selectedDeviceId, 'off').catch(console.warn);
              // 3. State Update
              toggleDeviceField('device1', false);

              setIsPowerOn(false);
              setLastAutoAt(Date.now());
              try { 
                Toast.show({ type: 'success', text1: 'Automation', text2: `Low Flow (<6.5) for ${noFlowDelaySec}s. Power OFF`, position: 'bottom' }); 
              } catch {}
            }
          } catch {}
        }, Math.max(1, noFlowDelaySec) * 1000);
      }
    } catch {}
    return () => {
      if (noFlowTimerRef.current) {
        clearTimeout(noFlowTimerRef.current);
        noFlowTimerRef.current = null;
      }
    };
  }, [isPowerOn, noFlowAutoOffEnabled, noFlowDelaySec, selectedDeviceId, selectedDeviceIp]);

  // Supply Water Timer Logic
  useEffect(() => {
    if (!rulesLoaded || !supplyWaterTimerEnabled || !selectedDeviceId) return;
    if (!canControl) return;

    const interval = setInterval(() => {
      const now = new Date();
      setLastTimerCheck(now.getTime());
      
      const morning = checkSchedule(now, morningScheduleEnabled, supplyWaterFrequency, morningStartTime, morningEndTime);
      const evening = checkSchedule(now, eveningScheduleEnabled, supplyWaterFrequency, eveningStartTime, eveningEndTime);
      
      const inMorning = morning.active;
      const inEvening = evening.active;
      
      // Debug logging for Supply Water
      if (supplyWaterTimerEnabled) {
          const nowMins = now.getHours() * 60 + now.getMinutes();
          const startMins = morningStartTime ? morningStartTime.getHours() * 60 + morningStartTime.getMinutes() : -1;
          const endMins = morningEndTime ? morningEndTime.getHours() * 60 + morningEndTime.getMinutes() : -1;

          console.log('[SupplyWater] Check:', { 
              now: now.toLocaleTimeString(), 
              nowMins,
              startMins,
              endMins,
              inMorning, 
              inEvening, 
              isPowerOn,
              morningStart: morningStartTime?.toLocaleTimeString(),
              morningEnd: morningEndTime?.toLocaleTimeString(),
              freq: supplyWaterFrequency
          });
      }

      const morningFinished = morning.finished;
      const eveningFinished = evening.finished;

      if (inMorning || inEvening) {
        setSupplyWaterTimerStatus(`Active (${inMorning ? 'Morning' : 'Evening'})`);
        
        // Redundancy check: If app thinks it's ON but maybe it's not (stale state),
        // or if it's OFF, we send the ON command.
        // We force it if:
        // 1. App says it's OFF (!isPowerOn)
        // 2. We haven't forced it recently (e.g. every 30s) to handle stale "ON" state
        const shouldForce = Date.now() - lastForcedOn > 30000; // 30s (was 5 mins)

        if (!isPowerOn) {
           // Standard trigger
           // 1. Direct IP Control (Fastest/Most Reliable on Local Network)
           if (selectedDeviceIp) {
               esp8266Service.setDeviceIP(selectedDeviceIp).then(() => {
                   esp8266Service.turnOn().catch(console.warn);
               }).catch(console.warn);
           }
           // 2. Server Control Endpoint
           esp8266Service.controlDeviceOnServer(selectedDeviceId, 'on').catch(console.warn);
           // 3. State Update (triggers DB/Socket)
           toggleDeviceField('device1', true);
           
           setIsPowerOn(true);
           setLastForcedOn(Date.now());
           Toast.show({ type: 'success', text1: 'Timer', text2: 'Supply Water ON (Sent)', position: 'bottom' });
        } else if (shouldForce) {
           // Redundancy trigger (silent but persistent)
           if (selectedDeviceIp) {
               esp8266Service.setDeviceIP(selectedDeviceIp).then(() => {
                   esp8266Service.turnOn().catch(console.warn);
               }).catch(console.warn);
           }
           esp8266Service.controlDeviceOnServer(selectedDeviceId, 'on').catch(console.warn);
           setLastForcedOn(Date.now());
        }
      } else {
        setSupplyWaterTimerStatus('Waiting');
        if (isPowerOn) {
             if (morningFinished || eveningFinished) {
                 // Device 1 is Main Power
                 // 1. Direct IP Control
                 if (selectedDeviceIp) {
                     esp8266Service.setDeviceIP(selectedDeviceIp).then(() => {
                         esp8266Service.turnOff().catch(console.warn);
                     }).catch(console.warn);
                 }
                 // 2. Server Control Endpoint
                 esp8266Service.controlDeviceOnServer(selectedDeviceId, 'off').catch(console.warn);
                 // 3. State Update
                 toggleDeviceField('device1', false);
                 
                 setIsPowerOn(false);
                 Toast.show({ type: 'success', text1: 'Timer', text2: 'Supply Water OFF', position: 'bottom' });
                 
                 if (supplyWaterFrequency === 'once') {
                     if (eveningFinished || (morningFinished && !eveningScheduleEnabled)) {
                        setSupplyWaterTimerEnabled(false);
                     }
                 }
             }
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [rulesLoaded, supplyWaterTimerEnabled, selectedDeviceId, morningStartTime, morningEndTime, eveningStartTime, eveningEndTime, isPowerOn, supplyWaterFrequency, morningScheduleEnabled, eveningScheduleEnabled, lastForcedOn]);

  // Watering Plants Timer Logic
  useEffect(() => {
    if (!rulesLoaded || !wateringPlantsTimerEnabled || !selectedDeviceId) return;
    if (!canControl) return;

    const interval = setInterval(() => {
      const now = new Date();
      const morning = checkSchedule(now, wateringPlantsMorningEnabled, wateringPlantsFrequency, wateringPlantsMorningStart, wateringPlantsMorningEnd);
      const evening = checkSchedule(now, wateringPlantsEveningEnabled, wateringPlantsFrequency, wateringPlantsEveningStart, wateringPlantsEveningEnd);
      
      const inMorning = morning.active;
      const inEvening = evening.active;
      const morningFinished = morning.finished;
      const eveningFinished = evening.finished;

      if (inMorning || inEvening) {
        if (!device3On) {
           toggleDeviceField('device3', true);
           setDevice3On(true);
           Toast.show({ type: 'success', text1: 'Timer', text2: 'Watering Plants ON', position: 'bottom' });
        }
      } else {
        if (device3On) {
             if (morningFinished || eveningFinished) {
                 // Check conflict with Dog Feed (also Device 3)
                 let dogFeedActive = false;
                 if (dogFeedTimerEnabled) {
                     const dfMorning = checkSchedule(now, dogFeedMorningEnabled, dogFeedFrequency, dogFeedMorningStart, dogFeedMorningEnd);
                     const dfEvening = checkSchedule(now, dogFeedEveningEnabled, dogFeedFrequency, dogFeedEveningStart, dogFeedEveningEnd);
                     dogFeedActive = dfMorning.active || dfEvening.active;
                 }

                 if (!dogFeedActive) {
                     toggleDeviceField('device3', false);
                     setDevice3On(false);
                     Toast.show({ type: 'success', text1: 'Timer', text2: 'Watering Plants OFF', position: 'bottom' });
                 }
                 
                 if (wateringPlantsFrequency === 'once') {
                     if (eveningFinished || (morningFinished && !wateringPlantsEveningEnabled)) {
                        setWateringPlantsTimerEnabled(false);
                     }
                 }
             }
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [rulesLoaded, wateringPlantsTimerEnabled, selectedDeviceId, wateringPlantsMorningStart, wateringPlantsMorningEnd, wateringPlantsEveningStart, wateringPlantsEveningEnd, device3On, wateringPlantsFrequency, wateringPlantsMorningEnabled, wateringPlantsEveningEnabled, dogFeedTimerEnabled, dogFeedMorningEnabled, dogFeedFrequency, dogFeedMorningStart, dogFeedMorningEnd, dogFeedEveningEnabled, dogFeedEveningStart, dogFeedEveningEnd]);

  // Dog Feed Timer Logic
  useEffect(() => {
    if (!rulesLoaded || !dogFeedTimerEnabled || !selectedDeviceId) return;
    if (!canControl) return;

    const interval = setInterval(() => {
      const now = new Date();
      const morning = checkSchedule(now, dogFeedMorningEnabled, dogFeedFrequency, dogFeedMorningStart, dogFeedMorningEnd);
      const evening = checkSchedule(now, dogFeedEveningEnabled, dogFeedFrequency, dogFeedEveningStart, dogFeedEveningEnd);
      
      const inMorning = morning.active;
      const inEvening = evening.active;
      const morningFinished = morning.finished;
      const eveningFinished = evening.finished;

      // Note: device3 is Dog Feed (Mapped to Device 3 as per user request, sharing with Watering Plants)
      if (inMorning || inEvening) {
        if (!device3On) {
           toggleDeviceField('device3', true);
           setDevice3On(true);
           Toast.show({ type: 'success', text1: 'Timer', text2: 'Dog Feed ON', position: 'bottom' });
        }
      } else {
        if (device3On) {
             if (morningFinished || eveningFinished) {
                 // Check conflict with Watering Plants (also Device 3)
                 let wpActive = false;
                 if (wateringPlantsTimerEnabled) {
                     const wpMorning = checkSchedule(now, wateringPlantsMorningEnabled, wateringPlantsFrequency, wateringPlantsMorningStart, wateringPlantsMorningEnd);
                     const wpEvening = checkSchedule(now, wateringPlantsEveningEnabled, wateringPlantsFrequency, wateringPlantsEveningStart, wateringPlantsEveningEnd);
                     wpActive = wpMorning.active || wpEvening.active;
                 }

                 if (!wpActive) {
                     toggleDeviceField('device3', false);
                     setDevice3On(false);
                     Toast.show({ type: 'success', text1: 'Timer', text2: 'Dog Feed OFF', position: 'bottom' });
                 }
                 
                 if (dogFeedFrequency === 'once') {
                     if (eveningFinished || (morningFinished && !dogFeedEveningEnabled)) {
                        setDogFeedTimerEnabled(false);
                     }
                 }
             }
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [rulesLoaded, dogFeedTimerEnabled, selectedDeviceId, dogFeedMorningStart, dogFeedMorningEnd, dogFeedEveningStart, dogFeedEveningEnd, device3On, dogFeedFrequency, dogFeedMorningEnabled, dogFeedEveningEnabled, wateringPlantsTimerEnabled, wateringPlantsMorningEnabled, wateringPlantsFrequency, wateringPlantsMorningStart, wateringPlantsMorningEnd, wateringPlantsEveningEnabled, wateringPlantsEveningStart, wateringPlantsEveningEnd]);

  // AC Control Timer Logic
  useEffect(() => {
    if (!rulesLoaded || !acControlTimerEnabled || !selectedDeviceId) return;
    if (!canControl) return;

    const interval = setInterval(() => {
      const now = new Date();
      
      const morning = checkSchedule(now, acControlMorningEnabled, acControlFrequency, acControlMorningStart, acControlMorningEnd);
      const evening = checkSchedule(now, acControlEveningEnabled, acControlFrequency, acControlEveningStart, acControlEveningEnd);

      const shouldBeOn = morning.active || evening.active;
      const finished = morning.finished || evening.finished;

      // Note: device5 is AC Control
      if (shouldBeOn) {
        if (!device5On) {
           toggleDeviceField('device5', true);
           setDevice5On(true);
           Toast.show({ type: 'success', text1: 'Timer', text2: 'AC Control ON', position: 'bottom' });
        }
      } else {
        if (device5On) {
             if (finished) {
                 toggleDeviceField('device5', false);
                 setDevice5On(false);
                 Toast.show({ type: 'success', text1: 'Timer', text2: 'AC Control OFF', position: 'bottom' });
                 
                 if (acControlFrequency === 'once') {
                     if (evening.finished || (morning.finished && !acControlEveningEnabled)) {
                        setAcControlTimerEnabled(false);
                     }
                 }
             }
        }
      }
    }, 10000); // Check every 10s

    return () => clearInterval(interval);
  }, [rulesLoaded, acControlTimerEnabled, selectedDeviceId, acControlMorningStart, acControlMorningEnd, acControlEveningStart, acControlEveningEnd, device5On, acControlFrequency, acControlMorningEnabled, acControlEveningEnabled]);

  // Alert when tank reaches 100%
  useEffect(() => {
    try {
      if (isLoading) return;

      const level = Number(waterLevel);
      const prev = Number(prevWaterLevelRef.current || 0);
      const now = Date.now();

      // Suppress alert on first valid data load to avoid false positives on app open
      if (isFirstLoadRef.current) {
        isFirstLoadRef.current = false;
        prevWaterLevelRef.current = level;
        return;
      }

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
  }, [waterLevel, isLoading]);

  const loadDeviceInfo = async (preferredDeviceId?: string | null) => {
    setIsLoading(true);
    isFirstLoadRef.current = true;
    try {
      let useDeviceId = preferredDeviceId || selectedDeviceId;
      let devDetail: any | null = null;
      let effectiveTarget = targetValueRef.current;
      if (useDeviceId) {
        // fetch device info for name and ip
        const dev = await esp8266Service.getDeviceFromServer(useDeviceId);
        devDetail = dev || null;
          if (devDetail) {
            setDeviceName(devDetail.name || 'Device');
            setSelectedDeviceIp(devDetail.ipAddress || devDetail.ip || null);
            const subActiveRaw = devDetail.subscriptionActive ?? devDetail.subscription ?? devDetail.isSubscribed;
            if (typeof subActiveRaw !== 'undefined' && subActiveRaw !== null) {
              const subActiveNum = typeof subActiveRaw === 'number'
                ? subActiveRaw
                : (typeof subActiveRaw === 'string' ? parseInt(subActiveRaw, 10) : (subActiveRaw ? 1 : 0));
              setSubscriptionActive(subActiveNum === 1 ? 1 : 0);
            }
            const lastDate = devDetail.subscriptionEndDate ?? devDetail.subscriptionEnd ?? devDetail.subscription_last_date ?? devDetail.subscriptionLastDate ?? null;
            setSubscriptionEndDate(lastDate || null);
            if (devDetail.target !== undefined && devDetail.target !== null) {
              const tRaw = devDetail.target;
              const tNum = typeof tRaw === 'number' ? tRaw : (typeof tRaw === 'string' ? parseFloat(tRaw) : undefined);
              if (typeof tNum === 'number' && isFinite(tNum) && tNum > 0) {
                setTargetValue(tNum);
                setTargetInput(String(tNum));
                effectiveTarget = tNum;
              }
            }
            // Parse sub-device subscriptions
            // Initialize brightness from API detail if available (fallback until socket updates arrive)
            const bRaw = devDetail?.brightness;
            const bNum = typeof bRaw === 'number' ? bRaw : (typeof bRaw === 'string' ? parseFloat(bRaw) : undefined);
            if (typeof bNum === 'number' && isFinite(bNum)) {
              // Seed buffer with initial value
              brightnessBufferRef.current = Array(SMOOTH_WINDOW).fill(bNum);
              setBrightness(bNum);
              const filled = brightnessToPercent(bNum, effectiveTarget);
              setWaterLevel(filled);
            }
            setDevice2On(!!devDetail.device2);
            setDevice3On(!!devDetail.device3);
            setDevice4On(!!devDetail.device4);
            setDevice5On(!!devDetail.device5);
            
            // Sync automation rules from server if available
            if (devDetail.automationRules) {
              const r = devDetail.automationRules;
              applyRules(r);
              // Update local storage to keep in sync
              AsyncStorage.setItem(`auto_rules_${useDeviceId}`, JSON.stringify(r)).catch(() => {});
            }

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
        const device1StateRaw = (devDetail?.device1 ?? serverState.device1 ?? (serverState.isOn ? 1 : 0));
        let device1On = false;
        if (typeof device1StateRaw === 'number') {
          device1On = device1StateRaw === 1;
        } else if (typeof device1StateRaw === 'boolean') {
          device1On = device1StateRaw;
        } else if (typeof device1StateRaw === 'string') {
          const s = device1StateRaw.trim().toLowerCase();
          device1On = s === '1' || s === 'true';
        } else {
          device1On = !!device1StateRaw;
        }
        const mapped: DeviceStatus = {
          connected: !!serverState.isConnected,
          powerState: device1On ? 'on' : 'off',
          lastUpdated: serverState.lastSeen || undefined,
          energyUsage: undefined,
          // Prefer device detail fields, fallback to server state
          ip: (devDetail?.ipAddress || devDetail?.ip || serverState.ipAddress) || undefined,
          macAddress: (devDetail?.macAddress || serverState.macAddress) || undefined,
          ssid: (devDetail?.ssid || serverState.ssid) || undefined,
          firmwareVersion: (devDetail?.firmwareVersion || serverState.firmwareVersion) || undefined,
        };
        setDeviceStatus(mapped);
        const sActiveRaw = serverState.subscriptionActive ?? serverState.subscription ?? serverState.isSubscribed;
        if (typeof sActiveRaw !== 'undefined' && sActiveRaw !== null) {
          const sActiveNum = typeof sActiveRaw === 'number'
            ? sActiveRaw
            : (typeof sActiveRaw === 'string' ? parseInt(sActiveRaw, 10) : (sActiveRaw ? 1 : 0));
          setSubscriptionActive(sActiveNum === 1 ? 1 : 0);
        }
        const sLastDate = serverState.subscriptionEndDate ?? serverState.subscriptionEnd ?? serverState.subscription_last_date ?? serverState.subscriptionLastDate ?? null;
        if (sLastDate) setSubscriptionEndDate(String(sLastDate));
        // Reflect server's device1 state in the main Power switch
        setIsPowerOn(device1On);
        // Flow data
        console.log('[InitialLoad] ServerState:', JSON.stringify(serverState));
        const frRaw = devDetail?.flowRate ?? serverState.flowRate ?? serverState.flow_rate ?? serverState.FlowRate;
        const tlRaw = devDetail?.totalLiters ?? serverState.totalLiters ?? serverState.total_liters ?? serverState.TotalLiters;
        const fr = typeof frRaw === 'number' ? frRaw : (typeof frRaw === 'string' ? parseFloat(frRaw) : undefined);
        const tl = typeof tlRaw === 'number' ? tlRaw : (typeof tlRaw === 'string' ? parseFloat(tlRaw) : undefined);
        if (typeof fr === 'number' && isFinite(fr)) setFlowRate(fr);
        if (typeof tl === 'number' && isFinite(tl)) setTotalLiters(tl);
        
        // Initialize target from server state if available (overrides detail)
        const tRawSrv = serverState?.target ?? serverState?.targetDepth ?? serverState?.target_value;
        const tNumSrv = typeof tRawSrv === 'number' ? tRawSrv : (typeof tRawSrv === 'string' ? parseFloat(tRawSrv) : undefined);
        if (typeof tNumSrv === 'number' && isFinite(tNumSrv) && tNumSrv > 0) {
          setTargetValue(tNumSrv);
          setTargetInput(String(tNumSrv));
          effectiveTarget = tNumSrv;
        }

        // Initialize brightness from server state if present (fallback until socket updates arrive)
        const sbRaw = serverState?.brightness;
        const sbNum = typeof sbRaw === 'number' ? sbRaw : (typeof sbRaw === 'string' ? parseFloat(sbRaw) : undefined);
        if (typeof sbNum === 'number' && isFinite(sbNum)) {
          // Seed buffer with initial value
          brightnessBufferRef.current = Array(SMOOTH_WINDOW).fill(sbNum);
          setBrightness(sbNum);
          const filled = brightnessToPercent(sbNum, effectiveTarget);
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
      if (!canControl) {
        Toast.show({ type: 'error', text1: 'Subscription', text2: 'Subscription inactive. Please subscribe.', position: 'bottom' });
        return;
      }
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
        setTargetValue(parsed);
        setTargetInput(String(parsed));
        const filled = brightnessToPercent(brightness ?? 0, Number(targetInput));
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
    if (!canControl) {
      Toast.show({ type: 'error', text1: 'Subscription', text2: 'Subscription inactive. Please subscribe.', position: 'bottom' });
      return;
    }
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
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading device information...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()} 
              style={{ marginRight: 10, padding: 4 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
               <Svg width={28} height={28} viewBox="0 0 24 24" fill={COLORS.textDark}>
                 <Path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
               </Svg>
            </TouchableOpacity>
            {/* <TouchableOpacity 
              onPress={() => navigation.navigate('Audio')} 
              style={{ marginRight: 10, padding: 4 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
               <Svg width={28} height={28} viewBox="0 0 24 24" fill={COLORS.primary}>
                 <Path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
               </Svg>
            </TouchableOpacity> */}
         
            <Text style={[styles.deviceName, { marginBottom: 0 }]}>{deviceName}</Text>
          </View>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: deviceStatus?.connected ? COLORS.success : COLORS.error }]} />
            <Text style={styles.statusText}>{deviceStatus?.connected ? 'Connected' : 'Disconnected'}</Text>
          </View>
      
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <TouchableOpacity onPress={handleRefresh} style={{ marginRight: 16 }}>
              <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Refresh</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                const did = route?.params?.deviceId || selectedDeviceId;
                if (!did) {
                  Toast.show({ type: 'error', text1: 'No Device', text2: 'Select a device first', position: 'bottom' });
                  return;
                }
                navigation.navigate('DeviceAccess', { deviceId: did, deviceName });
              }}
            >
              <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Access</Text>
            </TouchableOpacity>
          </View>
        </View>
          <View style={styles.controlSection}>
           <View style={styles.powerControl}>
            <Text style={styles.powerLabel}>{'Motor Control'}</Text>
            {canControl ? (
              <AppSwitch
                value={isPowerOn}
                onValueChange={(val) => {
                  setIsPowerOn(val);
                  toggleDeviceField('device1', val);
                }}
              />
            ) : null}
          </View>
          {!canControl ? (
            <TouchableOpacity
              style={styles.subscribeMiniButton}
              onPress={() => navigateToSubscriptionCheckout()}
            >
              <Text style={styles.subscribeMiniButtonText}>
                {billingPlan ? `Subscribe ₹${billingPlan.price}/${billingPlan.interval}` : 'Subscribe'}
              </Text>
            </TouchableOpacity>
          ) : null}
          </View>
        {/* Display: Tank Filled percent */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={styles.percentageText}>Tank Filled %: {typeof waterLevel === 'number' ? Math.round(waterLevel) : '—'}</Text>
          <Text style={styles.percentageText}>Water Flow: {typeof flowRate === 'number' ? flowRate : 0}</Text>
        </View>

        <WaterTank percentage={waterLevel ?? 0} flowRate={flowRate ?? 0} />
        <TouchableOpacity
          style={{ marginTop: 10 }}
          onLongPress={() => {
            setShowDebugPanel(!showDebugPanel);
            Vibration.vibrate(50);
            Toast.show({ type: 'info', text1: 'Debug Mode', text2: !showDebugPanel ? 'Enabled' : 'Disabled', position: 'bottom' });
          }}
        >
          <Text style={{ color: COLORS.textMedium }}>Exact Data: {typeof brightness === 'number' ? brightness.toFixed(1) : '—'}</Text>
        </TouchableOpacity>

        {showDebugPanel && (
          <View style={{ marginTop: 10, padding: 10, backgroundColor: COLORS.textDark, borderRadius: 8 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 5, color: COLORS.white }}>Socket Diagnostics</Text>
            <Text style={{ fontSize: 12, color: COLORS.lightGray }}>Status: {socketConnected ? 'Connected' : 'Disconnected'}</Text>
            <Text style={{ fontSize: 12, color: COLORS.lightGray }}>Host: {activeSocketHost || 'None'}</Text>
            <Text style={{ fontSize: 12, marginTop: 5, color: COLORS.lightGray }}>Last Brightness: {lastBrightness ?? 'None'}</Text>
            <Text style={{ fontSize: 12, color: COLORS.lightGray }}>Received At: {lastBrightnessAt ? new Date(lastBrightnessAt).toLocaleTimeString() : 'Never'}</Text>
            <Text style={{ fontSize: 12, marginTop: 5, color: COLORS.lightGray }}>Last Flow: {lastFlowRate ?? 'None'}</Text>
            <Text style={{ fontSize: 12, color: COLORS.lightGray }}>Received At: {lastFlowAt ? new Date(lastFlowAt).toLocaleTimeString() : 'Never'}</Text>
          </View>
        )}
     

        {/* Flow Control Card */}
        <View style={styles.controlSection}>
       
             <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 }}>
                <Text style={styles.powerLabel}>Auto OFF Delay when flow is low</Text>
                {canControl && (
                  <AppSwitch
                    value={noFlowAutoOffEnabled}
                    onValueChange={(v) => { setNoFlowAutoOffEnabled(v); persistRules(); }}
                  />
                )}
             </View>
{/* 
             <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                <View style={{ flex: 1 }}>
                   <Text style={{ fontSize: 14, color: COLORS.textMedium }}>Flow Rate</Text>
                   <Text style={{ fontSize: 18, color: COLORS.textDark, marginTop: 4 }}>{typeof flowRate === 'number' ? `${flowRate} L/min` : '0 L/min'}</Text>
                </View>
                <View style={{ width: 1, height: 40, backgroundColor: COLORS.lightGray, marginHorizontal: 15 }} />
                <View style={{ flex: 1 }}>
                   <Text style={{ fontSize: 14, color: COLORS.textMedium }}>Total Liters</Text>
                   <Text style={{ fontSize: 18, color: COLORS.textDark, marginTop: 4 }}>{typeof totalLiters === 'number' ? `${totalLiters} L` : '0 L'}</Text>
                </View>
             </View> */}

             <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
             </View>
             <TouchableOpacity
                  onPress={() => setShowNoFlowDelayMenu((s) => !s)}
                  style={{ padding: 12, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 8, backgroundColor: COLORS.background }}
                >
                  <Text style={{ color: COLORS.textDark }}>{noFlowDelaySec}s</Text>
             </TouchableOpacity>
             {showNoFlowDelayMenu && (
                <View style={{ marginTop: 8, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 8, backgroundColor: COLORS.white }}>
                  {[10, 20, 30, 40, 60, 120].map((sec) => (
                    <TouchableOpacity
                      key={sec}
                      onPress={() => {
                        setNoFlowDelaySec(sec);
                        setShowNoFlowDelayMenu(false);
                        persistRules();
                      }}
                      style={{ paddingVertical: 10, paddingHorizontal: 12 }}
                    >
                      <Text style={{ color: COLORS.textDark }}>{sec} seconds</Text>
                    </TouchableOpacity>
                  ))}
                </View>
             )}
        </View>

        {/* Automation Rules Card */}
        <View style={styles.controlSection}>
            <Text style={styles.sectionTitle}>Automation Rules: Motor</Text>
            
            {/* Turn ON Rule */}
            <View style={{ marginBottom: 15 }}>
               <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.textDark }}>TURN ON rule</Text>
                  {canControl && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                       <AppSwitch
                          value={onEnabled}
                          onValueChange={(v) => { setOnEnabled(v) }}
                          
                          
                       />
                    </View>
                  )}
               </View>
               <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                      onPress={() => setShowOnOperatorMenu((s) => !s)}
                      style={{ flex: 1, padding: 12, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 8, backgroundColor: COLORS.background, marginRight: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <Text style={{ color: COLORS.textDark }}>{onOperator === 'lt' ? 'Less than' : 'More than or equal'}</Text>
                      <Text style={{ color: COLORS.textMedium }}>▼</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                      onPress={() => setShowOnPercentMenu((s) => !s)}
                      style={{ flex: 1, padding: 12, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 8, backgroundColor: COLORS.background, marginLeft: 8 }}
                    >
                      <Text style={{ color: COLORS.textDark }}>{onThreshold}%</Text>
                  </TouchableOpacity>
               </View>
                {/* Menus for ON Rule */}
               {showOnOperatorMenu && (
                <View style={{ marginTop: 8, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 8, backgroundColor: COLORS.white, zIndex: 10 }}>
                  {[{ key: 'lt', label: 'Less than' }].map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => { setOnOperator(opt.key as 'lt' | 'ge'); setShowOnOperatorMenu(false); persistRules(); }}
                      style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray }}
                    >
                      <Text style={{ color: COLORS.textDark }}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
               )}
               {showOnPercentMenu && (
                <View style={{ marginTop: 8, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 8, backgroundColor: COLORS.white, zIndex: 10 }}>
                  {[10, 20, 30, 40, 50].map((p) => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => { setOnThreshold(p); setShowOnPercentMenu(false); persistRules(); }}
                      style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray }}
                    >
                      <Text style={{ color: COLORS.textDark }}>{p}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
               )}
            </View>

            {/* Turn OFF Rule */}
            <View style={{ paddingTop: 15, borderTopWidth: 1, borderTopColor: COLORS.lightGray }}>
               <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.textDark }}>TURN OFF rule</Text>
                  {canControl && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                       <AppSwitch
                          value={offEnabled}
                          onValueChange={(v) => { setOffEnabled(v) }}
                          
                          
                       />
                    </View>
                  )}
               </View>
               <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                      onPress={() => setShowOffOperatorMenu((s) => !s)}
                      style={{ flex: 1, padding: 12, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 8, backgroundColor: COLORS.background, marginRight: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                      <Text style={{ color: COLORS.textDark }}>{offOperator === 'lt' ? 'Less than' : 'More than'}</Text>
                      <Text style={{ color: COLORS.textMedium }}>▼</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                      onPress={() => setShowOffPercentMenu((s) => !s)}
                      style={{ flex: 1, padding: 12, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 8, backgroundColor: COLORS.background, marginLeft: 8 }}
                    >
                      <Text style={{ color: COLORS.textDark }}>{offThreshold}%</Text>
                  </TouchableOpacity>
               </View>
                {/* Menus for OFF Rule */}
                {showOffOperatorMenu && (
                <View style={{ marginTop: 8, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 8, backgroundColor: COLORS.white, zIndex: 10 }}>
                  {([ { key: 'ge', label: 'More than' }] as const).map((opt) => (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => { setOffOperator(opt.key); setShowOffOperatorMenu(false); persistRules(); }}
                      style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray }}
                    >
                      <Text style={{ color: COLORS.textDark }}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
               )}
               {showOffPercentMenu && (
                <View style={{ marginTop: 8, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 8, backgroundColor: COLORS.white, zIndex: 10 }}>
                  {[70, 80, 90, 100].map((p) => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => { setOffThreshold(p); setShowOffPercentMenu(false); persistRules(); }}
                      style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray }}
                    >
                      <Text style={{ color: COLORS.textDark }}>{p}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
               )}
            </View>
            <Text style={{ marginTop: 15, color: COLORS.textMedium, fontStyle: 'italic', textAlign: 'center' }}>Current level: {waterLevel}%</Text>
          </View>
     
        <View style={[styles.controlSection, { marginTop: 10 }]}>
          <Text style={styles.sectionTitle}>Supply Watering Schedule</Text>

          {/* Top Row: Timer Switch | Mode Selector */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray, paddingBottom: 10 }}>
            {/* Timer Switch */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: COLORS.textDark, marginRight: 10 }}>Timer:</Text>
              {canControl && (
                <AppSwitch
                  value={supplyWaterTimerEnabled}
                  onValueChange={(v) => { setSupplyWaterTimerEnabled(v) }}
                />
              )}
            </View>

            {/* Vertical Divider */}
            <View style={{ width: 1, height: '100%', backgroundColor: COLORS.lightGray, marginHorizontal: 10 }} />

            {/* Mode Selector */}
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
               <Text style={{ fontSize: 16, color: COLORS.textDark, marginRight: 8 }}>Mode:</Text>
               <TouchableOpacity
                 onPress={() => {
                    setSupplyWaterFrequency(supplyWaterFrequency === 'everyday' ? 'once' : 'everyday');
                 }}
                 style={{ flexDirection: 'row', alignItems: 'center', padding: 6, backgroundColor: COLORS.background, borderRadius: 6, borderWidth: 1, borderColor: COLORS.lightGray }}
               >
                  <Text style={{ color: COLORS.accent, fontWeight: '600', marginRight: 4 }}>
                     {supplyWaterFrequency === 'everyday' ? 'Everyday' : 'One Time'}
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.accent }}>▼</Text>
               </TouchableOpacity>
            </View>
          </View>

          {/* Schedule Rows (Only if Timer is Enabled) */}
          {supplyWaterTimerEnabled && (
            <View>
               {/* Morning Row */}
               <View style={{ flexDirection: supplyWaterFrequency === 'once' ? 'column' : 'row', alignItems: supplyWaterFrequency === 'once' ? 'stretch' : 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: supplyWaterFrequency === 'once' ? '100%' : '30%', marginBottom: supplyWaterFrequency === 'once' ? 8 : 0 }}>
                     <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 20, marginRight: 8 }}>⏰</Text>
                        <Text style={{ fontSize: 16, color: COLORS.textDark }}>Morning</Text>
                     </View>
                     {supplyWaterFrequency === 'once' && <AppSwitch value={morningScheduleEnabled} onValueChange={(v) => { setMorningScheduleEnabled(v) }} />}
                  </View>

                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <TouchableOpacity
                         onPress={() => openPicker({ value: morningStartTime, type: supplyWaterFrequency === 'everyday' ? 'time' : 'datetime', onChange: (d) => { validateTimeSelection(d, 'start', supplyWaterFrequency, morningEndTime, setMorningStartTime); } })}
                      >
                         <Text style={{ fontSize: 16, color: COLORS.textDark, fontWeight: '500' }}>
                           {morningStartTime instanceof Date ? (supplyWaterFrequency === 'everyday' ? morningStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : formatOneTimeDate(morningStartTime)) : '--:--'}
                        </Text>
                      </TouchableOpacity>
                      
                      <Text style={{ marginHorizontal: 5, color: COLORS.textLight }}>➔</Text>

                      <TouchableOpacity
                         onPress={() => openPicker({ value: morningEndTime, type: supplyWaterFrequency === 'everyday' ? 'time' : 'datetime', onChange: (d) => { validateTimeSelection(d, 'end', supplyWaterFrequency, morningStartTime, setMorningEndTime); } })}
                      >
                         <Text style={{ fontSize: 16, color: COLORS.textDark, fontWeight: '500' }}>
                           {morningEndTime instanceof Date ? (supplyWaterFrequency === 'everyday' ? morningEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : formatOneTimeDate(morningEndTime)) : '--:--'}
                        </Text>
                      </TouchableOpacity>
                  </View>

                  {supplyWaterFrequency !== 'once' && <AppSwitch
                    value={morningScheduleEnabled}
                    onValueChange={(v) => { setMorningScheduleEnabled(v) }}
                    
                    
                  />}
               </View>

               {/* Evening Row */}
               <View style={{ flexDirection: supplyWaterFrequency === 'once' ? 'column' : 'row', alignItems: supplyWaterFrequency === 'once' ? 'stretch' : 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: supplyWaterFrequency === 'once' ? '100%' : '30%', marginBottom: supplyWaterFrequency === 'once' ? 8 : 0 }}>
                     <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ fontSize: 20, marginRight: 8 }}>🌙</Text>
                        <Text style={{ fontSize: 16, color: COLORS.textDark }}>Evening</Text>
                     </View>
                     {supplyWaterFrequency === 'once' && <AppSwitch value={eveningScheduleEnabled} onValueChange={(v) => { setEveningScheduleEnabled(v) }} />}
                  </View>

                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <TouchableOpacity
                         onPress={() => openPicker({ value: eveningStartTime, type: supplyWaterFrequency === 'everyday' ? 'time' : 'datetime', onChange: (d) => { validateTimeSelection(d, 'start', supplyWaterFrequency, eveningEndTime, setEveningStartTime); } })}
                      >
                         <Text style={{ fontSize: 16, color: COLORS.textDark, fontWeight: '500' }}>
                           {eveningStartTime instanceof Date ? (supplyWaterFrequency === 'everyday' ? eveningStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : formatOneTimeDate(eveningStartTime)) : '--:--'}
                        </Text>
                      </TouchableOpacity>
                      
                      <Text style={{ marginHorizontal: 5, color: COLORS.textLight }}>➔</Text>

                      <TouchableOpacity
                         onPress={() => openPicker({ value: eveningEndTime, type: supplyWaterFrequency === 'everyday' ? 'time' : 'datetime', onChange: (d) => { validateTimeSelection(d, 'end', supplyWaterFrequency, eveningStartTime, setEveningEndTime); } })}
                      >
                         <Text style={{ fontSize: 16, color: COLORS.textDark, fontWeight: '500' }}>
                           {eveningEndTime instanceof Date ? (supplyWaterFrequency === 'everyday' ? eveningEndTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : formatOneTimeDate(eveningEndTime)) : '--:--'}
                        </Text>
                      </TouchableOpacity>
                  </View>

                  {supplyWaterFrequency !== 'once' && <AppSwitch
                    value={eveningScheduleEnabled}
                    onValueChange={(v) => { setEveningScheduleEnabled(v) }}
                    
                    
                  />}
               </View>
            </View>
          )}
        </View>

        <View style={[styles.controlSection, { marginTop: 10 }] }>
          <Text style={styles.sectionTitle}>Main Controls</Text>
          
          <View style={{ flexDirection: 'row' }}>
            {/* Left Column */}
            <View style={{ flex: 1, paddingRight: 10 }}>
              {/* Device 2: Door Lock */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray }}>
                <Text style={{ fontSize: 16, color: COLORS.textDark }}>{'Door Lock'}</Text>
                {canControl ? (
                    <AppSwitch
                      value={device2On}
                      onValueChange={(val) => {
                        setDevice2On(val);
                        toggleDeviceField('device2', val);
                        if (val) {
                          setTimeout(() => {
                            setDevice2On(false);
                            toggleDeviceField('device2', false);
                          }, 3000);
                        }
                      }}
                      
                      
                    />
                ) : (
                    <TouchableOpacity onPress={() => navigateToSubscriptionCheckout()}>
                        <Text style={{ color: COLORS.primary, fontSize: 12 }}>Sub</Text>
                    </TouchableOpacity>
                )}
              </View>

              {/* Device 4: Dog Feed */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
                <Text style={{ fontSize: 16, color: COLORS.textDark }}>{'Dog Feed'}</Text>
                 {canControl ? (
                    <AppSwitch
                      value={device4On}
                      onValueChange={(val) => { setDevice4On(val); toggleDeviceField('device4', val); }}
                      
                      
                    />
                ) : (
                    <TouchableOpacity onPress={() => navigateToSubscriptionCheckout()}>
                        <Text style={{ color: COLORS.primary, fontSize: 12 }}>Sub</Text>
                    </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Vertical Divider */}
            <View style={{ width: 1, backgroundColor: COLORS.lightGray, marginHorizontal: 5 }} />

            {/* Right Column */}
            <View style={{ flex: 1, paddingLeft: 10 }}>
              {/* Device 3: Watering Plants */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray }}>
                <Text style={{ fontSize: 16, color: COLORS.textDark }}>{'Watering'}</Text>
                 {canControl ? (
                    <AppSwitch
                      value={device3On}
                      onValueChange={(val) => { setDevice3On(val); toggleDeviceField('device3', val); }}
                      
                      
                    />
                ) : (
                    <TouchableOpacity onPress={() => navigateToSubscriptionCheckout()}>
                        <Text style={{ color: COLORS.primary, fontSize: 12 }}>Sub</Text>
                    </TouchableOpacity>
                )}
              </View>

              {/* Device 5: AC Control */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
                <Text style={{ fontSize: 16, color: COLORS.textDark }}>{'Bulb/Fan'}</Text>
                 {canControl ? (
                    <AppSwitch
                      value={device5On}
                      onValueChange={(val) => { setDevice5On(val); toggleDeviceField('device5', val); }}
                      
                      
                    />
                ) : (
                    <TouchableOpacity onPress={() => navigateToSubscriptionCheckout()}>
                        <Text style={{ color: COLORS.primary, fontSize: 12 }}>Sub</Text>
                    </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>

        {device3On && (
        <View style={[styles.controlSection, { marginTop: 10 }]}>
          <Text style={styles.sectionTitle}>Watering Plants Timer</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray, paddingBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: COLORS.textDark, marginRight: 10 }}>Timer:</Text>
              <AppSwitch
                value={wateringPlantsTimerEnabled}
                onValueChange={(v) => { setWateringPlantsTimerEnabled(v) }}
                
                
              />
            </View>
            <View style={{ width: 1, height: '100%', backgroundColor: COLORS.lightGray, marginHorizontal: 10 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
               <Text style={{ fontSize: 16, color: COLORS.textDark, marginRight: 8 }}>Mode:</Text>
               <TouchableOpacity
                 onPress={() => { setWateringPlantsFrequency(wateringPlantsFrequency === 'everyday' ? 'once' : 'everyday'); }}
                 style={{ flexDirection: 'row', alignItems: 'center', padding: 6, backgroundColor: COLORS.background, borderRadius: 6, borderWidth: 1, borderColor: COLORS.lightGray }}
               >
                  <Text style={{ color: COLORS.accent, fontWeight: '600', marginRight: 4 }}>
                     {wateringPlantsFrequency === 'everyday' ? 'Everyday' : 'One Time'}
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.accent }}>▼</Text>
               </TouchableOpacity>
            </View>
          </View>

          {wateringPlantsTimerEnabled && (
            <View>
               <View style={{ flexDirection: wateringPlantsFrequency === 'once' ? 'column' : 'row', alignItems: wateringPlantsFrequency === 'once' ? 'stretch' : 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: wateringPlantsFrequency === 'once' ? '100%' : '30%', marginBottom: wateringPlantsFrequency === 'once' ? 8 : 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                         <Text style={{ fontSize: 20, marginRight: 8 }}>⏰</Text>
                         <Text style={{ fontSize: 16, color: COLORS.textDark }}>Morning</Text>
                      </View>
                      {wateringPlantsFrequency === 'once' && <AppSwitch value={wateringPlantsMorningEnabled} onValueChange={setWateringPlantsMorningEnabled} />}
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <TouchableOpacity onPress={() => openPicker({ value: wateringPlantsMorningStart, type: wateringPlantsFrequency === 'everyday' ? 'time' : 'datetime', onChange: (d) => { validateTimeSelection(d, 'start', wateringPlantsFrequency, wateringPlantsMorningEnd, setWateringPlantsMorningStart) } })}>
                         <Text style={{ fontSize: 16, color: COLORS.textDark, fontWeight: '500' }}>{wateringPlantsMorningStart instanceof Date ? (wateringPlantsFrequency === 'everyday' ? wateringPlantsMorningStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : formatOneTimeDate(wateringPlantsMorningStart)) : '--:--'}</Text>
                      </TouchableOpacity>
                      <Text style={{ marginHorizontal: 5, color: COLORS.textLight }}>➔</Text>
                      <TouchableOpacity onPress={() => openPicker({ value: wateringPlantsMorningEnd, type: wateringPlantsFrequency === 'everyday' ? 'time' : 'datetime', onChange: (d) => { validateTimeSelection(d, 'end', wateringPlantsFrequency, wateringPlantsMorningStart, setWateringPlantsMorningEnd) } })}>
                         <Text style={{ fontSize: 16, color: COLORS.textDark, fontWeight: '500' }}>{wateringPlantsMorningEnd instanceof Date ? (wateringPlantsFrequency === 'everyday' ? wateringPlantsMorningEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : formatOneTimeDate(wateringPlantsMorningEnd)) : '--:--'}</Text>
                      </TouchableOpacity>
                  </View>
                  {wateringPlantsFrequency !== 'once' && <AppSwitch value={wateringPlantsMorningEnabled} onValueChange={setWateringPlantsMorningEnabled} />}
               </View>

               <View style={{ flexDirection: wateringPlantsFrequency === 'once' ? 'column' : 'row', alignItems: wateringPlantsFrequency === 'once' ? 'stretch' : 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: wateringPlantsFrequency === 'once' ? '100%' : '30%', marginBottom: wateringPlantsFrequency === 'once' ? 8 : 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                         <Text style={{ fontSize: 20, marginRight: 8 }}>🌙</Text>
                         <Text style={{ fontSize: 16, color: COLORS.textDark }}>Evening</Text>
                      </View>
                      {wateringPlantsFrequency === 'once' && <AppSwitch value={wateringPlantsEveningEnabled} onValueChange={setWateringPlantsEveningEnabled} />}
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <TouchableOpacity onPress={() => openPicker({ value: wateringPlantsEveningStart, type: wateringPlantsFrequency === 'everyday' ? 'time' : 'datetime', onChange: (d) => { validateTimeSelection(d, 'start', wateringPlantsFrequency, wateringPlantsEveningEnd, setWateringPlantsEveningStart) } })}>
                         <Text style={{ fontSize: 16, color: COLORS.textDark, fontWeight: '500' }}>{wateringPlantsEveningStart instanceof Date ? (wateringPlantsFrequency === 'everyday' ? wateringPlantsEveningStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : formatOneTimeDate(wateringPlantsEveningStart)) : '--:--'}</Text>
                      </TouchableOpacity>
                      <Text style={{ marginHorizontal: 5, color: COLORS.textLight }}>➔</Text>
                      <TouchableOpacity onPress={() => openPicker({ value: wateringPlantsEveningEnd, type: wateringPlantsFrequency === 'everyday' ? 'time' : 'datetime', onChange: (d) => { validateTimeSelection(d, 'end', wateringPlantsFrequency, wateringPlantsEveningStart, setWateringPlantsEveningEnd) } })}>
                         <Text style={{ fontSize: 16, color: COLORS.textDark, fontWeight: '500' }}>{wateringPlantsEveningEnd instanceof Date ? (wateringPlantsFrequency === 'everyday' ? wateringPlantsEveningEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : formatOneTimeDate(wateringPlantsEveningEnd)) : '--:--'}</Text>
                      </TouchableOpacity>
                  </View>
                  {wateringPlantsFrequency !== 'once' && <AppSwitch value={wateringPlantsEveningEnabled} onValueChange={setWateringPlantsEveningEnabled} />}
               </View>
            </View>
          )}
        </View>
        )}

        {device4On && (
        <View style={[styles.controlSection, { marginTop: 10 }]}>
          <Text style={styles.sectionTitle}>Dog Feed Timer</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray, paddingBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: COLORS.textDark, marginRight: 10 }}>Timer:</Text>
              <AppSwitch
                value={dogFeedTimerEnabled}
                onValueChange={(v) => { setDogFeedTimerEnabled(v) }}
                
                
              />
            </View>
            <View style={{ width: 1, height: '100%', backgroundColor: COLORS.lightGray, marginHorizontal: 10 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
               <Text style={{ fontSize: 16, color: COLORS.textDark, marginRight: 8 }}>Mode:</Text>
               <TouchableOpacity
                 onPress={() => { setDogFeedFrequency(dogFeedFrequency === 'everyday' ? 'once' : 'everyday'); }}
                 style={{ flexDirection: 'row', alignItems: 'center', padding: 6, backgroundColor: COLORS.background, borderRadius: 6, borderWidth: 1, borderColor: COLORS.lightGray }}
               >
                  <Text style={{ color: COLORS.accent, fontWeight: '600', marginRight: 4 }}>
                     {dogFeedFrequency === 'everyday' ? 'Everyday' : 'One Time'}
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.accent }}>▼</Text>
               </TouchableOpacity>
            </View>
          </View>

          {dogFeedTimerEnabled && (
            <View>
               <View style={{ flexDirection: dogFeedFrequency === 'once' ? 'column' : 'row', alignItems: dogFeedFrequency === 'once' ? 'stretch' : 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: dogFeedFrequency === 'once' ? '100%' : '30%', marginBottom: dogFeedFrequency === 'once' ? 8 : 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                         <Text style={{ fontSize: 20, marginRight: 8 }}>⏰</Text>
                         <Text style={{ fontSize: 16, color: COLORS.textDark }}>Morning</Text>
                      </View>
                      {dogFeedFrequency === 'once' && <AppSwitch value={dogFeedMorningEnabled} onValueChange={setDogFeedMorningEnabled} />}
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <TouchableOpacity onPress={() => openPicker({ value: dogFeedMorningStart, type: dogFeedFrequency === 'everyday' ? 'time' : 'datetime', onChange: (d) => { validateTimeSelection(d, 'start', dogFeedFrequency, dogFeedMorningEnd, setDogFeedMorningStart) } })}>
                         <Text style={{ fontSize: 16, color: COLORS.textDark, fontWeight: '500' }}>{dogFeedMorningStart instanceof Date ? (dogFeedFrequency === 'everyday' ? dogFeedMorningStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : formatOneTimeDate(dogFeedMorningStart)) : '--:--'}</Text>
                      </TouchableOpacity>
                      <Text style={{ marginHorizontal: 5, color: COLORS.textLight }}>➔</Text>
                      <TouchableOpacity onPress={() => openPicker({ value: dogFeedMorningEnd, type: dogFeedFrequency === 'everyday' ? 'time' : 'datetime', onChange: (d) => { validateTimeSelection(d, 'end', dogFeedFrequency, dogFeedMorningStart, setDogFeedMorningEnd) } })}>
                         <Text style={{ fontSize: 16, color: COLORS.textDark, fontWeight: '500' }}>{dogFeedMorningEnd instanceof Date ? (dogFeedFrequency === 'everyday' ? dogFeedMorningEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : formatOneTimeDate(dogFeedMorningEnd)) : '--:--'}</Text>
                      </TouchableOpacity>
                  </View>
                  {dogFeedFrequency !== 'once' && <AppSwitch value={dogFeedMorningEnabled} onValueChange={setDogFeedMorningEnabled} />}
               </View>

               <View style={{ flexDirection: dogFeedFrequency === 'once' ? 'column' : 'row', alignItems: dogFeedFrequency === 'once' ? 'stretch' : 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: dogFeedFrequency === 'once' ? '100%' : '30%', marginBottom: dogFeedFrequency === 'once' ? 8 : 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                         <Text style={{ fontSize: 20, marginRight: 8 }}>🌙</Text>
                         <Text style={{ fontSize: 16, color: COLORS.textDark }}>Evening</Text>
                      </View>
                      {dogFeedFrequency === 'once' && <AppSwitch value={dogFeedEveningEnabled} onValueChange={setDogFeedEveningEnabled} />}
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <TouchableOpacity onPress={() => openPicker({ value: dogFeedEveningStart, type: dogFeedFrequency === 'everyday' ? 'time' : 'datetime', onChange: (d) => { validateTimeSelection(d, 'start', dogFeedFrequency, dogFeedEveningEnd, setDogFeedEveningStart) } })}>
                         <Text style={{ fontSize: 16, color: COLORS.textDark, fontWeight: '500' }}>{dogFeedEveningStart instanceof Date ? (dogFeedFrequency === 'everyday' ? dogFeedEveningStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : formatOneTimeDate(dogFeedEveningStart)) : '--:--'}</Text>
                      </TouchableOpacity>
                      <Text style={{ marginHorizontal: 5, color: COLORS.textLight }}>➔</Text>
                      <TouchableOpacity onPress={() => openPicker({ value: dogFeedEveningEnd, type: dogFeedFrequency === 'everyday' ? 'time' : 'datetime', onChange: (d) => { validateTimeSelection(d, 'end', dogFeedFrequency, dogFeedEveningStart, setDogFeedEveningEnd) } })}>
                         <Text style={{ fontSize: 16, color: COLORS.textDark, fontWeight: '500' }}>{dogFeedEveningEnd instanceof Date ? (dogFeedFrequency === 'everyday' ? dogFeedEveningEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : formatOneTimeDate(dogFeedEveningEnd)) : '--:--'}</Text>
                      </TouchableOpacity>
                  </View>
                  {dogFeedFrequency !== 'once' && <AppSwitch value={dogFeedEveningEnabled} onValueChange={setDogFeedEveningEnabled} />}
               </View>
            </View>
          )}
        </View>
        )}

        {device5On && (
        <View style={[styles.controlSection, { marginTop: 10 }]}>
          <Text style={styles.sectionTitle}>AC Control Timer</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray, paddingBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, color: COLORS.textDark, marginRight: 10 }}>Timer:</Text>
              <AppSwitch
                value={acControlTimerEnabled}
                onValueChange={(v) => { setAcControlTimerEnabled(v) }}
                
                
              />
            </View>
            <View style={{ width: 1, height: '100%', backgroundColor: COLORS.lightGray, marginHorizontal: 10 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
               <Text style={{ fontSize: 16, color: COLORS.textDark, marginRight: 8 }}>Mode:</Text>
               <TouchableOpacity
                 onPress={() => { setAcControlFrequency(acControlFrequency === 'everyday' ? 'once' : 'everyday'); }}
                 style={{ flexDirection: 'row', alignItems: 'center', padding: 6, backgroundColor: COLORS.background, borderRadius: 6, borderWidth: 1, borderColor: COLORS.lightGray }}
               >
                  <Text style={{ color: COLORS.accent, fontWeight: '600', marginRight: 4 }}>
                     {acControlFrequency === 'everyday' ? 'Everyday' : 'One Time'}
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.accent }}>▼</Text>
               </TouchableOpacity>
            </View>
          </View>

          {acControlTimerEnabled && (
            <View>
               <View style={{ flexDirection: acControlFrequency === 'once' ? 'column' : 'row', alignItems: acControlFrequency === 'once' ? 'stretch' : 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: acControlFrequency === 'once' ? '100%' : '30%', marginBottom: acControlFrequency === 'once' ? 8 : 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                         <Text style={{ fontSize: 20, marginRight: 8 }}>⏰</Text>
                         <Text style={{ fontSize: 16, color: COLORS.textDark }}>Morning</Text>
                      </View>
                      {acControlFrequency === 'once' && <AppSwitch value={acControlMorningEnabled} onValueChange={setAcControlMorningEnabled} />}
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <TouchableOpacity onPress={() => openPicker({ value: acControlMorningStart, type: acControlFrequency === 'everyday' ? 'time' : 'datetime', onChange: (d) => { validateTimeSelection(d, 'start', acControlFrequency, acControlMorningEnd, setAcControlMorningStart) } })}>
                         <Text style={{ fontSize: 16, color: COLORS.textDark, fontWeight: '500' }}>{acControlMorningStart instanceof Date ? (acControlFrequency === 'everyday' ? acControlMorningStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : formatOneTimeDate(acControlMorningStart)) : '--:--'}</Text>
                      </TouchableOpacity>
                      <Text style={{ marginHorizontal: 5, color: COLORS.textLight }}>➔</Text>
                      <TouchableOpacity onPress={() => openPicker({ value: acControlMorningEnd, type: acControlFrequency === 'everyday' ? 'time' : 'datetime', onChange: (d) => { validateTimeSelection(d, 'end', acControlFrequency, acControlMorningStart, setAcControlMorningEnd) } })}>
                         <Text style={{ fontSize: 16, color: COLORS.textDark, fontWeight: '500' }}>{acControlMorningEnd instanceof Date ? (acControlFrequency === 'everyday' ? acControlMorningEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : formatOneTimeDate(acControlMorningEnd)) : '--:--'}</Text>
                      </TouchableOpacity>
                  </View>
                  {acControlFrequency !== 'once' && <AppSwitch value={acControlMorningEnabled} onValueChange={setAcControlMorningEnabled} />}
               </View>

               <View style={{ flexDirection: acControlFrequency === 'once' ? 'column' : 'row', alignItems: acControlFrequency === 'once' ? 'stretch' : 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: acControlFrequency === 'once' ? '100%' : '30%', marginBottom: acControlFrequency === 'once' ? 8 : 0 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                         <Text style={{ fontSize: 20, marginRight: 8 }}>🌙</Text>
                         <Text style={{ fontSize: 16, color: COLORS.textDark }}>Evening</Text>
                      </View>
                      {acControlFrequency === 'once' && <AppSwitch value={acControlEveningEnabled} onValueChange={setAcControlEveningEnabled} />}
                  </View>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                      <TouchableOpacity onPress={() => openPicker({ value: acControlEveningStart, type: acControlFrequency === 'everyday' ? 'time' : 'datetime', onChange: (d) => { validateTimeSelection(d, 'start', acControlFrequency, acControlEveningEnd, setAcControlEveningStart) } })}>
                         <Text style={{ fontSize: 16, color: COLORS.textDark, fontWeight: '500' }}>{acControlEveningStart instanceof Date ? (acControlFrequency === 'everyday' ? acControlEveningStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : formatOneTimeDate(acControlEveningStart)) : '--:--'}</Text>
                      </TouchableOpacity>
                      <Text style={{ marginHorizontal: 5, color: COLORS.textLight }}>➔</Text>
                      <TouchableOpacity onPress={() => openPicker({ value: acControlEveningEnd, type: acControlFrequency === 'everyday' ? 'time' : 'datetime', onChange: (d) => { validateTimeSelection(d, 'end', acControlFrequency, acControlEveningStart, setAcControlEveningEnd) } })}>
                         <Text style={{ fontSize: 16, color: COLORS.textDark, fontWeight: '500' }}>{acControlEveningEnd instanceof Date ? (acControlFrequency === 'everyday' ? acControlEveningEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : formatOneTimeDate(acControlEveningEnd)) : '--:--'}</Text>
                      </TouchableOpacity>
                  </View>
                  {acControlFrequency !== 'once' && <AppSwitch value={acControlEveningEnabled} onValueChange={setAcControlEveningEnabled} />}
               </View>
            </View>
          )}
        </View>
        )}

        <View style={[styles.controlSection, { marginTop: 20 }]}>
          {/* <View style={{ }}>
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
            <Text style={styles.infoLabel}>Subscription</Text>
            <Text style={styles.infoValue}>{subscriptionActive === 1 ? 'Active' : 'Inactive'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Expiry</Text>
            <Text style={styles.infoValue}>{subscriptionEndDate ? String(subscriptionEndDate).slice(0, 10) : 'Unknown'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Energy Usage</Text>
            <Text style={styles.infoValue}>{deviceStatus?.energyUsage ? `${deviceStatus.energyUsage} kWh` : 'Unknown'}</Text>
          </View>
        </View> */}
        
          <View style={{ marginTop: 15 }}>
            <Text style={styles.sectionTitle}>Target Depth (100%)</Text>
            <TextInput
              style={{
                backgroundColor: COLORS.white,
                borderWidth: 1,
                borderColor: COLORS.lightGray,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 8,
                color: COLORS.textDark
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
            style={[styles.actionButton, styles.configButton, { marginBottom: 10 }]}
            onPress={() => persistRules(true)}
          >
            <Text style={styles.buttonText}>Save Configuration</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.configButton]}
            onPress={() => {
              try { logService.logButtonClick('Subscribe'); } catch {}
              // Navigate to Subscriptions in the Drawer
              const parent = navigation?.getParent?.();
              if (parent) parent.navigate('Subscriptions');
              else navigation.navigate('Subscriptions');
            }}
          >
            <Text style={styles.buttonText}>Subscribe</Text>
          </TouchableOpacity>
          
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
      
      <DateTimePickerManager ref={pickerRef} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  infoRow:{
   
  },
  infoValue:{
   fontSize:16,
   color: COLORS.textMedium,
   marginLeft:5,
  },
  configButton:{
  width:'100%',
  backgroundColor: COLORS.primary,
  padding:10,
  borderRadius:8,
  marginTop:10,
  alignItems:'center',
  justifyContent:'center',
  marginBottom:10,
  },
  infoLabel:{
    fontSize:16,
    color: COLORS.textMedium,
    marginBottom:5,
  },
  actionSection:{
   width:'100%',
   backgroundColor: COLORS.card,
   borderRadius:8,
   padding:10,
   marginTop:20,
   borderWidth:1,
   borderColor: COLORS.lightGray,
   ...SHADOWS.large,
  },
  actionButton:{
  
  },
  disableButtonText:{

  },
  buttonText:{
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  resetButtonText:{

  },
  disableButton:{

  },
  resetButton:{

  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textMedium,
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
    color: COLORS.textDark,
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
    color: COLORS.textMedium,
  },
  controlSection: {
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
 
    ...SHADOWS.large,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
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
    color: COLORS.textDark,
  },
  subscribeButton: {
    width: '100%',
    backgroundColor: COLORS.secondary,
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  subscribeMiniButton: {
    width: '100%',
    backgroundColor: COLORS.secondary,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeMiniButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
    percentageText: {
    marginTop: 0,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.darkGray,
  },
  subscriptionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  subscriptionContent: {
    alignItems: 'center',
    padding: 20,
  },
  subscriptionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  subscriptionDesc: {
    fontSize: 14,
    color: COLORS.textMedium,
    marginBottom: 16,
    textAlign: 'center',
  },
  overlaySubscribeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  overlaySubscribeButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
export default DeviceControlScreen;
