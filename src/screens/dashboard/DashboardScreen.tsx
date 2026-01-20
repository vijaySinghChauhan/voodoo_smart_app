import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  FlatList,
  ImageBackground,
  Modal,
  Linking,
} from 'react-native';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import roomService from '../../services/rooms/roomService';
import esp8266Service from '../../services/esp8266/esp8266Service';
import productService, { Product } from '../../services/ecommerce/productService';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { COLORS, FONTS, SHADOWS, SIZES } from '../../theme/theme';
import logService from '../../services/logging/logService';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { notificationService } from '../../services/notifications/notificationService';
import WaterTank from '../esp8266/WaterTank';
import { io, Socket } from 'socket.io-client';
import authService from '../../services/auth/authService';
import * as constantsV from '../../constants/constatantsV';

const normalizeVersion = (v: string) => String(v || '').trim();
const compareVersions = (a: string, b: string) => {
  const pa = normalizeVersion(a).split('.').map(n => parseInt(n, 10) || 0);
  const pb = normalizeVersion(b).split('.').map(n => parseInt(n, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] || 0; const db = pb[i] || 0;
    if (da > db) return 1;
    if (da < db) return -1;
  }
  return 0;
};

const withTimeout = async <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
};

interface Room {
  id: string;
  name: string;
  deviceCount: number;
}

interface Device {
  id: string;
  name: string;
  type: string;
  status: 'on' | 'off';
  roomId: string | null;
}

