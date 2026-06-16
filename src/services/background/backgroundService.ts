import BackgroundFetch from 'react-native-background-fetch';
import { Platform } from 'react-native';
import esp8266Service from '../esp8266/esp8266Service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundTimer from 'react-native-background-timer';
import { io, Socket } from 'socket.io-client';
import * as appConstants from '../../constants/constatantsV';
import authService from '../auth/authService';

let backgroundFetchConfigured = false;

export async function initBackgroundDevicePolling() {
  try {
    if (backgroundFetchConfigured) return;
    await BackgroundFetch.configure(
      {
        minimumFetchInterval: Platform.OS === 'ios' ? 15 : 1,
        stopOnTerminate: false,
        startOnBoot: true,
        requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
        enableHeadless: true,
      },
      async (taskId: string) => {
        try {
          try {
            await processPendingDeviceCommands();
          } catch {}
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
    backgroundFetchConfigured = true;
  } catch {}
}

export const BackgroundDeviceHeadless = async (event: any) => {
  try {
    try {
      await processPendingDeviceCommands();
    } catch {}
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
const PENDING_DEVICE_COMMANDS_KEY = 'pending_device_commands_v1';
const DEVICE_COMMAND_TASK_ID = 'com.voodoosmart.pending_device_commands_due_v1';
const DEVICE_COMMAND_SCHEDULE_AT_KEY = 'pending_device_commands_due_at_v1';
const AUTOMATION_TASK_ID = 'com.voodoosmart.automation_due_v1';
const AUTOMATION_SCHEDULE_AT_KEY = 'automation_due_at_v1';
const NO_FLOW_TASK_ID = 'com.voodoosmart.no_flow_due_v1';
const LOCK_AUTO_OFF_TASK_ID = 'com.voodoosmart.lock_auto_off_due_v1';
const NO_FLOW_THRESHOLD = 6.5;
const BG_SOCKET_LAST_KEY = 'bg_socket_last';
const BG_SOCKET_SESSION_MS = 15000;
const BG_SOCKET_PATH = '/voodoo/socket.io';
const MAX_FLOW_RATE = 60;

function normalizeFlowRate(raw: number): number | undefined {
  if (typeof raw !== 'number' || !isFinite(raw)) return undefined;
  let v = raw;
  if (v < 0) v = 0;
  if (v > MAX_FLOW_RATE * 5) v = v / 1000;
  if (!isFinite(v)) return undefined;
  return Math.max(0, Math.min(MAX_FLOW_RATE, v));
}

type PendingDeviceCommand = {
  key: string;
  kind: 'control' | 'update';
  deviceId: string;
  action?: 'on' | 'off' | 'toggle';
  brightness?: number;
  payload?: Record<string, any>;
  dueAt: number;
  attempts: number;
  createdAt: number;
  updatedAt: number;
};

function buildControlKey(deviceId: string, action: 'on' | 'off' | 'toggle', brightness?: number): string {
  const b = typeof brightness === 'number' && isFinite(brightness) ? String(brightness) : '';
  return `control:${String(deviceId)}:${String(action)}:${b}`;
}

function buildUpdateKey(deviceId: string, payload: Record<string, any>): string {
  let raw = '';
  try {
    raw = JSON.stringify(payload || {});
  } catch {
    raw = String(payload);
  }
  return `update:${String(deviceId)}:${raw}`;
}

async function upsertPendingCommand(next: PendingDeviceCommand): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_DEVICE_COMMANDS_KEY);
    const list: PendingDeviceCommand[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const arr: PendingDeviceCommand[] = Array.isArray(list) ? list : [];
    const idx = arr.findIndex((x) => String(x?.key) === String(next.key));
    if (idx >= 0) {
      const prev = arr[idx];
      arr[idx] = {
        ...prev,
        ...next,
        attempts: typeof prev?.attempts === 'number' ? prev.attempts : 0,
        createdAt: typeof prev?.createdAt === 'number' ? prev.createdAt : now,
        updatedAt: now,
      };
    } else {
      arr.push({ ...next, attempts: 0, createdAt: now, updatedAt: now });
    }
    await AsyncStorage.setItem(PENDING_DEVICE_COMMANDS_KEY, JSON.stringify(arr));
  } catch {}
}

export async function enqueueDeviceServerControl(
  deviceId: string,
  action: 'on' | 'off' | 'toggle',
  brightness?: number
): Promise<string> {
  const key = buildControlKey(deviceId, action, brightness);
  await upsertPendingCommand({
    key,
    kind: 'control',
    deviceId: String(deviceId),
    action,
    brightness: typeof brightness === 'number' && isFinite(brightness) ? brightness : undefined,
    dueAt: Date.now(),
    attempts: 0,
    createdAt: 0,
    updatedAt: 0,
  });
  try {
    await schedulePendingDeviceCommands(1000);
  } catch {}
  return key;
}

export async function enqueueDeviceServerUpdate(deviceId: string, payload: Record<string, any>): Promise<string> {
  const key = buildUpdateKey(deviceId, payload);
  await upsertPendingCommand({
    key,
    kind: 'update',
    deviceId: String(deviceId),
    payload,
    dueAt: Date.now(),
    attempts: 0,
    createdAt: 0,
    updatedAt: 0,
  });
  try {
    await schedulePendingDeviceCommands(1000);
  } catch {}
  return key;
}

export async function resolvePendingDeviceCommand(key: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_DEVICE_COMMANDS_KEY);
    const list: PendingDeviceCommand[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list) || list.length === 0) return;
    const filtered = list.filter((x) => String(x?.key) !== String(key));
    await AsyncStorage.setItem(PENDING_DEVICE_COMMANDS_KEY, JSON.stringify(filtered));
  } catch {}
}

