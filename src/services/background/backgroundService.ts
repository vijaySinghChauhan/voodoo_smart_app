import BackgroundFetch from 'react-native-background-fetch';
import esp8266Service from '../esp8266/esp8266Service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundTimer from 'react-native-background-timer';
import { io, Socket } from 'socket.io-client';
import * as appConstants from '../../constants/constatantsV';
import authService from '../auth/authService';

export async function initBackgroundDevicePolling() {
  try {
    await BackgroundFetch.configure(
      {
        minimumFetchInterval: 1,
        stopOnTerminate: false,
        startOnBoot: true,
        requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
        enableHeadless: true,
      },
      async (taskId: string) => {
        try {
          const list = await esp8266Service.getDevicesFromServer();
          await AsyncStorage.setItem('last_background_device_count', String(Array.isArray(list) ? list.length : 0));
          try {
            const unassigned = await esp8266Service.getUnassignedDevices();
            await AsyncStorage.setItem('last_background_unassigned_count', String(Array.isArray(unassigned) ? unassigned.length : 0));
          } catch {}
          try {
            await processPendingLockAutoOff();
          } catch {}
          try {
            await evaluateAutomationRulesHeadless();
          } catch {}
          try {
            await processPendingNoFlowAutoOff();
          } catch {}
          try {
            await runHeadlessSocketSession();
          } catch {}
        } catch {}
        BackgroundFetch.finish(taskId);
      },
      async (taskId: string) => {
        BackgroundFetch.finish(taskId);
      }
    );
    await BackgroundFetch.start();
  } catch {}
}

export const BackgroundDeviceHeadless = async (event: any) => {
  try {
    const list = await esp8266Service.getDevicesFromServer();
    await AsyncStorage.setItem('last_background_device_count', String(Array.isArray(list) ? list.length : 0));
    try {
      const unassigned = await esp8266Service.getUnassignedDevices();
      await AsyncStorage.setItem('last_background_unassigned_count', String(Array.isArray(unassigned) ? unassigned.length : 0));
    } catch {}
    try {
      await processPendingLockAutoOff();
    } catch {}
    try {
      await evaluateAutomationRulesHeadless();
    } catch {}
    try {
      await processPendingNoFlowAutoOff();
    } catch {}
    try {
      await runHeadlessSocketSession();
    } catch {}
  } catch {}
  BackgroundFetch.finish(event.taskId);
};

BackgroundFetch.registerHeadlessTask(BackgroundDeviceHeadless);

const PENDING_LOCK_KEY = 'pending_lock_auto_off';
const PENDING_NO_FLOW_KEY = 'pending_no_flow_auto_off';
const NO_FLOW_THRESHOLD = 6.5;
const BG_SOCKET_LAST_KEY = 'bg_socket_last';
const BG_SOCKET_SESSION_MS = 15000;
const BG_SOCKET_PATH = '/voodoo/socket.io';

export async function scheduleLockAutoOff(deviceId: string, delayMs: number = 3000): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_LOCK_KEY);
    const list: Array<{ deviceId: string; dueAt: number }> = raw ? JSON.parse(raw) : [];
    const dueAt = Date.now() + Math.max(1, delayMs);
    list.push({ deviceId, dueAt });
    await AsyncStorage.setItem(PENDING_LOCK_KEY, JSON.stringify(list));
  } catch {}
}

async function processPendingLockAutoOff(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_LOCK_KEY);
    const list: Array<{ deviceId: string; dueAt: number }> = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list) || list.length === 0) return;
    const now = Date.now();
    const keep: Array<{ deviceId: string; dueAt: number }> = [];
    for (const item of list) {
      if (now >= item.dueAt) {
        try {
          if (item.deviceId) {
            await esp8266Service.updateDeviceOnServer(String(item.deviceId), { device2: 0 });
          }
        } catch {}
      } else {
        keep.push(item);
      }
    }
    await AsyncStorage.setItem(PENDING_LOCK_KEY, JSON.stringify(keep));
  } catch {}
}

function brightnessToPercent(raw: number, target: number): number {
  const SENSOR_OFFSET = 15;
  const corrected = Math.max(0, raw - SENSOR_OFFSET);
  const base = Number.isFinite(target) && target > 0 ? target : 100;
  const empty = (corrected / base) * 100;
  const filled = 100 - empty;
  return Math.max(0, Math.min(100, Math.round(filled)));
}