const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDevices, setActiveDevices] = useState(0);
  const [totalDevices, setTotalDevices] = useState(0);
  const [forceUpdateUrl, setForceUpdateUrl] = useState<string | null>(null);
  const [motorOn, setMotorOn] = useState<boolean>(false);
  const [lockOn, setLockOn] = useState<boolean>(false);
  const [waterPercentage, setWaterPercentage] = useState<number | null>(null);
  const [waterFlow, setWaterFlow] = useState<number | null>(null);
  const [waterDeviceId, setWaterDeviceId] = useState<string | null>(null);
  const [showWater, setShowWater] = useState<boolean>(false);
  const [imageFailedRooms, setImageFailedRooms] = useState<Record<string, boolean>>({});
  const { user } = useAuth();
  const lockTimeoutRef = useRef<any>(null);
  const beepTimeoutRef = useRef<any>(null);
  const beepIntervalRef = useRef<any>(null);
  const appStateRef = useRef<string>(AppState.currentState as any);
  const MAX_FLOW_RATE = 60;
  const socketRef = useRef<Socket | null>(null);
  const lastFlowSubRef = useRef<string | null>(null);
  const motorOnRef = useRef<boolean>(false);

 
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const roomsData = await withTimeout(roomService.getRooms(), 6000, []);
      setRooms(roomsData);
      const devicesData = await withTimeout(esp8266Service.getAllDevices(), 6000, []);
      const normalizedDevices: Device[] = devicesData.map((d: any) => {
        const statusRaw = typeof d?.isOn !== 'undefined' ? (d.isOn ? 'on' : 'off') : String(d?.status || '').toLowerCase();
        const status: 'on' | 'off' = statusRaw === 'on' ? 'on' : 'off';
        return {
          id: String(d?.id || ''),
          name: String(d?.name || 'Device'),
          type: String(d?.type || d?.deviceType || 'Device'),
          status,
          roomId: d?.room ? String(d.room) : null,
        };
      });
      setDevices(normalizedDevices);
      try {
        const candidate = devicesData.find((d: any) => {
          const t = String((d as any)?.type || (d as any)?.deviceType || '').toLowerCase();
          const n = String((d as any)?.name || '').toLowerCase();
          return t.includes('motor') || n.includes('motor');
        }) || devicesData[0];
        if (candidate) {
          let onGuess = false;
          if (typeof (candidate as any).device1 !== 'undefined') {
            const raw = (candidate as any).device1;
            onGuess = typeof raw === 'number' ? raw === 1
              : typeof raw === 'string' ? (raw.trim().toLowerCase() === '1' || raw.trim().toLowerCase() === 'true')
              : !!raw;
          } else if (typeof (candidate as any).isOn !== 'undefined') {
            onGuess = !!(candidate as any).isOn;
          } else {
            onGuess = String((candidate as any).status || '').toLowerCase() === 'on';
          }
          setMotorOn(onGuess);
        } else {
          setMotorOn(false);
        }
      } catch {}
      try {
        const lockTarget = devicesData.find((d: any) => {
          const t = String((d as any)?.type || (d as any)?.deviceType || '').toLowerCase();
          const n = String((d as any)?.name || '').toLowerCase();
          const hasDevice2 = typeof (d as any).device2 !== 'undefined';
          return t.includes('door') || t.includes('lock') || n.includes('door') || n.includes('lock') || hasDevice2;
        }) || devicesData[0];
        if (lockTarget && typeof (lockTarget as any).device2 !== 'undefined') {
          const raw = (lockTarget as any).device2;
          const on = typeof raw === 'number' ? raw === 1
            : typeof raw === 'string' ? (raw.trim().toLowerCase() === '1' || raw.trim().toLowerCase() === 'true')
            : !!raw;
          setLockOn(on);
        } else {
          setLockOn(false);
        }
      } catch {}
      const productsData = await withTimeout(productService.getProducts(), 6000, []);
      setProducts(productsData.slice(0, 5));
      const active = normalizedDevices.filter(device => device.status === 'on').length;
      setActiveDevices(active);
      setTotalDevices(normalizedDevices.length);
      try {
        const waterCandidate = devicesData.find((d: any) => {
          const t = String((d as any)?.type || (d as any)?.deviceType || '').toLowerCase();
          const n = String((d as any)?.name || '').toLowerCase();
          return t.includes('water') || t.includes('tank') || t.includes('sensor') || t.includes('flow') || n.includes('water') || n.includes('tank') || n.includes('flow');
        }) || devicesData.find((d: any) => {
          const t = String((d as any)?.type || (d as any)?.deviceType || '').toLowerCase();
          const n = String((d as any)?.name || '').toLowerCase();
          return t.includes('motor') || n.includes('motor');
        }) || devicesData[0];
        const devId = String((waterCandidate as any)?.id || '');
        if (devId) {
          setWaterDeviceId(devId);
          const state = await withTimeout(esp8266Service.getDeviceStateFromServer(devId), 6000, null);
          if (state) {
            let frRaw: any = state?.flowRate ?? state?.flow_rate ?? state?.FlowRate;
            if (frRaw === undefined && state?.data) {
              frRaw = state.data.flowRate ?? state.data.flow_rate ?? state.data.FlowRate;
            }
            const fr = typeof frRaw === 'number' ? frRaw : (typeof frRaw === 'string' ? parseFloat(frRaw) : undefined);
            if (typeof fr === 'number' && isFinite(fr)) {
              const clamped = Math.max(0, Math.min(MAX_FLOW_RATE, fr));
              setWaterFlow(motorOn ? clamped : 0);
            } else {
              setWaterFlow(null);
            }
            let pctRaw: any = state?.waterPercentage ?? state?.water_percent ?? state?.waterLevelPercent;
            if (pctRaw === undefined && state?.data) {
              pctRaw = state.data.waterPercentage ?? state.data.water_percent ?? state.data.waterLevelPercent;
            }
            let brRaw: any = state?.brightness ?? state?.value ?? state?.waterLevel;
            if (brRaw === undefined && state?.data) {
              brRaw = state.data.brightness ?? state.data.value ?? state.data.waterLevel;
            }
            const br = typeof brRaw === 'number' ? brRaw : (typeof brRaw === 'string' ? parseFloat(brRaw) : undefined);
            let tRaw: any = state?.target ?? state?.targetDistance ?? state?.distanceTarget ?? state?.waterTarget;
            if (tRaw === undefined && state?.data) {
              tRaw = state.data.target ?? state.data.targetDistance ?? state.data.distanceTarget ?? state.data.waterTarget;
            }
            const t = typeof tRaw === 'number' && isFinite(tRaw) && tRaw > 0 ? tRaw : 100;
            const brightnessToPercent = (raw: number, target: number) => {
              const SENSOR_OFFSET = 15;
              const corrected = Math.max(0, raw - SENSOR_OFFSET);
              const base = Number.isFinite(target) && target > 0 ? target : 100;
              const empty = (corrected / base) * 100;
              const filled = 100 - empty;
              return Math.max(0, Math.min(100, Math.round(filled)));
            };
            if (typeof pctRaw === 'number' && isFinite(pctRaw)) {
              setWaterPercentage(Math.max(0, Math.min(100, Math.round(pctRaw))));
            } else if (typeof br === 'number' && isFinite(br)) {
              setWaterPercentage(brightnessToPercent(br, t));
            } else {
              setWaterPercentage(null);
            }
          } else {
            setWaterFlow(null);
            setWaterPercentage(null);
          }
        } else {
          setWaterFlow(null);
          setWaterPercentage(null);
        }
      } catch {}
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load dashboard data',
        position: 'bottom'
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    const unsubscribe = navigation?.addListener ? navigation.addListener('focus', () => {
      loadDashboardData();
    }) : null;

    return unsubscribe || (() => {});
  }, [navigation, loadDashboardData]);

  useEffect(() => {
    const checkAppUpdate = async () => {
      try {
        if (Platform.OS === 'web') return;
        const platform = Platform.OS;
        const packageName = 'com.voodoohomes2';
        const bundleId = 'org.reactjs.native.example.voodoohomeS2';
        const currentVersion = Platform.OS === 'android' ? '1.1.1' : '1.0.0';
        const params: any = { platform, currentVersion };
        if (platform === 'android') params.packageName = packageName; else params.bundleId = bundleId;
        if (platform === 'ios') {
          const lookup = `https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(bundleId)}&country=IN`;
          const resp = await axios.get(lookup, { timeout: 12000 });
          const result = resp.data && resp.data.results && resp.data.results[0];
          const latestVersion = result?.version;
          const storeUrl = result?.trackViewUrl;
          const newer = latestVersion && compareVersions(latestVersion, currentVersion) > 0;
          if (newer && storeUrl) setForceUpdateUrl(storeUrl);
        } else if (platform === 'android') {
          const url = `https://play.google.com/store/apps/details?id=${encodeURIComponent(packageName)}&hl=en&gl=US`;
          const { data: html } = await axios.get(url, { timeout: 12000, headers: { 'User-Agent': 'Mozilla/5.0' } });
          const candidates: string[] = [];
          const re1 = /"currentVersion"\s*:\s*"([^"]+)"/i;
          const re2 = /softwareVersion"[^>]*>([^<]+)</i;
          const re3 = /<div[^>]*>Current Version<\/div>\s*<span[^>]*><div[^>]*><span[^>]*>([^<]+)</i;
          const m1 = html.match(re1); if (m1) candidates.push(m1[1]);
          const m2 = html.match(re2); if (m2) candidates.push(m2[1]);
          const m3 = html.match(re3); if (m3) candidates.push(m3[1]);
          const latestVersion = normalizeVersion(candidates.find(Boolean) || '');
          const storeUrl = `https://play.google.com/store/apps/details?id=${packageName}`;
          const newer = latestVersion && compareVersions(latestVersion, currentVersion) > 0;
          if (newer) setForceUpdateUrl(storeUrl);
        }
      } catch (e) {
        // ignore failures
      }
    };
    checkAppUpdate();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem('dashboard:showWater');
        setShowWater(v === '1');
      } catch {}
    })();
  }, []);
  useEffect(() => {
    if (!motorOn) {
      setWaterFlow(0);
    }
  }, [motorOn]);
  useEffect(() => {
    motorOnRef.current = motorOn;
  }, [motorOn]);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem('dashboard:showWater', showWater ? '1' : '0');
      } catch {}
    })();
  }, [showWater]);

  useEffect(() => {
    return () => {
      if (lockTimeoutRef.current) {
        clearTimeout(lockTimeoutRef.current);
        lockTimeoutRef.current = null;
      }
      if (beepTimeoutRef.current) {
        clearTimeout(beepTimeoutRef.current);
        beepTimeoutRef.current = null;
      }
      if (beepIntervalRef.current) {
        clearInterval(beepIntervalRef.current);
        beepIntervalRef.current = null;
      }
      cancelMotorBeepNotifications();
    };
  }, []);

  const beepOnce = async () => {
    try {
      if (Platform.OS === 'web') {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const dur = 200;
        const gap = 300;
        const pulse = () => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.0001, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.03);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          setTimeout(() => {
            try {
              gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.2);
              osc.stop();
            } catch {}
          }, dur);
        };
        pulse();
        setTimeout(() => {
          pulse();
          setTimeout(() => { try { ctx.close(); } catch {} }, dur + 20);
        }, dur + gap);
      } else {
        const InCallManager = (() => {
          try {
            const mod = require('react-native-incall-manager');
            return (mod && (mod.default || mod)) || {};
          } catch {
            return {};
          }
        })();
        try {
          if (typeof InCallManager.startRingtone === 'function') {
            const dur = 200;
            const gap = 300;
            InCallManager.startRingtone('default');
            setTimeout(() => {
              try { InCallManager.stopRingtone && InCallManager.stopRingtone(); } catch {}
            }, dur);
            setTimeout(() => {
              try {
                InCallManager.startRingtone && InCallManager.startRingtone('default');
                setTimeout(() => {
                  try { InCallManager.stopRingtone && InCallManager.stopRingtone(); } catch {}
                }, dur);
              } catch {}
            }, dur + gap);
          }
        } catch {}
      }
    } catch {}
  };

  useEffect(() => {
    if (beepTimeoutRef.current) {
      clearTimeout(beepTimeoutRef.current);
      beepTimeoutRef.current = null;
    }
    if (beepIntervalRef.current) {
      clearInterval(beepIntervalRef.current);
      beepIntervalRef.current = null;
    }
    if (motorOn) {
      beepOnce();
      beepIntervalRef.current = setInterval(() => {
        beepOnce();
      }, 180000);
      if (Platform.OS !== 'web') {
        if (appStateRef.current !== 'active') {
          scheduleMotorBeepNotifications();
        } else {
          cancelMotorBeepNotifications();
        }
      }
    } else {
      try {
        if (Platform.OS !== 'web') {
          const mod = require('react-native-incall-manager');
          const InCallManager = (mod && (mod.default || mod)) || {};
          InCallManager.stopRingtone && InCallManager.stopRingtone();
        }
      } catch {}
      cancelMotorBeepNotifications();
    }
  }, [motorOn]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      appStateRef.current = state as any;
      if (motorOn) {
        if (state !== 'active') {
          scheduleMotorBeepNotifications();
        } else {
          cancelMotorBeepNotifications();
        }
      } else {
        cancelMotorBeepNotifications();
      }
    });
    return () => {
      try { sub.remove(); } catch {}
    };
  }, [motorOn]);

  const scheduleMotorBeepNotifications = async () => {
    try {
      await notificationService.initLocalNotifications();
      await notificationService.scheduleRepeatingBeep('motor-beep-1', 180000, 0);
      await notificationService.scheduleRepeatingBeep('motor-beep-2', 180000, 300);
    } catch {}
  };

  const cancelMotorBeepNotifications = async () => {
    try {
      await notificationService.cancelRepeatingBeep('motor-beep-1');
      await notificationService.cancelRepeatingBeep('motor-beep-2');
    } catch {}
  };

  const handleFlowUpdate = useCallback((payload: any) => {
    try {
      let frRaw: any = payload?.flowRate ?? payload?.flow_rate ?? payload?.FlowRate;
      if (frRaw === undefined && payload?.data) {
        frRaw = payload.data.flowRate ?? payload.data.flow_rate ?? payload.data.FlowRate;
      }
      const fr = typeof frRaw === 'number' ? frRaw : (typeof frRaw === 'string' ? parseFloat(frRaw) : undefined);
      if (typeof fr === 'number' && isFinite(fr)) {
        const clamped = Math.max(0, Math.min(MAX_FLOW_RATE, fr));
        setWaterFlow(motorOnRef.current ? clamped : 0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const token = (await authService.getToken()) || (await AsyncStorage.getItem('auth_token')) || '';
        if (!token) return;
        const isDev = (typeof __DEV__ !== 'undefined' ? __DEV__ : false);
        const transportList = Platform.OS === 'android' ? ['polling', 'websocket'] : (isDev ? ['polling', 'websocket'] : ['websocket', 'polling']);
        const socket = io(constantsV.CHAT_BASE_URL, {
          transports: transportList,
          path: '/voodoo/socket.io',
          timeout: 10000,
          auth: { token },
          extraHeaders: { Authorization: `Bearer ${token}` },
        });
        socketRef.current = socket;
        socket.on('flow:update', handleFlowUpdate);
        socket.on('connect', () => {
          if (waterDeviceId) {
            socket.emit('flow:subscribe', { deviceId: waterDeviceId });
            lastFlowSubRef.current = waterDeviceId;
          }
        });
        socket.on('reconnect', () => {
          if (waterDeviceId) {
            socket.emit('flow:subscribe', { deviceId: waterDeviceId });
            lastFlowSubRef.current = waterDeviceId;
          }
        });
      } catch {}
    })();
    return () => {
      try {
        const s = socketRef.current;
        if (s) {
          if (lastFlowSubRef.current) {
            s.emit('flow:unsubscribe', { deviceId: lastFlowSubRef.current });
          }
          s.disconnect();
          socketRef.current = null;
        }
      } catch {}
    };
  }, []);

  useEffect(() => {
    const s = socketRef.current;
    if (!s) return;
    if (lastFlowSubRef.current && lastFlowSubRef.current !== waterDeviceId) {
      s.emit('flow:unsubscribe', { deviceId: lastFlowSubRef.current });
    }
    if (waterDeviceId) {
      s.emit('flow:subscribe', { deviceId: waterDeviceId });
      lastFlowSubRef.current = waterDeviceId;
    }
    return () => {
      try {
        if (s && waterDeviceId) {
          s.emit('flow:unsubscribe', { deviceId: waterDeviceId });
        }
      } catch {}
    };
  }, [waterDeviceId]);

  useEffect(() => {
    let timer: any = null;
    if (waterDeviceId) {
      const poll = async () => {
        try {
          const state = await withTimeout(esp8266Service.getDeviceStateFromServer(waterDeviceId), 6000, null);
          if (!state) return;
          let frRaw: any = state?.flowRate ?? state?.flow_rate ?? state?.FlowRate;
          if (frRaw === undefined && state?.data) {
            frRaw = state.data.flowRate ?? state.data.flow_rate ?? state.data.FlowRate;
          }
          const fr = typeof frRaw === 'number' ? frRaw : (typeof frRaw === 'string' ? parseFloat(frRaw) : undefined);
          if (typeof fr === 'number' && isFinite(fr)) {
            const clamped = Math.max(0, Math.min(MAX_FLOW_RATE, fr));
            setWaterFlow(motorOn ? clamped : 0);
          }
          let pctRaw: any = state?.waterPercentage ?? state?.water_percent ?? state?.waterLevelPercent;
          if (pctRaw === undefined && state?.data) {
            pctRaw = state.data.waterPercentage ?? state.data.water_percent ?? state.data.waterLevelPercent;
          }
          let brRaw: any = state?.brightness ?? state?.value ?? state?.waterLevel;
          if (brRaw === undefined && state?.data) {
            brRaw = state.data.brightness ?? state.data.value ?? state.data.waterLevel;
          }
          const br = typeof brRaw === 'number' ? brRaw : (typeof brRaw === 'string' ? parseFloat(brRaw) : undefined);
          let tRaw: any = state?.target ?? state?.targetDistance ?? state?.distanceTarget ?? state?.waterTarget;
          if (tRaw === undefined && state?.data) {
            tRaw = state.data.target ?? state.data.targetDistance ?? state.data.distanceTarget ?? state.data.waterTarget;
          }
          const t = typeof tRaw === 'number' && isFinite(tRaw) && tRaw > 0 ? tRaw : 100;
          const brightnessToPercent = (raw: number, target: number) => {
            const SENSOR_OFFSET = 15;
            const corrected = Math.max(0, raw - SENSOR_OFFSET);
            const base = Number.isFinite(target) && target > 0 ? target : 100;
            const empty = (corrected / base) * 100;
            const filled = 100 - empty;
            return Math.max(0, Math.min(100, Math.round(filled)));
          };
          if (typeof pctRaw === 'number' && isFinite(pctRaw)) {
            setWaterPercentage(Math.max(0, Math.min(100, Math.round(pctRaw))));
          } else if (typeof br === 'number' && isFinite(br)) {
            setWaterPercentage(brightnessToPercent(br, t));
          }
        } catch {}
      };
      poll();
      timer = setInterval(poll, 5000);
    }
    return () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, [waterDeviceId]);

 

  const navigateToRoom = async (roomId: string) => {
    try { await logService.logButtonClick('Navigate Room Detail', { roomId }); } catch (e) {}
    navigation.navigate('Rooms', {
      screen: 'RoomDetail',
      params: { roomId }
    });
  };

  const navigateToDevice = async (deviceId: string) => {
    try { await logService.logButtonClick('Navigate Device Control', { deviceId }); } catch (e) {}
    navigation.navigate('Devices', {
      screen: 'DeviceControl',
      params: { deviceId }
    });
  };

  const getRoomImage = (name: string) => {
    const n = String(name || '').toLowerCase();
    if (n.includes('living')) return 'https://images.unsplash.com/photo-1501045661006-fcebe0257c3f?fm=jpg&fit=crop&w=1200&q=60';
    if (n.includes('kitchen')) return 'https://images.unsplash.com/photo-1556912172-085d6163b5a6?fm=jpg&fit=crop&w=1200&q=60';
    if (n.includes('bed')) return 'https://images.unsplash.com/photo-1505691723518-36a7f0a2661a?fm=jpg&fit=crop&w=1200&q=60';
    if (n.includes('bath')) return 'https://images.unsplash.com/photo-1617093727347-fd68450f33b3?fm=jpg&fit=crop&w=1200&q=60';
    if (n.includes('study') || n.includes('office')) return 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?fm=jpg&fit=crop&w=1200&q=60';
    if (n.includes('balcony')) return 'https://images.unsplash.com/photo-1540575467063-178a50b15eef?fm=jpg&fit=crop&w=1200&q=60';
    if (n.includes('store') || n.includes('storage')) return 'https://images.unsplash.com/photo-1585386959984-a41552231679?fm=jpg&fit=crop&w=1200&q=60';
    if (n.includes('terrace') || n.includes('roof')) return 'https://images.unsplash.com/photo-1554991651-4538d9e96be9?fm=jpg&fit=crop&w=1200&q=60';
    return 'https://images.unsplash.com/photo-1493809842364-78817add7ff5?fm=jpg&fit=crop&w=1200&q=60';
  };
  const getRoomEmoji = (name: string) => {
    const n = String(name || '').toLowerCase();
    if (n.includes('living')) return '🛋️';
    if (n.includes('bed')) return '🛏️';
    if (n.includes('kitchen')) return '🍳';
    if (n.includes('bath')) return '🛁';
    if (n.includes('balcony')) return '🌤️';
    if (n.includes('store') || n.includes('storage')) return '📦';
    if (n.includes('study') || n.includes('office')) return '📚';
    if (n.includes('terrace') || n.includes('roof')) return '🏡';
    return '🏠';
  };
  const getRoomFallbackImage = (name: string) => {
    const n = String(name || '').toLowerCase();
    if (n.includes('living')) return 'https://images.unsplash.com/photo-1501045661006-fcebe0257c3f?fm=jpg&fit=crop&w=1200&q=60';
    if (n.includes('kitchen')) return 'https://images.unsplash.com/photo-1556912172-085d6163b5a6?fm=jpg&fit=crop&w=1200&q=60';
    if (n.includes('bed')) return 'https://images.unsplash.com/photo-1505691723518-36a7f0a2661a?fm=jpg&fit=crop&w=1200&q=60';
    if (n.includes('bath')) return 'https://images.unsplash.com/photo-1617093727347-fd68450f33b3?fm=jpg&fit=crop&w=1200&q=60';
    if (n.includes('study') || n.includes('office')) return 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?fm=jpg&fit=crop&w=1200&q=60';
    if (n.includes('balcony')) return 'https://images.unsplash.com/photo-1540575467063-178a50b15eef?fm=jpg&fit=crop&w=1200&q=60';
    if (n.includes('store') || n.includes('storage')) return 'https://images.unsplash.com/photo-1585386959984-a41552231679?fm=jpg&fit=crop&w=1200&q=60';
    if (n.includes('terrace') || n.includes('roof')) return 'https://images.unsplash.com/photo-1554991651-4538d9e96be9?fm=jpg&fit=crop&w=1200&q=60';
    return 'https://images.unsplash.com/photo-1493809842364-78817add7ff5?fm=jpg&fit=crop&w=1200&q=60';
  };

  const renderRoomItem = ({ item }: { item: Room }) => (
    <TouchableOpacity onPress={() => navigateToRoom(item.id)} style={styles.roomCardImageWrap}>
      <ImageBackground
        source={imageFailedRooms[item.id] ? { uri: getRoomFallbackImage(item.name) } : { uri: getRoomImage(item.name) }}
        style={styles.roomCardImage}
        imageStyle={styles.roomCardImageInner}
        onError={() => setImageFailedRooms((prev) => ({ ...prev, [item.id]: true }))}
      >
        <View style={styles.roomCardOverlay}>
          <Text style={styles.roomName}>{item.name}</Text>
          <Text style={styles.deviceCount}>{item.deviceCount} devices</Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

 

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        </SafeAreaView>
    );
  }

  return (
  <View style={{ flex: 1, minHeight: SIZES.height, backgroundColor: COLORS.background }}>
      <Modal visible={!!forceUpdateUrl} animationType="fade" transparent={false}>
        <View style={{ flex: 1, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Card style={{ width: '90%' }} elevation="large">
            <Text style={{ ...FONTS.h2, color: COLORS.textDark, marginBottom: 8 }}>Update Required</Text>
            <Text style={{ ...FONTS.body2, color: COLORS.textLight, marginBottom: 16 }}>A newer version of the app is available. Please update to continue.</Text>
            <Button
              label="Update Now"
              onPress={() => {
                if (forceUpdateUrl) Linking.openURL(forceUpdateUrl);
              }}
            />
          </Card>
        </View>
      </Modal>
      <ScrollView contentContainerStyle={styles.scrollContent}>
     

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <Card style={{ ...styles.statCard, ...styles.statCardRooms }} elevation="large">
            <Text style={[styles.statValue, styles.statValueRooms]}>{rooms.length}</Text>
            <Text style={[styles.statLabel, styles.statLabelRooms]}>Rooms</Text>
          </Card>
          <Card style={{ ...styles.statCard, ...styles.statCardDevices }} elevation="large">
            <Text style={[styles.statValue, styles.statValueDevices]}>{totalDevices}</Text>
            <Text style={[styles.statLabel, styles.statLabelDevices]}>Devices</Text>
          </Card>
          <Card style={{ ...styles.statCard, ...styles.statCardActive }} elevation="large">
            <Text style={[styles.statValue, styles.statValueActive]}>{activeDevices}</Text>
            <Text style={[styles.statLabel, styles.statLabelActive]}>Active</Text>
          </Card>
        </View>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Water</Text>
            <TouchableOpacity onPress={() => setShowWater((v) => !v)}>
              <Text style={styles.seeAllText}>{showWater ? 'Hide Tank' : 'Show Tank'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.waterMetrics}>
            {showWater ? (
              <WaterTank percentage={typeof waterPercentage === 'number' ? waterPercentage : 0} />
            ) : null}
            <View style={styles.row}>
              <Text style={styles.metricLabel}>
                Water: {typeof waterPercentage === 'number' ? `${waterPercentage}%` : '—'}
              </Text>
              <Text style={styles.metricLabel}>
                Flow: {typeof waterFlow === 'number' ? `${Number(waterFlow).toFixed(1)} L/min` : '—'}
              </Text>
            </View>
          </View>
        </View>
   {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickRow}>
            {[
              { label: 'Rooms', emoji: '🛋️', onPress: async () => { try { await logService.logButtonClick('Quick Rooms'); } catch (e) {} ; navigation.navigate('Rooms'); } },
              { label: 'Motor On/Off', emoji: '🔘', visible: (devices.length > 0) || ((user?.subdeviceIds?.length || 0) > 0) || (user?.role === 'admin'), onPress: async () => { 
                  try { await logService.logButtonClick('Quick Motor Toggle'); } catch (e) {}
                  try {
                    const list = await esp8266Service.getDevicesFromServer();
                    if (!Array.isArray(list) || list.length === 0) {
                      Toast.show({ type: 'error', text1: 'No devices found', position: 'bottom' });
                      return;
                    }
                    const target = list.find((d: any) => {
                      const typeStr = String(d.deviceType || d.type || '').toLowerCase();
                      const nameStr = String(d.name || '').toLowerCase();
                      const hasDevice1 = typeof (d as any).device1 !== 'undefined';
                      return typeStr.includes('motor') || nameStr.includes('motor') || hasDevice1;
                    }) || list[0];
                    const devId = String((target as any).id || '');
                    if (!devId) {
                      Toast.show({ type: 'error', text1: 'Invalid device', position: 'bottom' });
                      return;
                    }
                    if (typeof (target as any).device1 !== 'undefined') {
                      const currentRaw = (target as any).device1;
                      const current = typeof currentRaw === 'number' ? currentRaw === 1
                        : typeof currentRaw === 'string' ? (currentRaw.trim().toLowerCase() === '1' || currentRaw.trim().toLowerCase() === 'true')
                        : !!currentRaw;
                      const nextVal = current ? 0 : 1;
                      const ok = await esp8266Service.updateDeviceOnServer(devId, { device1: nextVal });
                      if (ok) {
                        Toast.show({ type: 'success', text1: 'Motor', text2: nextVal === 1 ? 'ON' : 'OFF', position: 'bottom' });
                        setMotorOn(nextVal === 1);
                      } else {
                        Toast.show({ type: 'error', text1: 'Failed to toggle', text2: 'Could not update device1', position: 'bottom' });
                      }
                    } else {
                      const isOn = typeof (target as any).isOn !== 'undefined'
                        ? !!(target as any).isOn
                        : String((target as any).status || '').toLowerCase() === 'on';
                      const nextAction: 'on' | 'off' = isOn ? 'off' : 'on';
                      const ok = await esp8266Service.controlDeviceOnServer(devId, nextAction);
                      if (ok) {
                        Toast.show({ type: 'success', text1: 'Motor', text2: nextAction.toUpperCase(), position: 'bottom' });
                        setMotorOn(nextAction === 'on');
                      } else {
                        Toast.show({ type: 'error', text1: 'Failed to toggle', text2: 'Control endpoint error', position: 'bottom' });
                      }
                    }
                  } catch (err) {
                    Toast.show({ type: 'error', text1: 'Error', text2: 'Unable to toggle motor', position: 'bottom' });
                  }
                } },
              { label: 'Lock/Unlock', emoji: lockOn ? '🔒' : '🔓', visible: (devices.length > 0) || ((user?.subdeviceIds?.length || 0) > 0) || (user?.role === 'admin'), onPress: async () => {
                  try { await logService.logButtonClick('Quick Door Toggle'); } catch (e) {}
                  try {
                    const list = await esp8266Service.getDevicesFromServer();
                    if (!Array.isArray(list) || list.length === 0) {
                      Toast.show({ type: 'error', text1: 'No devices found', position: 'bottom' });
                      return;
                    }
                    const target = list.find((d: any) => {
                      const typeStr = String(d.deviceType || d.type || '').toLowerCase();
                      const nameStr = String(d.name || '').toLowerCase();
                      const hasDevice2 = typeof (d as any).device2 !== 'undefined';
                      return typeStr.includes('door') || typeStr.includes('lock') || nameStr.includes('door') || nameStr.includes('lock') || hasDevice2;
                    }) || list[0];
                    const devId = String((target as any).id || '');
                    if (!devId) {
                      Toast.show({ type: 'error', text1: 'Invalid device', position: 'bottom' });
                      return;
                    }
                    const currentRaw = (target as any).device2;
                    const current = typeof currentRaw === 'number' ? currentRaw === 1
                      : typeof currentRaw === 'string' ? (currentRaw.trim().toLowerCase() === '1' || currentRaw.trim().toLowerCase() === 'true')
                      : !!currentRaw;
                    const nextVal = current ? 0 : 1;
                    const ok = await esp8266Service.updateDeviceOnServer(devId, { device2: nextVal });
                    if (ok) {
                      Toast.show({ type: 'success', text1: 'Door', text2: nextVal === 1 ? 'Locked' : 'Unlocked', position: 'bottom' });
                      setLockOn(nextVal === 1);
                      if (lockTimeoutRef.current) {
                        clearTimeout(lockTimeoutRef.current);
                        lockTimeoutRef.current = null;
                      }
                      if (nextVal === 1) {
                        lockTimeoutRef.current = setTimeout(async () => {
                          try {
                            const ok2 = await esp8266Service.updateDeviceOnServer(devId, { device2: 0 });
                            if (ok2) {
                              Toast.show({ type: 'success', text1: 'Door', text2: 'Auto-off', position: 'bottom' });
                              setLockOn(false);
                            }
                          } catch {}
                        }, 3000);
                      }
                    } else {
                      Toast.show({ type: 'error', text1: 'Failed to toggle', text2: 'Could not update device2', position: 'bottom' });
                    }
                  } catch {
                    Toast.show({ type: 'error', text1: 'Error', text2: 'Unable to toggle door', position: 'bottom' });
                  }
                } },
              { label: 'Shop', emoji: '🛒', onPress: async () => { try { await logService.logButtonClick('Quick Shop'); } catch (e) {} ; navigation.navigate('Shop', { screen: 'ProductList' }); } },
              { label: 'Subscriptions', emoji: '�', onPress: async () => { try { await logService.logButtonClick('Quick Subscriptions'); } catch (e) {} ; navigation.navigate('Subscriptions'); } },
            ].filter((a: any) => (a.visible === undefined ? true : !!a.visible)).map((a) => (
              <TouchableOpacity key={a.label} style={styles.quickItem} activeOpacity={0.85} onPress={a.onPress}>
                <View style={[styles.quickIcon, a.label === 'Motor On/Off' ? (motorOn ? styles.quickIconOn : styles.quickIconOff) : undefined]}>
                  {a.label === 'Lock/Unlock' ? (
                    <Ionicons name={lockOn ? 'lock-closed-outline' : 'lock-open-outline'} size={22} color={COLORS.textDark} />
                  ) : (
                    <Text style={styles.quickEmoji}>{a.emoji}</Text>
                  )}
                </View>
                <Text style={styles.quickLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {/* Rooms Section (matches screenshot style) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Rooms</Text>
            <TouchableOpacity onPress={async () => { try { await logService.logButtonClick('See All Rooms'); } catch (e) {} ; navigation.navigate('Rooms'); }}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {rooms.length > 0 ? (
            <FlatList
              data={rooms.slice(0, 5)}
              renderItem={renderRoomItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.roomsList}
            />
          ) : (
            <Text style={styles.emptyText}>No rooms added yet</Text>
          )}
        </View>

        {/* Favorite Devices (2x2 grid with power toggle) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Favorite Devices</Text>
            <TouchableOpacity onPress={async () => { try { await logService.logButtonClick('See All Devices'); } catch (e) {} ; navigation.navigate('Devices'); }}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {devices.length > 0 ? (
            <View style={styles.devicesList}>
              {devices.slice(0, 4).map(device => (
                <View
                  key={device.id}
                  style={[
                    styles.deviceCard,
                    device.status === 'on' ? styles.deviceCardOn : styles.deviceCardOff,
                  ]}
                >
                  <View style={styles.deviceIconBubble}>
                    <Text style={styles.deviceIconText}>{device.type?.[0] || '🔌'}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigateToDevice(device.id)}
                    style={{ flex: 1 }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.deviceInfo}>
                      <Text style={[styles.deviceName, device.status === 'on' ? styles.deviceTextOn : styles.deviceTextOff]}>{device.name}</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      const next = device.status === 'on' ? 'off' : 'on';
                      const ok = await esp8266Service.controlDeviceOnServer(device.id, next as any);
                      if (ok) {
                        setDevices(prev => prev.map(d => d.id === device.id ? { ...d, status: next as any } : d));
                      } else {
                        Toast.show({ type: 'error', text1: 'Action failed', text2: 'Could not toggle device', position: 'bottom' });
                      }
                    }}
                    style={styles.powerButton}
                  >
                    <View style={[styles.powerDot, device.status === 'on' ? styles.powerDotOn : styles.powerDotOff]} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No devices added yet</Text>
          )}
        </View>

        {/* Products Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Products</Text>
            <TouchableOpacity onPress={async () => { try { await logService.logButtonClick('See All Products'); } catch (e) {} ; navigation.navigate('Shop'); }}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {products.length > 0 ? (
            <FlatList
              data={products}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.productCard}
                  onPress={async () => { try { await logService.logButtonClick('View Product', { productId: item.id, name: item.name }); } catch (e) {} ; navigation.navigate('Shop', {
                    screen: 'ProductDetail',
                    params: { productId: item.id }
                  }); }}
                >
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
                    <Text style={styles.productCategory}>{item.category}</Text>
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productsList}
            />
          ) : (
            <Text style={styles.emptyText}>No products available</Text>
          )}
        </View>

     
      </ScrollView>
      <View style={styles.footer}>
        <Text style={styles.footerText}>VooDoo Smart Home © 2026</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({container: {
  flex: 1,
  backgroundColor: COLORS.background,
},
loadingContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: COLORS.background,
},
scrollContent: {
  padding: SIZES.padding,
  paddingBottom: SIZES.padding * 3.5,
},
  header: {
    marginBottom: SIZES.margin,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  burger: { width: 32, height: 24, justifyContent: 'space-between', marginRight: 12 },
  burgerLine: { height: 3, backgroundColor: COLORS.white, borderRadius: 2 },
  title: {
    ...FONTS.h1,
    color: COLORS.white,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
statsContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: SIZES.base,
},
  statCard: {
    width: '30%',
    alignItems: 'center',
    padding: SIZES.padding / 2,
  },
  statCardRooms: { backgroundColor: COLORS.primaryLight },
  statCardDevices: { backgroundColor: COLORS.primaryLight },
  statCardActive: { backgroundColor: COLORS.primaryLight },
  statValue: {
    ...FONTS.h2,
    color: COLORS.textDark,
    marginBottom: SIZES.base / 2,
  },
  statValueRooms: { color: COLORS.primaryDark },
  statValueDevices: { color: COLORS.primaryDark },
  statValueActive: { color: COLORS.primaryDark },
  statLabel: {
    ...FONTS.body3,
    color: COLORS.textMedium,
  },
  statLabelRooms: { color: COLORS.primary },
  statLabelDevices: { color: COLORS.primary },
  statLabelActive: { color: COLORS.primary },
section: {
  marginBottom: SIZES.base,
},
sectionHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: SIZES.base / 3,
},
sectionTitle: {
  ...FONTS.h3,
  color: COLORS.textDark,
},
seeAllText: {
  ...FONTS.body3,
  color: COLORS.primary,
},
  roomsList: { paddingRight: SIZES.padding },
  roomCardImageWrap: {
    width: 180,
    marginRight: SIZES.margin / 2,
    marginVertical: SIZES.base / 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
  },
  roomCardImage: { width: '100%', height: 110, justifyContent: 'flex-end' },
  roomCardImageInner: { borderRadius: SIZES.radius },
  roomCardImageFallback: { backgroundColor: COLORS.card, borderRadius: SIZES.radius },
  fallbackCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fallbackEmoji: { fontSize: 24 },
  roomCardOverlay: { backgroundColor: 'rgba(255,255,255,0.9)', borderBottomLeftRadius: SIZES.radius, borderBottomRightRadius: SIZES.radius, padding: SIZES.base },
  roomName: {
    ...FONTS.h4,
    color: COLORS.textDark,
    marginBottom: SIZES.base,
  },
  deviceCount: {
    ...FONTS.body3,
    color: COLORS.textLight,
  },
devicesList: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
},
  deviceCard: {
    width: '48%',
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.base / 4,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.large,
  },
  deviceCardOn: { backgroundColor: COLORS.primaryLight },
  deviceCardOff: { backgroundColor: COLORS.white },
  deviceIconBubble: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryLight, marginRight: 12 },
  deviceIconText: { fontSize: 16 },
  deviceInfo: {
    flex: 1,
  },
  deviceName: { ...FONTS.body2, marginBottom: SIZES.base / 2 },
  deviceType: { ...FONTS.body3 },
  deviceTextOn: { color: COLORS.white ,fontSize: 12},
  deviceSubTextOn: { color: '#cfe3ff' },
  deviceTextOff: { color: COLORS.textDark },
  deviceSubTextOff: { color: COLORS.textLight },
  powerButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  powerDot: { width: 14, height: 14, borderRadius: 7 },
  powerDotOn: { backgroundColor: COLORS.info },
  statusIndicator: { width: 10, height: 10, borderRadius: 5 },
  powerDotOff: { backgroundColor: COLORS.gray },
  emptyText: {
    ...FONTS.body2,
    color: COLORS.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: SIZES.base,
  },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SIZES.base, flexWrap: 'nowrap' },
  quickItem: { alignItems: 'center', width: '19%' },
  quickIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', ...SHADOWS.small },
  quickIconOn: { backgroundColor: COLORS.warning },
  quickIconOff: { backgroundColor: COLORS.primaryLight },
  quickEmoji: { fontSize: 20 },
  quickLabel: { ...FONTS.small, color: COLORS.textLight, marginTop: 6 },
  productsList: {
    paddingRight: SIZES.padding / 2,
  },
  productCard: {
    width: 150,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    marginRight: SIZES.margin / 2,
    marginVertical: SIZES.small,
    ...SHADOWS.large,
  },
productImage: {
  width: '100%',
  height: 100,
  borderTopLeftRadius: SIZES.radius,
  borderTopRightRadius: SIZES.radius,
},
productInfo: {
  padding: SIZES.padding,
},
productName: {
  ...FONTS.body3,
  color: COLORS.textDark,
  marginBottom: SIZES.base / 2,
},
productPrice: {
  ...FONTS.h4,
  color: COLORS.primary,
  marginBottom: SIZES.base / 2,
},
  productCategory: {
    ...FONTS.small,
    color: COLORS.textLight,
  },
  footer: {
    padding: SIZES.padding,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    ...FONTS.body3,
    color: COLORS.textLight,
  },
  waterMetrics: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    ...SHADOWS.large,
  },
  metricRow: {
    marginTop: SIZES.base / 2,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  row: {
    flexDirection: 'row',
     justifyContent: 'space-between',
     width: '100%',
     columnGap: SIZES.base,
  },
  metricLabel: {
    ...FONTS.body2,
    color: "#48A14D",
    marginBottom: SIZES.base / 2,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'left',
  },
});

export default DashboardScreen;