async function schedulePendingDeviceCommands(delayMs: number): Promise<void> {
  try {
    const now = Date.now();
    const dueAt = now + Math.max(0, delayMs);
    const existing = await AsyncStorage.getItem(DEVICE_COMMAND_SCHEDULE_AT_KEY);
    const existingAt = existing ? parseInt(existing, 10) : NaN;
    if (typeof existingAt === 'number' && isFinite(existingAt) && existingAt <= dueAt + 2000) return;
    await AsyncStorage.setItem(DEVICE_COMMAND_SCHEDULE_AT_KEY, String(dueAt));
    await BackgroundFetch.scheduleTask({
      taskId: DEVICE_COMMAND_TASK_ID,
      delay: Math.max(0, delayMs),
      periodic: false,
      stopOnTerminate: false,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
      enableHeadless: true,
    } as any);
  } catch {}
}

async function processPendingDeviceCommands(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_DEVICE_COMMANDS_KEY);
    const list: PendingDeviceCommand[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list) || list.length ==0) return;

    const now = Date.now();
    const due = list.filter((x) => typeof x?.dueAt === 'number' && isFinite(x.dueAt) && x.dueAt <= now);
    if (due.length === 0) {
      const nextDue = list.reduce((acc: number | null, curr) => {
        const d = curr?.dueAt;
        if (typeof d !== 'number' || !isFinite(d)) return acc;
        return acc === null || d < acc ? d : acc;
      }, null);
      if (typeof nextDue === 'number' && isFinite(nextDue)) {
        await schedulePendingDeviceCommands(Math.max(0, nextDue - now));
      }
      return;
    }

    const MAX_PER_RUN = 8;
    const sorted = due.sort((a, b) => (a.dueAt || 0) - (b.dueAt || 0)).slice(0, MAX_PER_RUN);
    const pendingKeys = new Set(sorted.map((x) => String(x.key)));
    const keep: PendingDeviceCommand[] = list.filter((x) => !pendingKeys.has(String(x?.key)));
    const updated: PendingDeviceCommand[] = [];

    for (const cmd of sorted) {
      const attempts = typeof cmd?.attempts === 'number' ? cmd.attempts : 0;
      let ok = false;
      try {
        if (cmd.kind === 'control') {
          const action = cmd.action || 'toggle';
          ok = await esp8266Service.controlDeviceOnServer(String(cmd.deviceId), action as any, cmd.brightness);
        } else if (cmd.kind === 'update') {
          ok = await esp8266Service.updateDeviceOnServer(String(cmd.deviceId), cmd.payload || {});
        }
      } catch {
        ok = false;
      }
      if (!ok) {
        const nextAttempts = attempts + 1;
        const backoff = Math.min(10 * 60 * 1000, Math.max(10 * 1000, 10 * 1000 * Math.pow(2, Math.min(10, nextAttempts - 1))));
        if (nextAttempts <= 20) {
          updated.push({
            ...cmd,
            attempts: nextAttempts,
            dueAt: now + backoff,
            updatedAt: now,
          });
        }
      }
    }

    const merged = [...keep, ...updated];
    await AsyncStorage.setItem(PENDING_DEVICE_COMMANDS_KEY, JSON.stringify(merged));
    try {
      await AsyncStorage.setItem('last_pending_device_commands_run', String(Date.now()));
      await AsyncStorage.setItem('pending_device_commands_count', String(merged.length));
    } catch {}

    if (merged.length > 0) {
      const nextDue = merged.reduce((acc: number | null, curr) => {
        const d = curr?.dueAt;
        if (typeof d !== 'number' || !isFinite(d)) return acc;
        return acc === null || d < acc ? d : acc;
      }, null);
      if (typeof nextDue === 'number' && isFinite(nextDue)) {
        await schedulePendingDeviceCommands(Math.max(0, nextDue - now));
      }
    }
  } catch {}
}

