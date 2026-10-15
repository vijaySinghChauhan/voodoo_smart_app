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
import logService from '../../services/logging/logService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../../services/notifications/notificationService';
import subscriptionService from '../../services/subscriptions/subscriptionService';
 

import { SimpleDateTime } from '../../components/SimpleDateTime';
import { AppSwitch } from '../../components/AppSwitch';
import { DateTimePickerManager, DateTimePickerManagerRef } from '../../components/DateTimePickerManager';
import { COLORS, SHADOWS } from '../../theme/theme';
import Svg, { Path, Rect } from 'react-native-svg';

import BackgroundTimer from 'react-native-background-timer';
import { enqueueDeviceServerControl, enqueueDeviceServerUpdate, refreshAutomationSchedule, resolvePendingDeviceCommand, scheduleLockAutoOff } from '../../services/background/backgroundService';


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

const formatHHMM = (date: Date | null) => {
  if (!date) return '--:--';
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
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
  const flowBufferRef = React.useRef<number[]>([]);
  const SMOOTH_WINDOW = 5;
  const { user } = useAuth();
  const subdeviceIds = React.useMemo<string[]>(
    () => Array.isArray((user as any)?.subdeviceIds) ? ((user as any).subdeviceIds as string[]) : [],
    [user]
  );
  const [activeSocketHost, setActiveSocketHost] = useState<string | null>(null);
  // Debug panel state
  const [socketConnected, setSocketConnected] = useState<boolean>(false);
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(false);
  const [lastBrightness, setLastBrightness] = useState<number | null>(null);
  const [lastBrightnessAt, setLastBrightnessAt] = useState<number | null>(null);
  const [lastFlowRate, setLastFlowRate] = useState<number | null>(null);
  const [lastTotalLiters, setLastTotalLiters] = useState<number | null>(null);
  const [lastFlowAt, setLastFlowAt] = useState<number | null>(null);
  const [debugLastHeadlessEval, setDebugLastHeadlessEval] = useState<number | null>(null);
  const [debugBgDeviceCount, setDebugBgDeviceCount] = useState<number | null>(null);
  const [debugBgUnassignedCount, setDebugBgUnassignedCount] = useState<number | null>(null);
  const [debugNoFlowCount, setDebugNoFlowCount] = useState<number>(0);
  const [debugNoFlowNextDue, setDebugNoFlowNextDue] = useState<number | null>(null);
  const [debugBgSocketLast, setDebugBgSocketLast] = useState<number | null>(null);
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
  const supplyRestartBlockedRef = React.useRef<boolean>(false);
  const supplyPrevActiveRef = React.useRef<boolean>(false);
  const device2TimerRef = React.useRef<any>(null);
  
  const pickerRef = useRef<DateTimePickerManagerRef>(null);

  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      try {
        if (user?.role === 'admin') {
          if (!cancelled) {
            setSubscriptionActive(1);
            setSubscriptionEndDate('2999-12-31');
          }
          return;
        }
        const subId = user?.subscriptionId;
        if (!subId) {
          if (!cancelled) {
            setSubscriptionActive(0);
            setSubscriptionEndDate(null);
          }
          return;
        }
        const subs = await subscriptionService.listMy();
        const subsAny: any[] = Array.isArray(subs) ? (subs as any[]) : [];
        let matched: any = subsAny.find((s: any) => String(s.plan) === String(subId));
        if (!matched) {
          const plans = await subscriptionService.getPlans();
          const plansAny: any[] = Array.isArray(plans) ? (plans as any[]) : [];
          const planMatch = plansAny.find((p: any) => String(p.id) === String(subId));
          if (planMatch) {
            matched = { status: 'active', endDate: null };
          }
        }
        if (matched) {
          const end = matched.endDate || null;
          const statusRaw = matched.status;
          
          const exp = end ? new Date(String(end)) : null;
          let active = true;
          if (typeof statusRaw === 'number') {
            active = statusRaw === 1;
          } else if (typeof statusRaw === 'boolean') {
            active = statusRaw;
          } else if (typeof statusRaw === 'string') {
            const s = statusRaw.trim().toLowerCase();
            active = s === 'active' || s === '1' || s === 'true';
          }
          if (exp && !isNaN(exp.getTime())) {
            const now = new Date();
            exp.setHours(23, 59, 59, 999);
            active = active && exp.getTime() >= now.getTime();
          }
          if (!cancelled) {
            setSubscriptionActive(active ? 1 : 0);
            setSubscriptionEndDate(end ? String(end) : null);
          }
        } else {
          if (!cancelled) {
            setSubscriptionActive(0);
            setSubscriptionEndDate(null);
          }
        }
      } catch {
        if (!cancelled) {
          setSubscriptionActive(0);
          setSubscriptionEndDate(null);
        }
      }
    };
    verify();
    return () => {
      cancelled = true;
    };
  }, [user?.subscriptionId, user?.role]);

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

  const [showSupplyFreqMenu, setShowSupplyFreqMenu] = useState(false);
  const [showWateringFreqMenu, setShowWateringFreqMenu] = useState(false);
  const [showDogFreqMenu, setShowDogFreqMenu] = useState(false);
  const [showAcFreqMenu, setShowAcFreqMenu] = useState(false);

  const openTimePicker = (current: Date | null, setter: (d: Date | null) => void, onPersist?: () => void, otherDate?: Date | null) => {
    const base = current ? new Date(current) : new Date();
    openPicker({
      type: 'time',
      value: base,
      onChange: (d: Date) => {
        if (otherDate) {
          const mins = d.getHours() * 60 + d.getMinutes();
          const omins = otherDate.getHours() * 60 + otherDate.getMinutes();
          // If other is start and this is end, ensure end > start (and vice versa). Otherwise skip for now.
          if (mins === omins) {
            setter(d);
            onPersist?.();
            return;
          }
        }
        setter(d);
        onPersist?.();
      }
    });
  };

  const isPowerOnRef = React.useRef<boolean>(false);
  const flowRateRef = React.useRef<number | undefined>(undefined);
  // Ensure UI shows power OFF by default on first load
  // Full tank alert state
  const prevWaterLevelRef = React.useRef<number>(0);
  const lastFullAlertAtRef = React.useRef<number>(0);
  const fullAlertArmedRef = React.useRef<boolean>(true); // re-arm when level drops sufficiently
  const isFirstLoadRef = React.useRef<boolean>(true);
  // Subscription control gating
  const canControl = React.useMemo(() => {
    if (user?.role === 'admin') return true;
    const deviceId = selectedDeviceId || '';
    if (deviceId && subdeviceIds.includes(deviceId)) return true;
    if (!user?.subscriptionId) return false;
    return subscriptionActive === 1;
  }, [user?.role, selectedDeviceId, subdeviceIds, user?.subscriptionId, subscriptionActive]);
  
  // React.useMemo(() => {
  //   if (subscriptionActive !== 1 ) return false;
  //   if (!subscriptionEndDate) return false;
  //   const exp = new Date(String(subscriptionEndDate));
  //   if (isNaN(exp.getTime())) return false;
  //   const now = new Date();
  //   exp.setHours(23, 59, 59, 999);
  //   return exp.getTime() >= now.getTime();
  // }, [subscriptionActive, subscriptionEndDate]);

 
  
// Smooth brightness to reduce jitter
const smoothValue = (newVal: number) => {
  const buf = brightnessBufferRef.current;
  buf.push(newVal);
  if (buf.length > SMOOTH_WINDOW) buf.shift();
  const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
  return avg;
};