async function scheduleNoFlowPending(deviceId: string, delayMs: number): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_NO_FLOW_KEY);
    const list: Array<{ deviceId: string; dueAt: number }> = raw ? JSON.parse(raw) : [];
    const dueAt = Date.now() + Math.max(1, delayMs);
    const filtered = list.filter((i) => String(i.deviceId) !== String(deviceId));
    filtered.push({ deviceId, dueAt });
    await AsyncStorage.setItem(PENDING_NO_FLOW_KEY, JSON.stringify(filtered));
    try {
      const earliest = filtered.reduce((acc: number | null, curr) => (acc === null || curr.dueAt < acc ? curr.dueAt : acc), null);
      if (earliest) {
        const delay = Math.max(0, earliest - Date.now());
        await BackgroundFetch.scheduleTask({
          taskId: 'no_flow_due',
          delay,
          periodic: false,
          stopOnTerminate: false,
          requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
          enableHeadless: true,
        } as any);
      }
    } catch {}
  } catch {}
}

async function clearNoFlowPending(deviceId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_NO_FLOW_KEY);
    const list: Array<{ deviceId: string; dueAt: number }> = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((i) => String(i.deviceId) !== String(deviceId));
    await AsyncStorage.setItem(PENDING_NO_FLOW_KEY, JSON.stringify(filtered));
  } catch {}
}

async function processPendingNoFlowAutoOff(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_NO_FLOW_KEY);
    const list: Array<{ deviceId: string; dueAt: number }> = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list) || list.length === 0) return;
    const now = Date.now();
    const keep: Array<{ deviceId: string; dueAt: number }> = [];
    for (const item of list) {
      if (now >= item.dueAt) {
        try {
          const state = await esp8266Service.getDeviceStateFromServer(String(item.deviceId));
          let isOn = false;
          try {
            const rawOn = state?.isOn ?? state?.device1;
            if (typeof rawOn === 'number') {
              isOn = rawOn === 1;
            } else if (typeof rawOn === 'boolean') {
              isOn = rawOn;
            } else if (typeof rawOn === 'string') {
              const s = rawOn.trim().toLowerCase();
              isOn = s === '1' || s === 'true' || s === 'on';
            }
          } catch {}
          let frRaw: any = state?.flowRate ?? state?.flow_rate ?? state?.FlowRate;
          if (frRaw === undefined && state?.data) {
            frRaw = state.data.flowRate ?? state.data.flow_rate ?? state.data.FlowRate;
          }
          const flow = typeof frRaw === 'number' ? frRaw : (typeof frRaw === 'string' ? parseFloat(frRaw) : undefined);
          const flowOk = typeof flow === 'number' && isFinite(flow) ? flow : undefined;
          if (isOn && typeof flowOk === 'number' && isFinite(flowOk) && flowOk < NO_FLOW_THRESHOLD) {
            try { await esp8266Service.controlDeviceOnServer(String(item.deviceId), 'off' as any); } catch {}
            try { await esp8266Service.updateDeviceOnServer(String(item.deviceId), { device1: 0 }); } catch {}
          }
        } catch {}
      } else {
        keep.push(item);
      }
    }
    await AsyncStorage.setItem(PENDING_NO_FLOW_KEY, JSON.stringify(keep));
  } catch {}
}