export async function scheduleLockAutoOff(deviceId: string, delayMs: number = 3000): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_LOCK_KEY);
    const list: Array<{ deviceId: string; dueAt: number }> = raw ? JSON.parse(raw) : [];
    const dueAt = Date.now() + Math.max(1, delayMs);
    const filtered = list.filter((i) => String(i.deviceId) !== String(deviceId));
    filtered.push({ deviceId, dueAt });
    await AsyncStorage.setItem(PENDING_LOCK_KEY, JSON.stringify(filtered));
    try {
      const earliest = filtered.reduce((acc: number | null, curr) => (acc === null || curr.dueAt < acc ? curr.dueAt : acc), null);
      if (earliest) {
        const delay = Math.max(0, earliest - Date.now());
        await BackgroundFetch.scheduleTask({
          taskId: LOCK_AUTO_OFF_TASK_ID,
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
            const key = await enqueueDeviceServerUpdate(String(item.deviceId), { device2: 0 });
            const ok = await esp8266Service.updateDeviceOnServer(String(item.deviceId), { device2: 0 });
            if (ok) {
              await resolvePendingDeviceCommand(key);
            }
          }
        } catch {}
      } else {
        keep.push(item);
      }
    }
    await AsyncStorage.setItem(PENDING_LOCK_KEY, JSON.stringify(keep));
    try {
      const earliest = keep.reduce((acc: number | null, curr) => (acc === null || curr.dueAt < acc ? curr.dueAt : acc), null);
      if (earliest) {
        const delay = Math.max(0, earliest - Date.now());
        await BackgroundFetch.scheduleTask({
          taskId: LOCK_AUTO_OFF_TASK_ID,
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
          taskId: NO_FLOW_TASK_ID,
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
          const flowOk = typeof flow === 'number' && isFinite(flow) ? normalizeFlowRate(flow) : undefined;
          if (isOn && typeof flowOk === 'number' && isFinite(flowOk) && flowOk < NO_FLOW_THRESHOLD) {
            try {
              const k1 = await enqueueDeviceServerControl(String(item.deviceId), 'off');
              const ok1 = await esp8266Service.controlDeviceOnServer(String(item.deviceId), 'off' as any);
              if (ok1) {
                await resolvePendingDeviceCommand(k1);
              }
            } catch {}
            try {
              const k2 = await enqueueDeviceServerUpdate(String(item.deviceId), { device1: 0 });
              const ok2 = await esp8266Service.updateDeviceOnServer(String(item.deviceId), { device1: 0 });
              if (ok2) {
                await resolvePendingDeviceCommand(k2);
              }
            } catch {}
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
      const flowRaw = typeof frRaw === 'number' ? frRaw : (typeof frRaw === 'string' ? parseFloat(frRaw) : undefined);
      const flow = typeof flowRaw === 'number' && isFinite(flowRaw) ? normalizeFlowRate(flowRaw) : undefined;
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
          try {
            const k1 = await enqueueDeviceServerControl(deviceId, 'on');
            const ok1 = await esp8266Service.controlDeviceOnServer(deviceId, 'on' as any);
            if (ok1) {
              await resolvePendingDeviceCommand(k1);
            }
          } catch {}
          try {
            const k2 = await enqueueDeviceServerUpdate(deviceId, { device1: 1 });
            const ok2 = await esp8266Service.updateDeviceOnServer(deviceId, { device1: 1 });
            if (ok2) {
              await resolvePendingDeviceCommand(k2);
            }
          } catch {}
        }
      }
      if (offEnabled) {
        const offMet = offOperator === 'lt' ? level < offThreshold : level >= offThreshold;
        if (offMet) {
          try {
            const k1 = await enqueueDeviceServerControl(deviceId, 'off');
            const ok1 = await esp8266Service.controlDeviceOnServer(deviceId, 'off' as any);
            if (ok1) {
              await resolvePendingDeviceCommand(k1);
            }
          } catch {}
          try {
            const k2 = await enqueueDeviceServerUpdate(deviceId, { device1: 0 });
            const ok2 = await esp8266Service.updateDeviceOnServer(deviceId, { device1: 0 });
            if (ok2) {
              await resolvePendingDeviceCommand(k2);
            }
          } catch {}
        }
      }

      if (supplyEnabled) {
        const now = new Date();
        const inMorning = isInWindow(now, morningEnabled, freq, morningStart, morningEnd);
        const inEvening = isInWindow(now, eveningEnabled, freq, eveningStart, eveningEnd);
        const active = inMorning || inEvening;
        if (active) {
          try {
            const k1 = await enqueueDeviceServerControl(deviceId, 'on');
            const ok1 = await esp8266Service.controlDeviceOnServer(deviceId, 'on' as any);
            if (ok1) {
              await resolvePendingDeviceCommand(k1);
            }
          } catch {}
          try {
            const k2 = await enqueueDeviceServerUpdate(deviceId, { device1: 1 });
            const ok2 = await esp8266Service.updateDeviceOnServer(deviceId, { device1: 1 });
            if (ok2) {
              await resolvePendingDeviceCommand(k2);
            }
          } catch {}
        } else {
          const finishedMorning = isFinishedWindow(now, freq, morningStart, morningEnd);
          const finishedEvening = isFinishedWindow(now, freq, eveningStart, eveningEnd);
          if (finishedMorning || finishedEvening) {
            try {
              const k1 = await enqueueDeviceServerControl(deviceId, 'off');
              const ok1 = await esp8266Service.controlDeviceOnServer(deviceId, 'off' as any);
              if (ok1) {
                await resolvePendingDeviceCommand(k1);
              }
            } catch {}
            try {
              const k2 = await enqueueDeviceServerUpdate(deviceId, { device1: 0 });
              const ok2 = await esp8266Service.updateDeviceOnServer(deviceId, { device1: 0 });
              if (ok2) {
                await resolvePendingDeviceCommand(k2);
              }
            } catch {}
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
    try { await scheduleNextAutomationTick(); } catch {}
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
    try {
      const bt: any = BackgroundTimer as any;
      if (typeof bt?.stopBackgroundTimer === 'function') bt.stopBackgroundTimer();
    } catch {}
    const bt: any = BackgroundTimer as any;
    if (typeof bt?.runBackgroundTimer === 'function') {
      bt.runBackgroundTimer(async () => {
        try { await processPendingDeviceCommands(); } catch {}
        try { await evaluateAutomationRulesHeadless(); } catch {}
        try { await processPendingLockAutoOff(); } catch {}
        try { await processPendingNoFlowAutoOff(); } catch {}
        try { await runHeadlessSocketSession(); } catch {}
      }, 10000);
    } else {
      automationIntervalRef = BackgroundTimer.setInterval(async () => {
        try { await processPendingDeviceCommands(); } catch {}
        try { await evaluateAutomationRulesHeadless(); } catch {}
        try { await processPendingLockAutoOff(); } catch {}
        try { await processPendingNoFlowAutoOff(); } catch {}
        try { await runHeadlessSocketSession(); } catch {}
      }, 10000);
    }
  } catch {}
}

export function stopAutomationMonitorForeground(): void {
  try {
    if (automationIntervalRef) {
      BackgroundTimer.clearInterval(automationIntervalRef);
      automationIntervalRef = null;
    }
    const bt: any = BackgroundTimer as any;
    if (typeof bt?.stopBackgroundTimer === 'function') bt.stopBackgroundTimer();
  } catch {}
}

export async function refreshAutomationSchedule(): Promise<void> {
  try {
    await scheduleNextAutomationTick();
  } catch {}
}

function timeOnDate(base: Date, time: Date): Date {
  const d = new Date(base);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return d;
}

function nextBoundaryForWindow(now: Date, enabled: boolean, frequency: string, start: Date | null, end: Date | null): number | null {
  if (!enabled || !start || !end) return null;
  const nowMs = now.getTime();
  if (frequency === 'once') {
    const s = start.getTime();
    const e = end.getTime();
    if (!isFinite(s) || !isFinite(e)) return null;
    if (nowMs < s) return s;
    if (nowMs <= e) return e;
    return null;
  }

  const startToday = timeOnDate(now, start).getTime();
  const endToday = timeOnDate(now, end).getTime();
  if (!isFinite(startToday) || !isFinite(endToday)) return null;

  if (endToday >= startToday) {
    if (nowMs < startToday) return startToday;
    if (nowMs <= endToday) return endToday;
    return startToday + 24 * 60 * 60 * 1000;
  }

  if (nowMs <= endToday) return endToday;
  if (nowMs < startToday) return startToday;
  return endToday + 24 * 60 * 60 * 1000;
}

async function scheduleNextAutomationTick(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ruleKeys = keys.filter((k) => k.startsWith('auto_rules_'));
    if (ruleKeys.length === 0) {
      try { await AsyncStorage.removeItem(AUTOMATION_SCHEDULE_AT_KEY); } catch {}
      return;
    }

    const entries = await AsyncStorage.multiGet(ruleKeys);
    const now = new Date();
    let nextAt: number | null = null;

    for (const [, value] of entries) {
      if (!value) continue;
      let rules: any = null;
      try { rules = JSON.parse(value); } catch {}
      if (!rules) continue;

      const supply = rules?.supplyWater || {};
      const enabled = !!supply?.enabled;
      const freq = String(supply?.frequency || 'everyday');

      const morningAt = nextBoundaryForWindow(
        now,
        !!supply?.morningEnabled && enabled,
        freq,
        supply?.morningStart ? new Date(supply.morningStart) : null,
        supply?.morningEnd ? new Date(supply.morningEnd) : null
      );
      const eveningAt = nextBoundaryForWindow(
        now,
        !!supply?.eveningEnabled && enabled,
        freq,
        supply?.eveningStart ? new Date(supply.eveningStart) : null,
        supply?.eveningEnd ? new Date(supply.eveningEnd) : null
      );

      const candidates = [morningAt, eveningAt].filter((x): x is number => typeof x === 'number' && isFinite(x));
      for (const c of candidates) {
        if (c <= now.getTime()) continue;
        if (nextAt === null || c < nextAt) nextAt = c;
      }
    }

    if (nextAt === null) {
      try { await AsyncStorage.removeItem(AUTOMATION_SCHEDULE_AT_KEY); } catch {}
      return;
    }

    const existing = await AsyncStorage.getItem(AUTOMATION_SCHEDULE_AT_KEY);
    const existingAt = existing ? parseInt(existing, 10) : NaN;
    if (typeof existingAt === 'number' && isFinite(existingAt) && existingAt <= nextAt + 2000) return;

    await AsyncStorage.setItem(AUTOMATION_SCHEDULE_AT_KEY, String(nextAt));
    const delay = Math.max(0, nextAt - Date.now());
    await BackgroundFetch.scheduleTask({
      taskId: AUTOMATION_TASK_ID,
      delay,
      periodic: false,
      stopOnTerminate: false,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
      enableHeadless: true,
    } as any);
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