const smoothFlow = (newVal: number) => {
  const buf = flowBufferRef.current;
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
  const MAX_FLOW_RATE = 60;
  const normalizeFlowRate = (raw: number): number | undefined => {
    if (typeof raw !== 'number' || !isFinite(raw)) return undefined;
    let v = raw;
    if (v < 0) v = 0;
    if (v > MAX_FLOW_RATE * 5) v = v / 1000;
    if (!isFinite(v)) return undefined;
    return Math.max(0, Math.min(MAX_FLOW_RATE, v));
  };
  const normalizeTotalLiters = (raw: number): number | undefined => {
    if (typeof raw !== 'number' || !isFinite(raw)) return undefined;
    let v = raw;
    if (v < 0) v = 0;
    if (v > 100000) v = v / 1000;
    if (!isFinite(v)) return undefined;
    return v;
  };
  const applyFlowUpdate = (fr?: number, tl?: number, on?: boolean) => {
    const powerOn = typeof on === 'boolean' ? on : isPowerOnRef.current;
    if (!powerOn) {
      flowBufferRef.current = [];
      setFlowRate(0);
      setLastFlowRate(0);
    } else if (typeof fr === 'number' && isFinite(fr)) {
      const normalized = normalizeFlowRate(fr);
      if (typeof normalized === 'number' && isFinite(normalized)) {
        const smoothed = smoothFlow(normalized);
        const value = Math.max(0, Math.min(MAX_FLOW_RATE, smoothed));
        setFlowRate(value);
        setLastFlowRate(value);
      }
    }
    if (typeof tl === 'number' && isFinite(tl)) {
      const normalizedTl = normalizeTotalLiters(tl);
      if (typeof normalizedTl === 'number' && isFinite(normalizedTl)) {
        setTotalLiters(normalizedTl);
        setLastTotalLiters(normalizedTl);
      }
    }
    setLastFlowAt(Date.now());
    flowReceivedRef.current = true;
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
          applyFlowUpdate(fr, tl);
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

          // 2. Update Total Liters
          let tlRaw = state.totalLiters ?? state.total_liters ?? state.TotalLiters;
           if (tlRaw === undefined && state.data) {
             tlRaw = state.data.totalLiters ?? state.data.total_liters;
          }
          const tl = typeof tlRaw === 'number' ? tlRaw : (typeof tlRaw === 'string' ? parseFloat(tlRaw) : undefined);
          applyFlowUpdate(fr, tl);

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

  useEffect(() => {
    return () => {
      try {
        if (device2TimerRef.current) {
          BackgroundTimer.clearTimeout(device2TimerRef.current);
          device2TimerRef.current = null;
        }
      } catch {}
    };
  }, [selectedDeviceId]);

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
      try { await refreshAutomationSchedule(); } catch {}
      // Sync rules to server
      const pendingKey = await enqueueDeviceServerUpdate(selectedDeviceId, { automationRules: payload });
      await esp8266Service.updateDeviceOnServer(selectedDeviceId, { automationRules: payload });
      await resolvePendingDeviceCommand(pendingKey);
      
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

  const sendServerControl = async (
    deviceId: string,
    action: 'on' | 'off' | 'toggle',
    brightness?: number
  ): Promise<boolean> => {
    try {
      const key = await enqueueDeviceServerControl(deviceId, action, brightness);
      const ok = await esp8266Service.controlDeviceOnServer(deviceId, action, brightness);
      if (ok) {
        await resolvePendingDeviceCommand(key);
      }
      return ok;
    } catch {
      return false;
    }
  };

  const sendServerUpdate = async (deviceId: string, payload: Record<string, any>): Promise<boolean> => {
    try {
      const key = await enqueueDeviceServerUpdate(deviceId, payload);
      const ok = await esp8266Service.updateDeviceOnServer(deviceId, payload);
      if (ok) {
        await resolvePendingDeviceCommand(key);
      }
      return ok;
    } catch {
      return false;
    }
  };

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
          void sendServerControl(selectedDeviceId, 'on');
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
          try {
            const n = new Date();
            const m = checkSchedule(n, morningScheduleEnabled, supplyWaterFrequency, morningStartTime, morningEndTime);
            const e = checkSchedule(n, eveningScheduleEnabled, supplyWaterFrequency, eveningStartTime, eveningEndTime);
            if ((m.active || e.active) && supplyWaterTimerEnabled) {
              supplyRestartBlockedRef.current = true;
            }
          } catch {}
          // 1. Direct IP Control
          if (selectedDeviceIp) {
               esp8266Service.setDeviceIP(selectedDeviceIp).then(() => {
                   esp8266Service.turnOff().catch(console.warn);
               }).catch(console.warn);
          }
          // 2. Server Control Endpoint
          void sendServerControl(selectedDeviceId, 'off');
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
  useEffect(() => {
    if (!isPowerOn) {
      flowBufferRef.current = [];
      setFlowRate(0);
      setLastFlowRate(0);
    }
  }, [isPowerOn]);

  // Start/clear delayed no-flow auto OFF timer when power state or rule changes
  useEffect(() => {
    try {
      // Clear any existing timer
      if (noFlowTimerRef.current) {
        BackgroundTimer.clearTimeout(noFlowTimerRef.current);
        noFlowTimerRef.current = null;
      }
      // Arm new timer only if rule enabled and power currently ON
      if (noFlowAutoOffEnabled && isPowerOn) {
        noFlowTimerRef.current = BackgroundTimer.setTimeout(() => {
          try {
            const fr = flowRateRef.current;
            const stillOn = isPowerOnRef.current;
            if (stillOn && typeof fr === 'number' && isFinite(fr) && fr < 6.5) {
              try {
                const n = new Date();
                const m = checkSchedule(n, morningScheduleEnabled, supplyWaterFrequency, morningStartTime, morningEndTime);
                const e = checkSchedule(n, eveningScheduleEnabled, supplyWaterFrequency, eveningStartTime, eveningEndTime);
                if ((m.active || e.active) && supplyWaterTimerEnabled) {
                  supplyRestartBlockedRef.current = true;
                }
              } catch {}
              // 1. Direct IP Control
              if (selectedDeviceIp) {
                   esp8266Service.setDeviceIP(selectedDeviceIp).then(() => {
                       esp8266Service.turnOff().catch(console.warn);
                   }).catch(console.warn);
              }
              // 2. Server Control Endpoint
              if (selectedDeviceId) void sendServerControl(selectedDeviceId, 'off');
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
        BackgroundTimer.clearTimeout(noFlowTimerRef.current);
        noFlowTimerRef.current = null;
      }
    };
  }, [isPowerOn, noFlowAutoOffEnabled, noFlowDelaySec, selectedDeviceId, selectedDeviceIp]);

  const loadBackgroundDebug = async () => {
    try {
      const [bg, un, le, pendingRaw, sLast] = await Promise.all([
        AsyncStorage.getItem('last_background_device_count'),
        AsyncStorage.getItem('last_background_unassigned_count'),
        AsyncStorage.getItem('last_headless_eval'),
        AsyncStorage.getItem('pending_no_flow_auto_off'),
        AsyncStorage.getItem('bg_socket_last'),
      ]);
      setDebugBgDeviceCount(bg ? parseInt(bg, 10) : null);
      setDebugBgUnassignedCount(un ? parseInt(un, 10) : null);
      setDebugLastHeadlessEval(le ? parseInt(le, 10) : null);
      setDebugBgSocketLast(sLast ? parseInt(sLast, 10) : null);
      let count = 0;
      let nextDue: number | null = null;
      try {
        const arr = pendingRaw ? JSON.parse(pendingRaw) : [];
        if (Array.isArray(arr)) {
          const filtered = arr.filter((x: any) => !selectedDeviceId || String(x.deviceId) === String(selectedDeviceId));
          count = filtered.length;
          for (const it of filtered) {
            if (typeof it?.dueAt === 'number' && isFinite(it.dueAt)) {
              if (nextDue === null || it.dueAt < nextDue) nextDue = it.dueAt;
            }
          }
        }
      } catch {}
      setDebugNoFlowCount(count);
      setDebugNoFlowNextDue(nextDue);
    } catch {}
  };

  useEffect(() => {
    if (showDebugPanel) {
      loadBackgroundDebug();
    }
  }, [showDebugPanel, selectedDeviceId]);

  // Supply Water Timer Logic
  useEffect(() => {
    if (!rulesLoaded || !supplyWaterTimerEnabled || !selectedDeviceId) return;

    const interval = setInterval(() => {
      const now = new Date();
      setLastTimerCheck(now.getTime());
      
      const morning = checkSchedule(now, morningScheduleEnabled, supplyWaterFrequency, morningStartTime, morningEndTime);
      const evening = checkSchedule(now, eveningScheduleEnabled, supplyWaterFrequency, eveningStartTime, eveningEndTime);
      
      const inMorning = morning.active;
      const inEvening = evening.active;
      const nowActive = inMorning || inEvening;
      if (nowActive && !supplyPrevActiveRef.current) {
        supplyRestartBlockedRef.current = false;
      }
      
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
        if (canControl && !supplyRestartBlockedRef.current) {

        if (!isPowerOn) {
           // Standard trigger
           // 1. Direct IP Control (Fastest/Most Reliable on Local Network)
           if (selectedDeviceIp) {
               esp8266Service.setDeviceIP(selectedDeviceIp).then(() => {
                   esp8266Service.turnOn().catch(console.warn);
               }).catch(console.warn);
           }
           // 2. Server Control Endpoint
           void sendServerControl(selectedDeviceId, 'on');
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
           void sendServerControl(selectedDeviceId, 'on');
           setLastForcedOn(Date.now());
        }
        }
      } else {
        setSupplyWaterTimerStatus('Waiting');
        supplyRestartBlockedRef.current = false;
        if (canControl && isPowerOn) {
             if (morningFinished || eveningFinished) {
                 // Device 1 is Main Power
                 // 1. Direct IP Control
                 if (selectedDeviceIp) {
                     esp8266Service.setDeviceIP(selectedDeviceIp).then(() => {
                         esp8266Service.turnOff().catch(console.warn);
                     }).catch(console.warn);
                 }
                 // 2. Server Control Endpoint
                 void sendServerControl(selectedDeviceId, 'off');
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
      supplyPrevActiveRef.current = nowActive;
    }, 10000);

    return () => clearInterval(interval);
  }, [rulesLoaded, supplyWaterTimerEnabled, selectedDeviceId, morningStartTime, morningEndTime, eveningStartTime, eveningEndTime, isPowerOn, supplyWaterFrequency, morningScheduleEnabled, eveningScheduleEnabled, lastForcedOn, canControl]);

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
                try { await AsyncStorage.setItem(`target_${useDeviceId}`, String(tNum)); } catch {}
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
        applyFlowUpdate(fr, tl, device1On);
        
        // Initialize target from server state if available (overrides detail)
        const tRawSrv = serverState?.target ?? serverState?.targetDepth ?? serverState?.target_value;
        const tNumSrv = typeof tRawSrv === 'number' ? tRawSrv : (typeof tRawSrv === 'string' ? parseFloat(tRawSrv) : undefined);
        if (typeof tNumSrv === 'number' && isFinite(tNumSrv) && tNumSrv > 0) {
          setTargetValue(tNumSrv);
          setTargetInput(String(tNumSrv));
          effectiveTarget = tNumSrv;
          try { await AsyncStorage.setItem(`target_${useDeviceId}`, String(tNumSrv)); } catch {}
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
      const ok = await sendServerUpdate(selectedDeviceId, { [field]: value ? 1 : 0 });
      if (!ok) throw new Error('Update failed');
      Toast.show({ type: 'success', text1: 'Updated', text2: `${field} ${value ? 'ON' : 'OFF'}`, position: 'bottom' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: `Failed to update ${field}`, position: 'bottom' });
    }
  };

  const handleDoorLockToggle = async (nextValue: boolean) => {
    try {
      if (!canControl) {
        Toast.show({ type: 'error', text1: 'Subscription', text2: 'Subscription inactive. Please subscribe.', position: 'bottom' });
        return;
      }
      try {
        if (device2TimerRef.current) {
          BackgroundTimer.clearTimeout(device2TimerRef.current);
          device2TimerRef.current = null;
        }
      } catch {}

      setDevice2On(nextValue);
      void toggleDeviceField('device2', nextValue);

      if (nextValue) {
        if (!selectedDeviceId) return;
        try {
          await scheduleLockAutoOff(selectedDeviceId, 3500);
        } catch {}
        device2TimerRef.current = BackgroundTimer.setTimeout(() => {
          device2TimerRef.current = null;
          try {
            setDevice2On(false);
            void (async () => {
              try {
                if (selectedDeviceId) {
                  const ok = await sendServerUpdate(selectedDeviceId, { device2: 0 });
                  if (ok) {
                    Toast.show({ type: 'info', text1: 'Door Lock', text2: 'Auto-locked after 3.5s', position: 'bottom' });
                  }
                }
              } catch {}
            })();
          } catch {}
        }, 3500);
        Toast.show({ type: 'info', text1: 'Door Lock', text2: 'Auto-lock scheduled in 3.5s', position: 'bottom' });
      } else {
        Toast.show({ type: 'info', text1: 'Door Lock', text2: 'Manually locked', position: 'bottom' });
      }
    } catch {}
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
      const ok = await sendServerUpdate(selectedDeviceId, { target: parsed });
      if (ok) {
        Toast.show({ type: 'success', text1: 'Saved', text2: 'Target updated on server', position: 'bottom' });
        try { await AsyncStorage.setItem(`target_${selectedDeviceId}`, String(parsed)); } catch {}
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
      const ok = await sendServerControl(selectedDeviceId, value ? 'on' : 'off');
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.topBarIconButton}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path d="M15 18L9 12L15 6" stroke="#0B1E2B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Device Control</Text>
          <TouchableOpacity style={styles.topBarIconButton}>
            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
              <Path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#0B1E2B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M19.4 15C19.1167 15.75 18.6167 16.4167 17.9 16.9C17.6573 17.0619 17.5216 17.351 17.5312 17.6536C17.5409 17.9562 17.6947 18.2304 17.95 18.39L16.2 19.8C16.0723 19.9098 15.9231 19.9886 15.7647 20.0293C15.6063 20.0699 15.4428 20.0712 15.284 20.0328C14.433 19.8166 13.6333 19.4 13 18.9C12.6759 18.6636 12.2952 18.5393 11.9 18.55H12.1C11.7048 18.5393 11.3241 18.6636 11 18.9C10.3667 19.4 9.56702 19.8166 8.71602 20.0328C8.55719 20.0712 8.39371 20.0699 8.23533 20.0293C8.07695 19.9886 7.92772 19.9098 7.80002 19.8L6.05002 18.39C6.30529 18.2304 6.45913 17.9562 6.46878 17.6536C6.47842 17.351 6.34272 17.0619 6.10002 16.9C5.38334 16.4167 4.88334 15.75 4.60002 15C4.40311 14.672 4.30002 14.301 4.30002 13.925V13.875C4.30002 13.499 4.40311 13.128 4.60002 12.8C4.88334 12.05 5.38334 11.3833 6.10002 10.9C6.3418 10.7394 6.47761 10.4516 6.4683 10.1501C6.45899 9.84858 6.30595 9.57544 6.05002 9.42L7.80002 8.01C7.9272 7.90019 8.07637 7.82143 8.23469 7.78083C8.39302 7.74023 8.55647 7.73899 8.71527 7.77746C9.56629 7.99368 10.3658 8.41044 11 8.91C11.3241 9.14643 11.7048 9.27068 12.1 9.26H11.9C12.2952 9.27068 12.6759 9.14643 13 8.91C13.6343 8.41034 14.4342 7.99349 15.2855 7.77718C15.4444 7.7387 15.6081 7.73991 15.7667 7.78051C15.9253 7.8211 16.0747 7.89987 16.2025 8.01L17.95 9.42C18.2059 9.57544 18.359 9.84858 18.3683 10.1501C18.3776 10.4516 18.2418 10.7394 18 10.9C18.7167 11.3833 19.2167 12.05 19.5 12.8C19.6969 13.128 19.8 13.499 19.8 13.875V13.925C19.8 14.301 19.6969 14.672 19.4 15Z" stroke="#0B1E2B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* Device Header Row */}
        <View style={styles.deviceHeader}>
          <View style={styles.deviceHeaderLeft}>
            <View style={styles.tankIconCircle}>
              <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
                <Path d="M12 2.69L5.64 8.32C4.61929 9.24178 4.03932 10.506 4.01001 11.842C3.9807 13.178 4.50421 14.4815 5.47911 15.4564C6.45401 16.4313 7.75752 16.9548 9.09352 16.9255C10.4295 16.8962 11.6938 16.3162 12.62 15.29C13.5494 16.3136 14.8135 16.8943 16.1495 16.9246C17.4855 16.9549 18.7886 16.4328 19.7631 15.4582C20.7376 14.4836 21.2604 13.1812 21.2312 11.8456C21.2019 10.5101 20.6224 9.24642 19.6 8.32L12 2.69Z" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M12 11C12.7956 11 13.5587 11.3161 14.1213 11.8787C14.6839 12.4413 15 13.2044 15 14C15 14.7956 14.6839 15.5587 14.1213 16.1213C13.5587 16.6839 12.7956 17 12 17" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <View style={styles.deviceNameBlock}>
              <Text style={styles.deviceNameText}>Tank</Text>
              <View style={styles.connectedRow}>
                <View style={styles.connectedDot} />
                <Text style={styles.connectedText}>Connected</Text>
              </View>
            </View>
          </View>
          <View style={styles.deviceHeaderRight}>
            <TouchableOpacity style={styles.headerRightIcon}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="M1 8.5C4.5 5 8 3 12 3C16 3 19.5 5 23 8.5" stroke="#0B1E2B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M5 12.5C7 10.5 9.5 9.5 12 9.5C14.5 9.5 17 10.5 19 12.5" stroke="#0B1E2B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M8.5 16.5C9.5 15.5 10.5 15 12 15C13.5 15 14.5 15.5 15.5 16.5" stroke="#0B1E2B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M12 19H12.01" stroke="#0B1E2B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerRightIcon}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="M12 13C12.5523 13 13 12.5523 13 12C13 11.4477 12.5523 11 12 11C11.4477 11 11 11.4477 11 12C11 12.5523 11.4477 13 12 13Z" stroke="#0B1E2B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M12 6C12.5523 6 13 5.55228 13 5C13 4.44772 12.5523 4 12 4C11.4477 4 11 4.44772 11 5C11 5.55228 11.4477 6 12 6Z" stroke="#0B1E2B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M12 20C12.5523 20 13 19.5523 13 19C13 18.4477 12.5523 18 12 18C11.4477 18 11 18.4477 11 19C11 19.5523 11.4477 20 12 20Z" stroke="#0B1E2B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>

        {/* Refresh / Access Pill Buttons */}
        <View style={styles.pillButtonRow}>
          <TouchableOpacity style={styles.pillButtonOutlined} onPress={handleRefresh}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
              <Path d="M20 12C20 14.1217 19.1572 16.1566 17.6569 17.6569C16.1566 19.1572 14.1217 20 12 20C9.87827 20 7.84344 19.1572 6.34315 17.6569C4.84285 16.1566 4 14.1217 4 12C4 9.87827 4.84285 7.84344 6.34315 6.34315C7.84344 4.84285 9.87827 4 12 4L12 8M12 4L16 2M16 4L12 8" stroke="#0EB8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={styles.pillButtonTextTeal}>Refresh</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pillButtonOutlined}
            onPress={() => {
              const did = route?.params?.deviceId || selectedDeviceId;
              if (!did) {
                Toast.show({ type: 'error', text1: 'No Device', text2: 'Select a device first', position: 'bottom' });
                return;
              }
              navigation.navigate('DeviceAccess', { deviceId: did, deviceName });
            }}
          >
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
              <Path d="M10 13L21 2M21 2H15M21 2V8" stroke="#0EB8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M14 10L21 3" stroke="#0EB8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M20 14V20C20 20.5304 19.7893 21.0391 19.4142 21.4142C19.0391 21.7893 18.5304 22 18 22H4C3.46957 22 2.96086 21.7893 2.58579 21.4142C2.21071 21.0391 2 20.5304 2 20V6C2 5.46957 2.21071 4.96086 2.58579 4.58579C2.96086 4.21071 3.46957 4 4 4H10" stroke="#0EB8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text style={styles.pillButtonTextTeal}>Access</Text>
          </TouchableOpacity>
        </View>

        {/* Motor Control Card */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path d="M20 9V11C20 11.5304 19.7893 12.0391 19.4142 12.4142C19.0391 12.7893 18.5304 13 18 13H15V19H18C18.5304 19 19.0391 19.2107 19.4142 19.5858C19.7893 19.9609 20 20.4696 20 21V23" stroke="#2B8FD4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M4 23V21C4 20.4696 4.21071 19.9609 4.58579 19.5858C4.96086 19.2107 5.46957 19 6 19H9V13H6C5.46957 13 4.96086 12.7893 4.58579 12.4142C4.21071 12.0391 4 11.5304 4 11V9" stroke="#2B8FD4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <Rect x="9" y="4" width="6" height="15" rx="1.5" stroke="#2B8FD4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M9 7H15" stroke="#2B8FD4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <View style={styles.cardTitleBlock}>
              <Text style={styles.cardTitle}>Motor Control</Text>
              <Text style={styles.cardSubtitle}>Control water pump</Text>
            </View>
            <View style={{ flex: 1 }} />
            {canControl ? (
              <Switch
                value={isPowerOn}
                trackColor={{ false: '#E0E6E9', true: '#7BE0D0' }}
                thumbColor="#FFFFFF"
                onValueChange={(val) => {
                  setIsPowerOn(val);
                  try {
                    if (!val && supplyWaterTimerEnabled) {
                      const n = new Date();
                      const m = checkSchedule(n, morningScheduleEnabled, supplyWaterFrequency, morningStartTime, morningEndTime);
                      const e = checkSchedule(n, eveningScheduleEnabled, supplyWaterFrequency, eveningStartTime, eveningEndTime);
                      if (m.active || e.active) {
                        supplyRestartBlockedRef.current = true;
                      }
                    }
                  } catch {}
                  toggleDeviceField('device1', val);
                }}
              />
            ) : (
              <Text style={{ fontSize: 18 }}>🔒</Text>
            )}
          </View>
        </View>

        {/* Twin Stat Pills */}
        <View style={styles.statsRow}>
          {/* Tank Filled Pill */}
          <View style={styles.statPill}>
            <View style={[styles.statIconCircle, { backgroundColor: '#E0F2F1' }]}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M12 2.69L5.64 8.32C4.61929 9.24178 4.03932 10.506 4.01001 11.842C3.9807 13.178 4.50421 14.4815 5.47911 15.4564C6.45401 16.4313 7.75752 16.9548 9.09352 16.9255C10.4295 16.8962 11.6938 16.3162 12.62 15.29C13.5494 16.3136 14.8135 16.8943 16.1495 16.9246C17.4855 16.9549 18.7886 16.4328 19.7631 15.4582C20.7376 14.4836 21.2604 13.1812 21.2312 11.8456C21.2019 10.5101 20.6224 9.24642 19.6 8.32L12 2.69Z" stroke="#0EB8A8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M12 11C12.7956 11 13.5587 11.3161 14.1213 11.8787C14.6839 12.4413 15 13.2044 15 14C15 14.7956 14.6839 15.5587 14.1213 16.1213C13.5587 16.6839 12.7956 17 12 17" stroke="#0EB8A8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <View>
              <Text style={styles.statLabel}>Tank Filled</Text>
              <Text style={styles.statValue}>{typeof waterLevel === 'number' ? Math.round(waterLevel) : 0}%</Text>
            </View>
          </View>

          {/* Water Flow Pill */}
          <View style={styles.statPill}>
            <View style={[styles.statIconCircle, { backgroundColor: '#E0F4FF' }]}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M2 15.5C2 15.5 4 17 6 17C8 17 9.5 15.5 9.5 15.5C9.5 15.5 11 14 13 14C15 14 16.5 15.5 16.5 15.5C16.5 15.5 18 17 20 17C22 17 22 15.5 22 15.5" stroke="#2B8FD4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M2 20C2 20 4 21.5 6 21.5C8 21.5 9.5 20 9.5 20C9.5 20 11 18.5 13 18.5C15 18.5 16.5 20 16.5 20C16.5 20 18 21.5 20 21.5C22 21.5 22 20 22 20" stroke="#2B8FD4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M10 8L12 10L14 8" stroke="#2B8FD4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M12 10V2.5" stroke="#2B8FD4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <View>
              <Text style={styles.statLabel}>Water Flow</Text>
              <Text style={styles.statValue}>{typeof flowRate === 'number' ? flowRate.toFixed(1) : '0.0'} L/min</Text>
            </View>
          </View>
        </View>

        {/* Tank Visualization Card */}
        <View style={styles.card}>
          <View style={styles.tankSection}>
            {/* Exact Data Badge */}
            <View style={styles.exactDataBadge}>
              <Text style={styles.exactDataText}>Exact Data {typeof brightness === 'number' ? (brightness - (targetValueRef.current || 100)).toFixed(1) : '-0.4'}</Text>
            </View>

            {/* Tank Center */}
            <View style={styles.tankVisualWrap}>
              <WaterTank percentage={waterLevel ?? 0} flowRate={flowRate ?? 0} />
            </View>

            {/* Vertical Tick Labels */}
            <View style={styles.tickLabelsColumn}>
              {['100%', '75%', '50%', '25%', '0%'].map((label, i) => (
                <View key={label} style={styles.tickRow}>
                  <View style={styles.tickDash} />
                  <Text style={styles.tickText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Auto OFF Delay Card */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#D5F5EE' }]}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path d="M12 8V12L15 14" stroke="#0EB8A8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M15 3H18C18.7956 3 19.5587 3.31607 20.1213 3.87868C20.6839 4.44129 21 5.20435 21 6V9M12 3H9C8.20435 3 7.44129 3.31607 6.87868 3.87868C6.31607 4.44129 6 5.20435 6 6V9M3 12V9M3 12V15C3 15.7956 3.31607 16.5587 3.87868 17.1213C4.44129 17.6839 5.20435 18 6 18H9M21 12V15C21 15.7956 20.6839 16.5587 20.1213 17.1213C19.5587 17.6839 18.7956 18 18 18H15" stroke="#0EB8A8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M12 18C11.2044 18 10.4413 17.6839 9.87868 17.1213C9.31607 16.5587 9 15.7956 9 15V9C9 8.20435 9.31607 7.44129 9.87868 6.87868C10.4413 6.31607 11.2044 6 12 6C12.7956 6 13.5587 6.31607 14.1213 6.87868C14.6839 7.44129 15 8.20435 15 9V15C15 15.7956 14.6839 16.5587 14.1213 17.1213C13.5587 17.6839 12.7956 18 12 18Z" stroke="#0EB8A8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <View style={styles.cardTitleBlock}>
              <Text style={styles.cardTitle}>Auto OFF Delay</Text>
              <Text style={styles.cardSubtitle}>Stop motor after selected time</Text>
            </View>
            <View style={{ flex: 1 }} />
            {canControl && (
              <Switch
                value={noFlowAutoOffEnabled}
                trackColor={{ false: '#E0E6E9', true: '#7BE0D0' }}
                thumbColor="#FFFFFF"
                onValueChange={(v) => { setNoFlowAutoOffEnabled(v); persistRules(); }}
              />
            )}
          </View>

          {/* Delay Dropdown */}
          <View style={{ marginTop: 14 }}>
            <TouchableOpacity
              onPress={() => setShowNoFlowDelayMenu((s) => !s)}
              style={styles.dropdownPill}
            >
              <Text style={styles.dropdownText}>{noFlowDelaySec}s</Text>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M6 9L12 15L18 9" stroke="#5B7384" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </TouchableOpacity>
            {showNoFlowDelayMenu && (
              <View style={styles.dropdownMenu}>
                {[10, 20, 30, 40, 60, 120].map((sec) => (
                  <TouchableOpacity
                    key={sec}
                    onPress={() => {
                      setNoFlowDelaySec(sec);
                      setShowNoFlowDelayMenu(false);
                      persistRules();
                    }}
                    style={styles.dropdownItem}
                  >
                    <Text style={styles.dropdownItemText}>{sec} seconds</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Automation Rules Card */}
        <View style={styles.card}>
          <Text style={styles.rulesCardTitle}>Automation Rules: Motor</Text>

          {/* TURN ON Rule */}
          <View style={styles.ruleBlock}>
            <View style={styles.ruleHeaderRow}>
              <Text style={styles.ruleLabel}>TURN ON rule</Text>
              {canControl && (
                <Switch
                  value={onEnabled}
                  trackColor={{ false: '#E0E6E9', true: '#7BE0D0' }}
                  thumbColor="#FFFFFF"
                  onValueChange={(v) => { setOnEnabled(v); }}
                />
              )}
            </View>
            <View style={styles.ruleDropdownRow}>
              <TouchableOpacity
                onPress={() => setShowOnOperatorMenu((s) => !s)}
                style={[styles.ruleDropdown, { flex: 1, marginRight: 8 }]}
              >
                <Text style={styles.ruleDropdownText}>{onOperator === 'lt' ? 'Less than' : 'More than or equal'}</Text>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M6 9L12 15L18 9" stroke="#5B7384" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowOnPercentMenu((s) => !s)}
                style={[styles.ruleDropdown, { flex: 1, marginLeft: 8 }]}
              >
                <Text style={styles.ruleDropdownText}>{onThreshold}%</Text>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M6 9L12 15L18 9" stroke="#5B7384" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TouchableOpacity>
            </View>
            {showOnOperatorMenu && (
              <View style={styles.dropdownMenu}>
                {[{ key: 'lt', label: 'Less than' }].map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => { setOnOperator(opt.key as 'lt' | 'ge'); setShowOnOperatorMenu(false); persistRules(); }}
                    style={styles.dropdownItem}
                  >
                    <Text style={styles.dropdownItemText}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {showOnPercentMenu && (
              <View style={styles.dropdownMenu}>
                {[10, 20, 30, 40, 50].map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => { setOnThreshold(p); setShowOnPercentMenu(false); persistRules(); }}
                    style={styles.dropdownItem}
                  >
                    <Text style={styles.dropdownItemText}>{p}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={styles.ruleDivider} />

          {/* TURN OFF Rule */}
          <View style={styles.ruleBlock}>
            <View style={styles.ruleHeaderRow}>
              <Text style={styles.ruleLabel}>TURN OFF rule</Text>
              {canControl && (
                <Switch
                  value={offEnabled}
                  trackColor={{ false: '#E0E6E9', true: '#7BE0D0' }}
                  thumbColor="#FFFFFF"
                  onValueChange={(v) => { setOffEnabled(v); }}
                />
              )}
            </View>
            <View style={styles.ruleDropdownRow}>
              <TouchableOpacity
                onPress={() => setShowOffOperatorMenu((s) => !s)}
                style={[styles.ruleDropdown, { flex: 1, marginRight: 8 }]}
              >
                <Text style={styles.ruleDropdownText}>{offOperator === 'lt' ? 'Less than' : 'More than'}</Text>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M6 9L12 15L18 9" stroke="#5B7384" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowOffPercentMenu((s) => !s)}
                style={[styles.ruleDropdown, { flex: 1, marginLeft: 8 }]}
              >
                <Text style={styles.ruleDropdownText}>{offThreshold}%</Text>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M6 9L12 15L18 9" stroke="#5B7384" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TouchableOpacity>
            </View>
            {showOffOperatorMenu && (
              <View style={styles.dropdownMenu}>
                {([{ key: 'ge', label: 'More than' }] as const).map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => { setOffOperator(opt.key); setShowOffOperatorMenu(false); persistRules(); }}
                    style={styles.dropdownItem}
                  >
                    <Text style={styles.dropdownItemText}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {showOffPercentMenu && (
              <View style={styles.dropdownMenu}>
                {[70, 80, 85, 88, 90, 93, 95, 98, 100, 105, 110].map((p) => (
                  <TouchableOpacity
                    key={p}
                    onPress={() => { setOffThreshold(p); setShowOffPercentMenu(false); persistRules(); }}
                    style={styles.dropdownItem}
                  >
                    <Text style={styles.dropdownItemText}>{p}%</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Supply Watering Schedule Card */}
        <View style={styles.card}>
          <View style={styles.schedHeaderRow}>
            <View style={styles.schedHeaderLeft}>
              <Text style={[styles.schedTimerLabel, { marginRight: 14 }]}>Timer:</Text>
              {canControl ? (
                <Switch
                  value={supplyWaterTimerEnabled}
                  trackColor={{ false: '#E0E6E9', true: '#0EB8A8' }}
                  thumbColor="#FFFFFF"
                  onValueChange={(v) => { setSupplyWaterTimerEnabled(v); persistRules(); refreshAutomationSchedule(); }}
                />
              ) : (
                <Text style={{ fontSize: 14 }}>🔒</Text>
              )}
            </View>
            <View style={styles.schedHeaderRight}>
              <Text style={styles.schedModeLabel}>Mode:</Text>
              <TouchableOpacity
                onPress={() => setShowSupplyFreqMenu((s) => !s)}
                style={styles.schedModeDropdown}
              >
                <Text style={styles.schedModeText}>{supplyWaterFrequency === 'once' ? 'Once' : 'Everyday'}</Text>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M6 9L12 15L18 9" stroke="#0EB8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TouchableOpacity>
              {showSupplyFreqMenu && (
                <View style={styles.schedModeMenu}>
                  {(['everyday', 'once'] as const).map((k) => (
                    <TouchableOpacity
                      key={k}
                      onPress={() => { setSupplyWaterFrequency(k); setShowSupplyFreqMenu(false); persistRules(); refreshAutomationSchedule(); }}
                      style={styles.dropdownItem}
                    >
                      <Text style={styles.dropdownItemText}>{k === 'once' ? 'Once' : 'Everyday'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.schedDivider} />

          {/* Morning Row */}
          <View style={styles.schedRow}>
            <View style={styles.schedRowLeft}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path d="M12 8V12L15 14" stroke="#C63B3B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke="#C63B3B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.schedRowLabel}>Morning</Text>
            </View>
            <TouchableOpacity
              style={styles.schedTimeBlock}
              disabled={!canControl || !supplyWaterTimerEnabled || !morningScheduleEnabled}
             onPress={() => {
                      openPicker({
                        type: 'time',
                        value: morningStartTime ?? new Date(),
                        onChange: (start) => {
                          setMorningStartTime(start);

                          openPicker({
                            type: 'time',
                            value: morningEndTime ?? start,
                            onChange: (end) => {
                              setMorningEndTime(end);
                              persistRules();
                              refreshAutomationSchedule();
                            },
                          });
                        },
                      });
                    }}
            >
              <Text style={styles.schedTimeStart}>{formatHHMM(morningStartTime)}</Text>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="#8FA4B2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.schedTimeEnd}>{formatHHMM(morningEndTime)}</Text>
            </TouchableOpacity>
            {canControl ? (
              <Switch
                value={supplyWaterTimerEnabled && morningScheduleEnabled}
                trackColor={{ false: '#E0E6E9', true: '#0EB8A8' }}
                thumbColor="#FFFFFF"
                disabled={!supplyWaterTimerEnabled}
                onValueChange={(v) => { setMorningScheduleEnabled(v); persistRules(); refreshAutomationSchedule(); }}
              />
            ) : (
              <Text>🔒</Text>
            )}
          </View>

          <View style={styles.schedRowDivider} />

          {/* Evening Row */}
          <View style={styles.schedRow}>
            <View style={styles.schedRowLeft}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke="#F0B429" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.schedRowLabel}>Evening</Text>
            </View>
            <TouchableOpacity
              style={styles.schedTimeBlock}
              disabled={!canControl || !supplyWaterTimerEnabled || !eveningScheduleEnabled}


        onPress={() => {
          openPicker({
            type: 'time',
            value: morningStartTime ?? new Date(),
            onChange: (start) => {
              setMorningStartTime(start);

              openPicker({
                type: 'time',
                value: morningEndTime ?? start,
                onChange: (end) => {
                  setMorningEndTime(end);
                  persistRules();
                  refreshAutomationSchedule();
                },
              });
            },
          });
        }}


            >
              <Text style={styles.schedTimeStart}>{formatHHMM(eveningStartTime)}</Text>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="#8FA4B2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.schedTimeEnd}>{formatHHMM(eveningEndTime)}</Text>
            </TouchableOpacity>
            {canControl ? (
              <Switch
                value={supplyWaterTimerEnabled && eveningScheduleEnabled}
                trackColor={{ false: '#E0E6E9', true: '#0EB8A8' }}
                thumbColor="#FFFFFF"
                disabled={!supplyWaterTimerEnabled}
                onValueChange={(v) => { setEveningScheduleEnabled(v); persistRules(); refreshAutomationSchedule(); }}
              />
            ) : (
              <Text>🔒</Text>
            )}
          </View>
        </View>

        {/* Watering Plants Schedule Card */}
        <View style={styles.card}>
          <Text style={styles.schedCardTitle}>Watering Plants Schedule</Text>
          <View style={styles.schedHeaderRow}>
            <View style={styles.schedHeaderLeft}>
              <Text style={[styles.schedTimerLabel, { marginRight: 14 }]}>Timer:</Text>
              {canControl ? (
                <Switch
                  value={wateringPlantsTimerEnabled}
                  trackColor={{ false: '#E0E6E9', true: '#0EB8A8' }}
                  thumbColor="#FFFFFF"
                  onValueChange={(v) => { setWateringPlantsTimerEnabled(v); persistRules(); refreshAutomationSchedule(); }}
                />
              ) : null}
            </View>
            <View style={styles.schedHeaderRight}>
              <Text style={styles.schedModeLabel}>Mode:</Text>
              <TouchableOpacity onPress={() => setShowWateringFreqMenu((s) => !s)} style={styles.schedModeDropdown}>
                <Text style={styles.schedModeText}>{wateringPlantsFrequency === 'once' ? 'Once' : 'Everyday'}</Text>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M6 9L12 15L18 9" stroke="#0EB8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TouchableOpacity>
              {showWateringFreqMenu && (
                <View style={styles.schedModeMenu}>
                  {(['everyday', 'once'] as const).map((k) => (
                    <TouchableOpacity
                      key={k}
                      onPress={() => { setWateringPlantsFrequency(k); setShowWateringFreqMenu(false); persistRules(); refreshAutomationSchedule(); }}
                      style={styles.dropdownItem}
                    >
                      <Text style={styles.dropdownItemText}>{k === 'once' ? 'Once' : 'Everyday'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
          <View style={styles.schedDivider} />
          <View style={styles.schedRow}>
            <View style={styles.schedRowLeft}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path d="M12 2.69L5.64 8.32C4.619 9.242 4.04 10.506 4.01 11.842C3.981 13.178 4.504 14.482 5.479 15.456C6.454 16.431 7.758 16.955 9.094 16.926C10.43 16.896 11.694 16.316 12.62 15.29C13.549 16.314 14.814 16.894 16.15 16.925C17.486 16.955 18.789 16.433 19.763 15.458C20.738 14.484 21.26 13.181 21.231 11.846C21.202 10.51 20.622 9.246 19.6 8.32L12 2.69Z" stroke="#0EB8A8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.schedRowLabel}>Morning</Text>
            </View>
            <TouchableOpacity
              style={styles.schedTimeBlock}
              disabled={!canControl || !wateringPlantsTimerEnabled || !wateringPlantsMorningEnabled}
              onPress={() => {
                openPicker({
                  type: 'time',
                  value: wateringPlantsMorningStart ?? new Date(),
                  onChange: (d) => {
                    setWateringPlantsMorningStart(d);
                    openPicker({
                      type: 'time',
                      value: wateringPlantsMorningEnd ?? d,
                      onChange: (e) => { setWateringPlantsMorningEnd(e); persistRules(); refreshAutomationSchedule(); }
                    });
                  }
                });
              }}
            >
              <Text style={styles.schedTimeStart}>{formatHHMM(wateringPlantsMorningStart)}</Text>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="#8FA4B2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.schedTimeEnd}>{formatHHMM(wateringPlantsMorningEnd)}</Text>
            </TouchableOpacity>
            {canControl ? (
              <Switch
                value={wateringPlantsTimerEnabled && wateringPlantsMorningEnabled}
                trackColor={{ false: '#E0E6E9', true: '#0EB8A8' }}
                thumbColor="#FFFFFF"
                disabled={!wateringPlantsTimerEnabled}
                onValueChange={(v) => { setWateringPlantsMorningEnabled(v); persistRules(); refreshAutomationSchedule(); }}
              />
            ) : null}
          </View>
          <View style={styles.schedRowDivider} />
          <View style={styles.schedRow}>
            <View style={styles.schedRowLeft}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke="#F0B429" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.schedRowLabel}>Evening</Text>
            </View>
            <TouchableOpacity
              style={styles.schedTimeBlock}
              disabled={!canControl || !wateringPlantsTimerEnabled || !wateringPlantsEveningEnabled}
              onPress={() => {
                openPicker({
                  type: 'time',
                  value: wateringPlantsEveningStart ?? new Date(),
                  onChange: (d) => {
                    setWateringPlantsEveningStart(d);
                    openPicker({
                      type: 'time',
                      value: wateringPlantsEveningEnd ?? d,
                      onChange: (e) => { setWateringPlantsEveningEnd(e); persistRules(); refreshAutomationSchedule(); }
                    });
                  }
                });
              }}
            >
              <Text style={styles.schedTimeStart}>{formatHHMM(wateringPlantsEveningStart)}</Text>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="#8FA4B2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.schedTimeEnd}>{formatHHMM(wateringPlantsEveningEnd)}</Text>
            </TouchableOpacity>
            {canControl ? (
              <Switch
                value={wateringPlantsTimerEnabled && wateringPlantsEveningEnabled}
                trackColor={{ false: '#E0E6E9', true: '#0EB8A8' }}
                thumbColor="#FFFFFF"
                disabled={!wateringPlantsTimerEnabled}
                onValueChange={(v) => { setWateringPlantsEveningEnabled(v); persistRules(); refreshAutomationSchedule(); }}
              />
            ) : null}
          </View>
        </View>

        {/* Dog Feed Schedule Card */}
        <View style={styles.card}>
          <Text style={styles.schedCardTitle}>Dog Feed Schedule</Text>
          <View style={styles.schedHeaderRow}>
            <View style={styles.schedHeaderLeft}>
              <Text style={[styles.schedTimerLabel, { marginRight: 14 }]}>Timer:</Text>
              {canControl ? (
                <Switch
                  value={dogFeedTimerEnabled}
                  trackColor={{ false: '#E0E6E9', true: '#0EB8A8' }}
                  thumbColor="#FFFFFF"
                  onValueChange={(v) => { setDogFeedTimerEnabled(v); persistRules(); refreshAutomationSchedule(); }}
                />
              ) : null}
            </View>
            <View style={styles.schedHeaderRight}>
              <Text style={styles.schedModeLabel}>Mode:</Text>
              <TouchableOpacity onPress={() => setShowDogFreqMenu((s) => !s)} style={styles.schedModeDropdown}>
                <Text style={styles.schedModeText}>{dogFeedFrequency === 'once' ? 'Once' : 'Everyday'}</Text>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M6 9L12 15L18 9" stroke="#0EB8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TouchableOpacity>
              {showDogFreqMenu && (
                <View style={styles.schedModeMenu}>
                  {(['everyday', 'once'] as const).map((k) => (
                    <TouchableOpacity
                      key={k}
                      onPress={() => { setDogFeedFrequency(k); setShowDogFreqMenu(false); persistRules(); refreshAutomationSchedule(); }}
                      style={styles.dropdownItem}
                    >
                      <Text style={styles.dropdownItemText}>{k === 'once' ? 'Once' : 'Everyday'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
          <View style={styles.schedDivider} />
          <View style={styles.schedRow}>
            <View style={styles.schedRowLeft}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path d="M12 8V12L15 14" stroke="#C63B3B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke="#C63B3B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.schedRowLabel}>Morning</Text>
            </View>
            <TouchableOpacity
              style={styles.schedTimeBlock}
              disabled={!canControl || !dogFeedTimerEnabled || !dogFeedMorningEnabled}
              onPress={() => {
                openPicker({
                  type: 'time',
                  value: dogFeedMorningStart ?? new Date(),
                  onChange: (d) => {
                    setDogFeedMorningStart(d);
                    openPicker({
                      type: 'time',
                      value: dogFeedMorningEnd ?? d,
                      onChange: (e) => { setDogFeedMorningEnd(e); persistRules(); refreshAutomationSchedule(); }
                    });
                  }
                });
              }}
            >
              <Text style={styles.schedTimeStart}>{formatHHMM(dogFeedMorningStart)}</Text>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="#8FA4B2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.schedTimeEnd}>{formatHHMM(dogFeedMorningEnd)}</Text>
            </TouchableOpacity>
            {canControl ? (
              <Switch
                value={dogFeedTimerEnabled && dogFeedMorningEnabled}
                trackColor={{ false: '#E0E6E9', true: '#0EB8A8' }}
                thumbColor="#FFFFFF"
                disabled={!dogFeedTimerEnabled}
                onValueChange={(v) => { setDogFeedMorningEnabled(v); persistRules(); refreshAutomationSchedule(); }}
              />
            ) : null}
          </View>
          <View style={styles.schedRowDivider} />
          <View style={styles.schedRow}>
            <View style={styles.schedRowLeft}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke="#F0B429" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.schedRowLabel}>Evening</Text>
            </View>
            <TouchableOpacity
              style={styles.schedTimeBlock}
              disabled={!canControl || !dogFeedTimerEnabled || !dogFeedEveningEnabled}
              onPress={() => {
                openPicker({
                  type: 'time',
                  value: dogFeedEveningStart ?? new Date(),
                  onChange: (d) => {
                    setDogFeedEveningStart(d);
                    openPicker({
                      type: 'time',
                      value: dogFeedEveningEnd ?? d,
                      onChange: (e) => { setDogFeedEveningEnd(e); persistRules(); refreshAutomationSchedule(); }
                    });
                  }
                });
              }}
            >
              <Text style={styles.schedTimeStart}>{formatHHMM(dogFeedEveningStart)}</Text>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="#8FA4B2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.schedTimeEnd}>{formatHHMM(dogFeedEveningEnd)}</Text>
            </TouchableOpacity>
            {canControl ? (
              <Switch
                value={dogFeedTimerEnabled && dogFeedEveningEnabled}
                trackColor={{ false: '#E0E6E9', true: '#0EB8A8' }}
                thumbColor="#FFFFFF"
                disabled={!dogFeedTimerEnabled}
                onValueChange={(v) => { setDogFeedEveningEnabled(v); persistRules(); refreshAutomationSchedule(); }}
              />
            ) : null}
          </View>
        </View>

        {/* Bulb / Fan / AC Schedule Card */}
        <View style={styles.card}>
          <Text style={styles.schedCardTitle}>Bulb / Fan / AC Schedule</Text>
          <View style={styles.schedHeaderRow}>
            <View style={styles.schedHeaderLeft}>
              <Text style={[styles.schedTimerLabel, { marginRight: 14 }]}>Timer:</Text>
              {canControl ? (
                <Switch
                  value={acControlTimerEnabled}
                  trackColor={{ false: '#E0E6E9', true: '#0EB8A8' }}
                  thumbColor="#FFFFFF"
                  onValueChange={(v) => { setAcControlTimerEnabled(v); persistRules(); refreshAutomationSchedule(); }}
                />
              ) : null}
            </View>
            <View style={styles.schedHeaderRight}>
              <Text style={styles.schedModeLabel}>Mode:</Text>
              <TouchableOpacity onPress={() => setShowAcFreqMenu((s) => !s)} style={styles.schedModeDropdown}>
                <Text style={styles.schedModeText}>{acControlFrequency === 'once' ? 'Once' : 'Everyday'}</Text>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M6 9L12 15L18 9" stroke="#0EB8A8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </Svg>
              </TouchableOpacity>
              {showAcFreqMenu && (
                <View style={styles.schedModeMenu}>
                  {(['everyday', 'once'] as const).map((k) => (
                    <TouchableOpacity
                      key={k}
                      onPress={() => { setAcControlFrequency(k); setShowAcFreqMenu(false); persistRules(); refreshAutomationSchedule(); }}
                      style={styles.dropdownItem}
                    >
                      <Text style={styles.dropdownItemText}>{k === 'once' ? 'Once' : 'Everyday'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
          <View style={styles.schedDivider} />
          <View style={styles.schedRow}>
            <View style={styles.schedRowLeft}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path d="M12 8V12L15 14" stroke="#C63B3B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z" stroke="#C63B3B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.schedRowLabel}>Morning</Text>
            </View>
            <TouchableOpacity
              style={styles.schedTimeBlock}
              disabled={!canControl || !acControlTimerEnabled || !acControlMorningEnabled}
              onPress={() => {
                openPicker({
                  type: 'time',
                  value: acControlMorningStart ?? new Date(),
                  onChange: (d) => {
                    setAcControlMorningStart(d);
                    openPicker({
                      type: 'time',
                      value: acControlMorningEnd ?? d,
                      onChange: (e) => { setAcControlMorningEnd(e); persistRules(); refreshAutomationSchedule(); }
                    });
                  }
                });
              }}
            >
              <Text style={styles.schedTimeStart}>{formatHHMM(acControlMorningStart)}</Text>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="#8FA4B2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.schedTimeEnd}>{formatHHMM(acControlMorningEnd)}</Text>
            </TouchableOpacity>
            {canControl ? (
              <Switch
                value={acControlTimerEnabled && acControlMorningEnabled}
                trackColor={{ false: '#E0E6E9', true: '#0EB8A8' }}
                thumbColor="#FFFFFF"
                disabled={!acControlTimerEnabled}
                onValueChange={(v) => { setAcControlMorningEnabled(v); persistRules(); refreshAutomationSchedule(); }}
              />
            ) : null}
          </View>
          <View style={styles.schedRowDivider} />
          <View style={styles.schedRow}>
            <View style={styles.schedRowLeft}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke="#F0B429" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.schedRowLabel}>Evening</Text>
            </View>
            <TouchableOpacity
              style={styles.schedTimeBlock}
              disabled={!canControl || !acControlTimerEnabled || !acControlEveningEnabled}
              onPress={() => {
                openPicker({
                  type: 'time',
                  value: acControlEveningStart ?? new Date(),
                  onChange: (d) => {
                    setAcControlEveningStart(d);
                    openPicker({
                      type: 'time',
                      value: acControlEveningEnd ?? d,
                      onChange: (e) => { setAcControlEveningEnd(e); persistRules(); refreshAutomationSchedule(); }
                    });
                  }
                });
              }}
            >
              <Text style={styles.schedTimeStart}>{formatHHMM(acControlEveningStart)}</Text>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                <Path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="#8FA4B2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={styles.schedTimeEnd}>{formatHHMM(acControlEveningEnd)}</Text>
            </TouchableOpacity>
            {canControl ? (
              <Switch
                value={acControlTimerEnabled && acControlEveningEnabled}
                trackColor={{ false: '#E0E6E9', true: '#0EB8A8' }}
                thumbColor="#FFFFFF"
                disabled={!acControlTimerEnabled}
                onValueChange={(v) => { setAcControlEveningEnabled(v); persistRules(); refreshAutomationSchedule(); }}
              />
            ) : null}
          </View>
        </View>

        {/* Main Controls 2x2 Card */}
        <View style={styles.card}>
          <Text style={styles.rulesCardTitle}>Main Controls</Text>
          <View style={styles.mainGrid}>
            <View style={styles.mainGridCell}>
              <Text style={styles.mainCellLabel}>Door Lock</Text>
              {canControl ? (
                <Switch
                  value={device2On}
                  trackColor={{ false: '#E0E6E9', true: '#0EB8A8' }}
                  thumbColor="#FFFFFF"
                  onValueChange={(v) => handleDoorLockToggle(v)}
                />
              ) : null}
            </View>
            <View style={styles.mainGridCellRight}>
              <Text style={styles.mainCellLabel}>Watering</Text>
              {canControl ? (
                <Switch
                  value={device3On}
                  trackColor={{ false: '#E0E6E9', true: '#0EB8A8' }}
                  thumbColor="#FFFFFF"
                  onValueChange={(v) => toggleDeviceField('device3', v)}
                />
              ) : null}
            </View>
          </View>
          <View style={styles.mainGridDivider} />
          <View style={styles.mainGrid}>
            <View style={styles.mainGridCell}>
              <Text style={styles.mainCellLabel}>Dog Feed</Text>
              {canControl ? (
                <Switch
                  value={device3On}
                  trackColor={{ false: '#E0E6E9', true: '#0EB8A8' }}
                  thumbColor="#FFFFFF"
                  onValueChange={(v) => toggleDeviceField('device3', v)}
                />
              ) : null}
            </View>
            <View style={styles.mainGridCellRight}>
              <Text style={styles.mainCellLabel}>Bulb/Fan</Text>
              {canControl ? (
                <Switch
                  value={device5On}
                  trackColor={{ false: '#E0E6E9', true: '#0EB8A8' }}
                  thumbColor="#FFFFFF"
                  onValueChange={(v) => toggleDeviceField('device5', v)}
                />
              ) : null}
            </View>
          </View>
        </View>

        {/* Target Depth Card */}
        <View style={styles.card}>
          <Text style={styles.rulesCardTitle}>Target Depth ({targetValue || 100}%)</Text>
          <TextInput
            value={targetInput}
            onChangeText={(t) => setTargetInput(t)}
            keyboardType="numeric"
            placeholder="Target percent (e.g. 90)"
            placeholderTextColor="#8FA4B2"
            style={styles.targetInput}
          />
          <TouchableOpacity style={styles.primaryButton} onPress={handleSaveTarget}>
            <Text style={styles.primaryButtonText}>Save Target</Text>
          </TouchableOpacity>
        </View>

        {/* Device Actions Card */}
        <View style={styles.card}>
          <Text style={styles.rulesCardTitle}>Device Actions</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => persistRules()}>
            <Text style={styles.primaryButtonText}>Save Configuration</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.plainActionBtn} onPress={handleReset}>
            <Text style={styles.plainActionText}>Reset Device</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.plainActionBtn} onPress={handleDisable}>
            <Text style={[styles.plainActionText, { color: '#C0392B' }]}>Disable Device</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryButton, { marginTop: 8 }]} onPress={() => navigation.navigate('AddDevice')}>
            <Text style={styles.primaryButtonText}>Configure WiFi</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>

      <DateTimePickerManager ref={pickerRef} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FCFD',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7FCFD',
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.textMedium,
  },
  scrollView: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },

  // Top Bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 12,
  },
  topBarIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    ...SHADOWS.small,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0B1E2B',
    letterSpacing: 0.2,
  },

  // Device Header Row
  deviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...SHADOWS.medium,
  },
  deviceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tankIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#8EE4D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceNameBlock: {
    justifyContent: 'center',
  },
  deviceNameText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0B1E2B',
    marginBottom: 3,
  },
  connectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectedDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#22A06B',
    marginRight: 5,
  },
  connectedText: {
    fontSize: 12,
    color: '#5B7384',
    fontWeight: '500',
  },
  deviceHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0FAF9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // Refresh / Access Pill Buttons
  pillButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  pillButtonOutlined: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#B2EDE6',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 6,
  },
  pillButtonTextTeal: {
    color: '#0EB8A8',
    fontSize: 14,
    fontWeight: '600',
  },

  // Cards - white with radius-22
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    ...SHADOWS.medium,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitleBlock: {
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B1E2B',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#5B7384',
    fontWeight: '400',
  },

  // Twin Stat Pills
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 6,
    ...SHADOWS.small,
  },
  statIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statLabel: {
    fontSize: 11,
    color: '#5B7384',
    fontWeight: '500',
    marginBottom: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B1E2B',
  },

  // Tank Visualization Section
  tankSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  exactDataBadge: {
    alignSelf: 'flex-start',
    marginTop: 20,
    backgroundColor: '#F0FAF9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#D5F5EE',
  },
  exactDataText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0A5C5C',
  },
  tankVisualWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickLabelsColumn: {
    paddingVertical: 12,
    height: 280,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tickRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tickDash: {
    width: 8,
    height: 1.5,
    backgroundColor: '#C7D5DD',
    marginRight: 5,
    borderRadius: 1,
  },
  tickText: {
    fontSize: 10,
    color: '#9DB0BB',
    fontWeight: '500',
  },

  // Dropdown
  dropdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7FCFD',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#E6F2F1',
    width: 120,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0B1E2B',
  },
  dropdownMenu: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6F2F1',
    ...SHADOWS.small,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F7F6',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#0B1E2B',
    fontWeight: '500',
  },

  // Automation Rules Card
  rulesCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1E2B',
    marginBottom: 16,
  },
  ruleBlock: {
    marginBottom: 6,
  },
  ruleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ruleLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A3444',
    letterSpacing: 0.3,
  },
  ruleDropdownRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  ruleDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F7FCFD',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#E6F2F1',
  },
  ruleDropdownText: {
    fontSize: 13,
    color: '#0B1E2B',
    fontWeight: '500',
  },
  ruleDivider: {
    height: 1,
    backgroundColor: '#F0F7F6',
    marginVertical: 18,
  },

  // Schedule Cards
  schedCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1E2B',
    marginBottom: 14,
  },
  schedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  schedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  schedTimerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A3444',
  },
  schedHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  schedModeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A3444',
    marginRight: 10,
  },
  schedModeDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8FBF7',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#C7F0E8',
  },
  schedModeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0EB8A8',
    marginRight: 6,
  },
  schedModeMenu: {
    position: 'absolute',
    top: 36,
    right: 0,
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E6F2F1',
    ...SHADOWS.small,
    overflow: 'hidden',
    zIndex: 20,
  },
  schedDivider: {
    height: 1,
    backgroundColor: '#F0F7F6',
    marginVertical: 14,
  },
  schedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  schedRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 100,
  },
  schedRowLabel: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#1A3444',
  },
  schedTimeBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginHorizontal: 6,
  },
  schedTimeStart: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0B1E2B',
    minWidth: 50,
    textAlign: 'right',
  },
  schedTimeEnd: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0B1E2B',
    minWidth: 50,
    textAlign: 'left',
    marginLeft: 10,
  },
  schedRowDivider: {
    height: 1,
    backgroundColor: '#F0F7F6',
    marginVertical: 10,
  },

  // Main Controls 2x2 grid
  mainGrid: {
    flexDirection: 'row',
  },
  mainGridCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 14,
    paddingVertical: 12,
  },
  mainGridCellRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 14,
    paddingVertical: 12,
    borderLeftWidth: 1,
    borderLeftColor: '#F0F7F6',
  },
  mainCellLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A3444',
  },
  mainGridDivider: {
    height: 1,
    backgroundColor: '#F0F7F6',
    marginVertical: 0,
  },

  // Target Depth
  targetInput: {
    borderWidth: 1,
    borderColor: '#E6F2F1',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0B1E2B',
    marginBottom: 14,
  },

  // Primary & plain action buttons
  primaryButton: {
    backgroundColor: '#0EB8A8',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    ...SHADOWS.small,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  plainActionBtn: {
    paddingVertical: 11,
    marginTop: 4,
    alignItems: 'flex-start',
  },
  plainActionText: {
    fontSize: 14,
    color: '#1A3444',
    fontWeight: '600',
  },
});
export default DeviceControlScreen;