async function evaluateAutomationRulesHeadless(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ruleKeys = keys.filter((k) => k.startsWith('auto_rules_'));
    if (ruleKeys.length === 0) return;
    const entries = await AsyncStorage.multiGet(ruleKeys);
    for (const [key, value] of entries) {
      if (!value) continue;
      const deviceId = key.replace('auto_rules_', '');
      let rules: any = null;
      try { rules = JSON.parse(value); } catch {}
      if (!rules || !deviceId) continue;
      const offEnabled = !!rules?.off?.enabled;
      const offOperator = String(rules?.off?.operator || 'ge');
      const offThreshold = Number(rules?.off?.threshold || 80);
      const onEnabled = !!rules?.on?.enabled;
      const onOperator = String(rules?.on?.operator || 'lt');
      const onThreshold = Number(rules?.on?.threshold || 50);
      const supply = rules?.supplyWater || {};
      const supplyEnabled = !!supply?.enabled;
      const freq = String(supply?.frequency || 'everyday');
      const morningEnabled = !!supply?.morningEnabled;
      const eveningEnabled = !!supply?.eveningEnabled;
      const morningStart = supply?.morningStart ? new Date(supply.morningStart) : null;
      const morningEnd = supply?.morningEnd ? new Date(supply.morningEnd) : null;
      const eveningStart = supply?.eveningStart ? new Date(supply.eveningStart) : null;
      const eveningEnd = supply?.eveningEnd ? new Date(supply.eveningEnd) : null;

      let state: any = null;
      try {
        state = await esp8266Service.getDeviceStateFromServer(deviceId);
      } catch {}
      if (!state) continue;
      let isOn = false;
      try {
        const rawOn = state?.isOn ?? state?.device1;
        if (typeof rawOn === 'number') {
          isOn = rawOn === 1;
        } else if (typeof rawOn === 'boolean') {
          isOn = rawOn;
        } else if (typeof rawOn === 'string') {
          const s = rawOn.trim().toLowerCase();
          isOn = s === '1' || s === 'true' || s === 'on';
        }
      } catch {}
      let pctRaw: any = state?.waterPercentage ?? state?.water_percent ?? state?.waterLevelPercent;
      if (pctRaw === undefined && state?.data) {
        pctRaw = state.data.waterPercentage ?? state.data.water_percent ?? state.data.waterLevelPercent;
      }
      let brRaw: any = state?.brightness ?? state?.value ?? state?.waterLevel;
      if (brRaw === undefined && state?.data) {
        brRaw = state.data.brightness ?? state.data.value ?? state.data.waterLevel;
      }
      let frRaw: any = state?.flowRate ?? state?.flow_rate ?? state?.FlowRate;
      if (frRaw === undefined && state?.data) {
        frRaw = state.data.flowRate ?? state.data.flow_rate ?? state.data.FlowRate;
      }
      const flow = typeof frRaw === 'number' ? frRaw : (typeof frRaw === 'string' ? parseFloat(frRaw) : undefined);
      let tRaw: any = state?.target ?? state?.targetDistance ?? state?.distanceTarget ?? state?.waterTarget;
      if (tRaw === undefined && state?.data) {
        tRaw = state.data.target ?? state.data.targetDistance ?? state.data.distanceTarget ?? state.data.waterTarget;
      }
      const t = typeof tRaw === 'number' && isFinite(tRaw) && tRaw > 0 ? tRaw : 100;
      let level = 0;
      if (typeof pctRaw === 'number' && isFinite(pctRaw)) {
        level = Math.max(0, Math.min(100, Math.round(pctRaw)));
      } else if (typeof brRaw === 'number' && isFinite(brRaw)) {
        level = brightnessToPercent(brRaw, t);
      }

      if (onEnabled) {
        const onMet = onOperator === 'lt' ? level < onThreshold : level >= onThreshold;
        if (onMet) {
          try { await esp8266Service.controlDeviceOnServer(deviceId, 'on' as any); } catch {}
          try { await esp8266Service.updateDeviceOnServer(deviceId, { device1: 1 }); } catch {}
        }
      }
      if (offEnabled) {
        const offMet = offOperator === 'lt' ? level < offThreshold : level >= offThreshold;
        if (offMet) {
          try { await esp8266Service.controlDeviceOnServer(deviceId, 'off' as any); } catch {}
          try { await esp8266Service.updateDeviceOnServer(deviceId, { device1: 0 }); } catch {}
        }
      }

      if (supplyEnabled) {
        const now = new Date();
        const inMorning = isInWindow(now, morningEnabled, freq, morningStart, morningEnd);
        const inEvening = isInWindow(now, eveningEnabled, freq, eveningStart, eveningEnd);
        const active = inMorning || inEvening;
        if (active) {
          try { await esp8266Service.controlDeviceOnServer(deviceId, 'on' as any); } catch {}
          try { await esp8266Service.updateDeviceOnServer(deviceId, { device1: 1 }); } catch {}
        } else {
          const finishedMorning = isFinishedWindow(now, freq, morningStart, morningEnd);
          const finishedEvening = isFinishedWindow(now, freq, eveningStart, eveningEnd);
          if (finishedMorning || finishedEvening) {
            try { await esp8266Service.controlDeviceOnServer(deviceId, 'off' as any); } catch {}
            try { await esp8266Service.updateDeviceOnServer(deviceId, { device1: 0 }); } catch {}
          }
        }
      }
      // Headless no-flow auto OFF
      const noFlowEnabled = !!rules?.noFlow?.enabled;
      const noFlowDelaySec = Number(rules?.noFlow?.delaySec || 40);
      if (noFlowEnabled && isOn) {
        if (typeof flow === 'number' && isFinite(flow) && flow < NO_FLOW_THRESHOLD) {
          await scheduleNoFlowPending(deviceId, Math.max(1, noFlowDelaySec) * 1000);
        } else {
          await clearNoFlowPending(deviceId);
        }
      } else {
        await clearNoFlowPending(deviceId);
      }
    }
    try { await AsyncStorage.setItem('last_headless_eval', String(Date.now())); } catch {}
  } catch {}
}

function isInWindow(now: Date, enabled: boolean, frequency: string, start: Date | null, end: Date | null): boolean {
  if (!enabled || !start || !end) return false;
  if (frequency === 'once') {
    return now.getTime() >= start.getTime() && now.getTime() <= end.getTime();
  }
  const startM = start.getHours() * 60 + start.getMinutes();
  const endM = end.getHours() * 60 + end.getMinutes();
  const nowM = now.getHours() * 60 + now.getMinutes();
  return nowM >= startM && nowM <= endM;
}

function isFinishedWindow(now: Date, frequency: string, start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false;
  if (frequency === 'once') {
    return now.getTime() > end.getTime();
  }
  const endM = end.getHours() * 60 + end.getMinutes();
  const nowM = now.getHours() * 60 + now.getMinutes();
  return nowM > endM;
}

let automationIntervalRef: any = null;
export function startAutomationMonitorForeground(): void {
  try {
    if (automationIntervalRef) {
      BackgroundTimer.clearInterval(automationIntervalRef);
      automationIntervalRef = null;
    }
    automationIntervalRef = BackgroundTimer.setInterval(async () => {
      try { await evaluateAutomationRulesHeadless(); } catch {}
      try { await processPendingLockAutoOff(); } catch {}
      try { await processPendingNoFlowAutoOff(); } catch {}
      try { await runHeadlessSocketSession(); } catch {}
    }, 10000);
  } catch {}
}

async function runHeadlessSocketSession(): Promise<void> {
  try {
    const token = await authService.getToken();
    if (!token) return;
    const devices = await esp8266Service.getDevicesFromServer();
    const ids: string[] = (devices || []).map((d: any) => String(d?.id || d?._id || '')).filter(Boolean);
    if (ids.length === 0) return;
    const transports = ['polling'];
    let socket: Socket | null = null;
    const connectTo = async (url: string) => {
      return new Promise<Socket>((resolve, reject) => {
        try {
          const s = io(url, {
            transports,
            upgrade: false,
            path: BG_SOCKET_PATH,
            reconnection: false,
            timeout: 8000,
            forceNew: true,
            auth: { token },
            query: { token },
            extraHeaders: { Authorization: `Bearer ${token}` },
          } as any);
          let handled = false;
          s.on('connect', () => {
            if (!handled) {
              handled = true;
              resolve(s);
            }
          });
          s.on('connect_error', (err: any) => {
            if (!handled) {
              handled = true;
              try { s.disconnect(); } catch {}
              reject(err);
            }
          });
        } catch (e) {
          reject(e);
        }
      });
    };
    try {
      socket = await connectTo(appConstants.CHAT_BASE_URL);
    } catch {
      try {
        socket = await connectTo(appConstants.CHAT_FALLBACK_URL);
      } catch {
        socket = null;
      }
    }
    if (!socket) return;
    socket.on('brightness:update', async (payload: any) => {
      try {
        const did = String(payload?.deviceId || payload?.id || '');
        const value = typeof payload?.brightness === 'number' ? payload?.brightness : undefined;
        if (did && typeof value === 'number' && isFinite(value)) {
          await AsyncStorage.setItem(`bg_brightness_${did}`, JSON.stringify({ brightness: value, at: Date.now() }));
        }
      } catch {}
    });
    socket.on('flow:update', async (payload: any) => {
      try {
        const did = String(payload?.deviceId || payload?.id || '');
        const fr = payload?.flowRate ?? payload?.flow_rate ?? payload?.FlowRate;
        const value = typeof fr === 'number' ? fr : (typeof fr === 'string' ? parseFloat(fr) : undefined);
        if (did && typeof value === 'number' && isFinite(value)) {
          await AsyncStorage.setItem(`bg_flow_${did}`, JSON.stringify({ flow: value, at: Date.now() }));
        }
      } catch {}
    });
    try {
      for (const id of ids) {
        try { socket.emit('flow:subscribe', { deviceId: id }); } catch {}
        try { socket.emit('brightness:subscribe', { deviceId: id }); } catch {}
      }
    } catch {}
    await new Promise<void>((resolve) => {
      const t = BackgroundTimer.setTimeout(async () => {
        try { await AsyncStorage.setItem(BG_SOCKET_LAST_KEY, String(Date.now())); } catch {}
        try { socket && socket.disconnect(); } catch {}
        resolve();
      }, BG_SOCKET_SESSION_MS);
      const killer = BackgroundTimer.setTimeout(() => {
        resolve();
      }, BG_SOCKET_SESSION_MS + 4000);
      const cleanup = () => {
        try { BackgroundTimer.clearTimeout(t); } catch {}
        try { BackgroundTimer.clearTimeout(killer); } catch {}
      };
      socket?.on('disconnect', () => cleanup());
    });
  } catch {}
}
