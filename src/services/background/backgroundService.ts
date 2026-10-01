import BackgroundFetch from 'react-native-background-fetch';
import { Platform, AppState, AppStateStatus, Vibration } from 'react-native';
import BackgroundActions from 'react-native-background-actions';
import PushNotification from 'react-native-push-notification';
import esp8266Service from '../esp8266/esp8266Service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundTimer from 'react-native-background-timer';
import { io, Socket } from 'socket.io-client';
import * as appConstants from '../../constants/constatantsV';
import authService from '../auth/authService';

let backgroundFetchConfigured = false;
let foregroundMonitorIntervalRef: any = null;
let foregroundActionRunning = false;
let iosBackupNotificationsHooked = false;
const BgActionsModule: any = (BackgroundActions as any)?.default ?? BackgroundActions;

async function bgScheduleTask(opts: {
  taskId: string;
  delay: number;
  periodic?: boolean;
  stopOnTerminate?: boolean;
  enableHeadless?: boolean;
  requiredNetworkType?: any;
}): Promise<void> {
  try {
    await BackgroundFetch.scheduleTask({
      taskId: opts.taskId,
      delay: Math.max(0, opts.delay),
      periodic: !!opts.periodic,
      stopOnTerminate: opts.stopOnTerminate ?? false,
      requiredNetworkType: opts.requiredNetworkType ?? BackgroundFetch.NETWORK_TYPE_ANY,
      enableHeadless: opts.enableHeadless ?? true,
    } as any);
  } catch {}
  if (Platform.OS !== 'ios') return;
  try {
    const delayMs = Math.max(1000, opts.delay);
    const fireDate = new Date(Date.now() + delayMs);
    const id = `bg-${opts.taskId}-${Math.floor(delayMs)}`;
    const PN: any = PushNotification as any;
    if (typeof PN?.localNotificationSchedule === 'function') {
      PN.localNotificationSchedule({
        id,
        userInfo: { id, taskId: opts.taskId, source: 'voodoo-backup-notification' },
        message: ' ',
        playSound: false,
        soundName: undefined as any,
        number: 0,
        vibrate: false,
        priority: 'min' as any,
        showWhen: false,
        autoCancel: false,
        onlyAlertOnce: true,
        allowWhileIdle: true,
        ignoreInForeground: false,
        invokeApp: false,
        date: fireDate,
      });
    }
  } catch {}
}

function hookIosBackupNotificationCallbacks(): void {
  if (Platform.OS !== 'ios' || iosBackupNotificationsHooked) return;
  try {
    const PN: any = PushNotification as any;
    if (typeof PN?.addEventListener === 'function') {
      try {
        PN.addEventListener('notification', (notif: any) => {
          try {
            const ui = notif?.data?.userInfo ?? notif?.userInfo ?? {};
            if (ui?.source === 'voodoo-backup-notification' && typeof ui?.taskId === 'string') {
              runBackgroundPipeline(String(ui.taskId)).catch(() => {});
            }
          } catch {}
        });
      } catch {}
      try {
        PN.addEventListener('localNotification', (notif: any) => {
          try {
            const ui = notif?.data?.userInfo ?? notif?.userInfo ?? {};
            if (ui?.source === 'voodoo-backup-notification' && typeof ui?.taskId === 'string') {
              runBackgroundPipeline(String(ui.taskId)).catch(() => {});
            }
          } catch {}
        });
      } catch {}
    }
    if (typeof PN?.configure === 'function') {
      try {
        PN.configure({
          onNotification: (_notif: any) => {
            try {
              const ui = _notif?.data?.userInfo ?? _notif?.userInfo ?? {};
              if (ui?.source === 'voodoo-backup-notification' && typeof ui?.taskId === 'string') {
                runBackgroundPipeline(String(ui.taskId)).catch(() => {});
              }
              if (typeof _notif?.finish === 'function') {
                try { _notif.finish(('backgroundFetchResultNoData' as any) ?? 'UIBackgroundFetchResultNoData'); } catch {}
              }
            } catch {}
          },
          senderID: undefined as any,
          permissions: { alert: false, badge: false, sound: false },
          popInitialNotification: false,
          requestPermissions: false,
        });
      } catch {}
    }
    iosBackupNotificationsHooked = true;
  } catch {}
}

// #region debug-point A:reporter
const DEBUG_SESSION_ID = 'water-schedule-no-off';
const DEBUG_SERVER_URL = 'http://127.0.0.1:7777/event';
const DEBUG_RUN_ID = 'pre-fix';
function dbg(hypothesisId: string, location: string, msg: string, data?: Record<string, any>): void {
  try {
    try {
      if (typeof __DEV__ !== 'undefined' && !__DEV__) return;
    } catch {}
    fetch(DEBUG_SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: DEBUG_SESSION_ID,
        runId: DEBUG_RUN_ID,
        hypothesisId,
        location,
        msg: `[DEBUG] ${msg}`,
        data: data || {},
        ts: Date.now(),
      }),
    }).catch(() => {});
  } catch {}
}
// #endregion

export async function runBackgroundPipeline(taskId?: string): Promise<void> {
  try {
    try {
      await processPendingDeviceCommands();
    } catch {}
    try {
      const list = await esp8266Service.getDevicesFromServer();
      await AsyncStorage.setItem('last_background_device_count', String(Array.isArray(list) ? list.length : 0));
    } catch {}
    try {
      const unassigned = await esp8266Service.getUnassignedDevices();
      await AsyncStorage.setItem('last_background_unassigned_count', String(Array.isArray(unassigned) ? unassigned.length : 0));
    } catch {}
    try {
      await processPendingLockAutoOff();
    } catch {}
    if (taskId === AUTOMATION_TASK_ID || taskId === LOCK_AUTO_OFF_TASK_ID || taskId === DEVICE_COMMAND_TASK_ID || taskId === NO_FLOW_TASK_ID) {
      try {
        await evaluateAutomationRulesHeadless();
      } catch {}
    } else {
      try {
        await evaluateAutomationRulesHeadless();
      } catch {}
    }
    try {
      await processPendingNoFlowAutoOff();
    } catch {}
    try {
      await runHeadlessSocketSession();
    } catch {}
    try {
      await refreshAutomationSchedule();
    } catch {}
    try {
      await scheduleNextPendingCommandsTick();
    } catch {}
  } catch {}
}

export async function initBackgroundDevicePolling() {
  try {
    if (backgroundFetchConfigured) return;
    const baseConfig = {
      minimumFetchInterval: Platform.OS === 'ios' ? 15 : 1,
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
      requiresBatteryNotLow: false,
      requiresCharging: false,
      requiresDeviceIdle: false,
      requiresStorageNotLow: false,
    } as any;
    let cfg: any = baseConfig;
    if (Platform.OS === 'android') {
      cfg = {
        ...baseConfig,
        forceAlarmManager: true,
      };
    } else {
      cfg = {
        ...baseConfig,
        minimumFetchInterval: 15,
      };
    }
    await BackgroundFetch.configure(
      cfg,
      async (taskIdParam: string) => {
        dbg('A', 'backgroundService.ts:initBackgroundDevicePolling', 'BackgroundFetch callback', {
          taskId: taskIdParam,
          os: Platform.OS,
        });
        await runBackgroundPipeline(taskIdParam);
        BackgroundFetch.finish(taskIdParam);
      },
      async (taskIdParam: string) => {
        dbg('A', 'backgroundService.ts:initBackgroundDevicePolling', 'BackgroundFetch timeout', {
          taskId: taskIdParam,
          os: Platform.OS,
        });
        BackgroundFetch.finish(taskIdParam);
      }
    );
    await BackgroundFetch.start();
    try {
      const _sub: any = AppState.addEventListener('change', handleAppStateChange);
      void _sub;
    } catch {}
    try {
      hookIosBackupNotificationCallbacks();
    } catch {}
    backgroundFetchConfigured = true;
  } catch {}
}

export const BackgroundDeviceHeadless = async (event: any) => {
  dbg('A', 'backgroundService.ts:BackgroundDeviceHeadless', 'Headless task entry', {
    taskId: event?.taskId,
    timeout: event?.timeout,
    os: Platform.OS,
  });
  const taskId: string | undefined = event?.taskId;
  await runBackgroundPipeline(taskId);
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

function getStateField(state: any, field: string): any {
  try {
    if (!state || typeof state !== 'object') return undefined;
    const direct = (state as any)[field];
    if (typeof direct !== 'undefined') return direct;
    const data = (state as any).data;
    if (data && typeof data === 'object') {
      const v = (data as any)[field];
      if (typeof v !== 'undefined') return v;
    }
    const inner = (state as any).state;
    if (inner && typeof inner === 'object') {
      const v = (inner as any)[field];
      if (typeof v !== 'undefined') return v;
    }
  } catch {}
  return undefined;
}

function getFirstStateField(state: any, ...fields: string[]): any {
  for (const f of fields) {
    const v = getStateField(state, f);
    if (typeof v !== 'undefined') return v;
  }
  return undefined;
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
    await bgScheduleTask({
      taskId: DEVICE_COMMAND_TASK_ID,
      delay: Math.max(0, delayMs),
      periodic: false,
      stopOnTerminate: false,
      enableHeadless: true,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
    });
  } catch {}
}

export async function processPendingDeviceCommands(): Promise<void> {
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

export async function scheduleLockAutoOff(deviceId: string, delayMs: number = 0): Promise<void> {
  try {
    if (!deviceId) return;
    if (typeof delayMs !== 'number' || !isFinite(delayMs) || delayMs <= 0) return;
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
        await bgScheduleTask({
          taskId: LOCK_AUTO_OFF_TASK_ID,
          delay,
          periodic: false,
          stopOnTerminate: false,
          enableHeadless: true,
          requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
        });
      }
    } catch {}
  } catch {}
}

export async function processPendingLockAutoOff(): Promise<void> {
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
        await bgScheduleTask({
          taskId: LOCK_AUTO_OFF_TASK_ID,
          delay,
          periodic: false,
          stopOnTerminate: false,
          enableHeadless: true,
          requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
        });
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
    const now = Date.now();
    const wantedDueAt = now + Math.max(1, delayMs);
    const existing = Array.isArray(list) ? list.find((i) => String(i?.deviceId) === String(deviceId)) : undefined;
    const dueAt =
      existing && typeof existing?.dueAt === 'number' && isFinite(existing.dueAt) && existing.dueAt > now
        ? existing.dueAt
        : wantedDueAt;
    const filtered = (Array.isArray(list) ? list : []).filter((i) => String(i?.deviceId) !== String(deviceId));
    filtered.push({ deviceId, dueAt });
    await AsyncStorage.setItem(PENDING_NO_FLOW_KEY, JSON.stringify(filtered));
    // #region debug-point D:no-flow-scheduled
    dbg('D', 'backgroundService.ts:scheduleNoFlowPending', 'No-flow scheduled', {
      deviceId: String(deviceId),
      delayMs,
      dueAt,
      count: filtered.length,
    });
    // #endregion
    try {
      const earliest = filtered.reduce((acc: number | null, curr) => (acc === null || curr.dueAt < acc ? curr.dueAt : acc), null);
      if (earliest) {
        const delay = Math.max(0, earliest - Date.now());
        await bgScheduleTask({
          taskId: NO_FLOW_TASK_ID,
          delay,
          periodic: false,
          stopOnTerminate: false,
          enableHeadless: true,
          requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
        });
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
    // #region debug-point D:no-flow-cleared
    dbg('D', 'backgroundService.ts:clearNoFlowPending', 'No-flow cleared', {
      deviceId: String(deviceId),
      count: filtered.length,
    });
    // #endregion
  } catch {}
}

export async function processPendingNoFlowAutoOff(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_NO_FLOW_KEY);
    const list: Array<{ deviceId: string; dueAt: number }> = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list) || list.length === 0) return;
    const now = Date.now();
    const keep: Array<{ deviceId: string; dueAt: number }> = [];
    for (const item of list) {
      if (now >= item.dueAt) {
        // #region debug-point D:no-flow-due
        dbg('D', 'backgroundService.ts:processPendingNoFlowAutoOff', 'No-flow due check', {
          deviceId: String(item.deviceId),
          dueAt: item.dueAt,
          now,
        });
        // #endregion
        try {
          const state = await esp8266Service.getDeviceStateFromServer(String(item.deviceId));
          let isOn = false;
          try {
            const rawOn = getFirstStateField(state, 'isOn', 'device1', 'relay1', 'switch1');
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
          if (frRaw === undefined) {
            try {
              const cached = await AsyncStorage.getItem(`bg_flow_${String(item.deviceId)}`);
              const parsed = cached ? JSON.parse(cached) : null;
              const v = parsed?.flow;
              frRaw = typeof v === 'number' ? v : (typeof v === 'string' ? parseFloat(v) : undefined);
            } catch {}
          }
          const flow = typeof frRaw === 'number' ? frRaw : (typeof frRaw === 'string' ? parseFloat(frRaw) : undefined);
          const flowOk = typeof flow === 'number' && isFinite(flow) ? normalizeFlowRate(flow) : undefined;
          // #region debug-point D:no-flow-state
          dbg('D', 'backgroundService.ts:processPendingNoFlowAutoOff', 'No-flow state', {
            deviceId: String(item.deviceId),
            isOn,
            flowRaw: flow,
            flowOk,
            threshold: NO_FLOW_THRESHOLD,
          });
          // #endregion
          if (!isOn) {
          } else if (typeof flowOk === 'number' && isFinite(flowOk) && flowOk >= NO_FLOW_THRESHOLD) {
          } else if (!(typeof flowOk === 'number' && isFinite(flowOk))) {
            keep.push({ deviceId: String(item.deviceId), dueAt: now + 10000 });
          } else if (flowOk < NO_FLOW_THRESHOLD) {
            // #region debug-point C:no-flow-off-attempt
            dbg('C', 'backgroundService.ts:processPendingNoFlowAutoOff', 'No-flow OFF attempt', {
              deviceId: String(item.deviceId),
              flowOk,
            });
            // #endregion
            try {
              const k1 = await enqueueDeviceServerControl(String(item.deviceId), 'off');
              const ok1 = await esp8266Service.controlDeviceOnServer(String(item.deviceId), 'off' as any);
              // #region debug-point C:no-flow-control-result
              dbg('C', 'backgroundService.ts:processPendingNoFlowAutoOff', 'No-flow control result', {
                deviceId: String(item.deviceId),
                ok: !!ok1,
              });
              // #endregion
              if (ok1) {
                await resolvePendingDeviceCommand(k1);
              }
            } catch {}
            try {
              const k2 = await enqueueDeviceServerUpdate(String(item.deviceId), { device1: 0 });
              const ok2 = await esp8266Service.updateDeviceOnServer(String(item.deviceId), { device1: 0 });
              // #region debug-point C:no-flow-update-result
              dbg('C', 'backgroundService.ts:processPendingNoFlowAutoOff', 'No-flow update result', {
                deviceId: String(item.deviceId),
                ok: !!ok2,
              });
              // #endregion
              if (ok2) {
                await resolvePendingDeviceCommand(k2);
              }
            } catch {}
            keep.push({ deviceId: String(item.deviceId), dueAt: now + 15000 });
          }
        } catch {}
      } else {
        keep.push(item);
      }
    }
    await AsyncStorage.setItem(PENDING_NO_FLOW_KEY, JSON.stringify(keep));
    try {
      const earliest = keep.reduce((acc: number | null, curr) => (acc === null || curr.dueAt < acc ? curr.dueAt : acc), null);
      if (earliest) {
        const delay = Math.max(0, earliest - Date.now());
        await bgScheduleTask({
          taskId: NO_FLOW_TASK_ID,
          delay,
          periodic: false,
          stopOnTerminate: false,
          enableHeadless: true,
          requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
        });
      }
    } catch {}
  } catch {}
}

export async function evaluateAutomationRulesHeadless(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ruleKeys = keys.filter((k) => k.startsWith('auto_rules_'));
    if (ruleKeys.length === 0) return;
    const entries = await AsyncStorage.multiGet(ruleKeys);
    const RULE_DEBOUNCE_MS = 2 * 60 * 1000;
    for (const [key, value] of entries) {
      if (!value) continue;
      const deviceId = key.replace('auto_rules_', '');
      let rules: any = null;
      try { rules = JSON.parse(value); } catch {}
      if (!rules || !deviceId) continue;
      let rulesChanged = false;
      if (!rules?.lastFire || typeof rules.lastFire !== 'object') {
        rules.lastFire = {};
        rulesChanged = true;
      }
      const getLastFire = (sectionKey: string, kind: 'on' | 'off', k: string): number | null => {
        try {
          const sec = rules.lastFire[sectionKey];
          if (!sec || !sec[kind]) return null;
          const v = Number(sec[kind][k]);
          return typeof v === 'number' && isFinite(v) ? v : null;
        } catch { return null; }
      };
      const markLastFire = (sectionKey: string, kind: 'on' | 'off', k: string, at: number) => {
        try {
          if (!rules.lastFire[sectionKey]) rules.lastFire[sectionKey] = { on: {}, off: {} };
          if (!rules.lastFire[sectionKey][kind]) rules.lastFire[sectionKey][kind] = {};
          const prev = Number(rules.lastFire[sectionKey][kind][k] || 0);
          if (prev !== at) rulesChanged = true;
          rules.lastFire[sectionKey][kind][k] = at;
        } catch {}
      };
      const lastFiredWithin = (sectionKey: string, kind: 'on' | 'off', k: string, windowMs: number): boolean => {
        const last = getLastFire(sectionKey, kind, k);
        if (last == null) return false;
        return (Date.now() - last) < windowMs;
      };
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
      const parseOnOff = (raw: any): boolean => {
        if (typeof raw === 'number') return raw === 1;
        if (typeof raw === 'boolean') return raw;
        if (typeof raw === 'string') {
          const s = raw.trim().toLowerCase();
          return s === '1' || s === 'true' || s === 'on';
        }
        return false;
      };
      const applyUpdate = async (payload: Record<string, any>): Promise<void> => {
        try {
          const k = await enqueueDeviceServerUpdate(deviceId, payload);
          const ok = await esp8266Service.updateDeviceOnServer(deviceId, payload);
          // #region debug-point C:update-result
          dbg('C', 'backgroundService.ts:evaluateAutomationRulesHeadless', 'Update result', {
            deviceId,
            payload,
            ok: !!ok,
          });
          // #endregion
          if (ok) {
            await resolvePendingDeviceCommand(k);
          }
        } catch {}
      };
      const applyControl = async (action: 'on' | 'off'): Promise<void> => {
        try {
          const k = await enqueueDeviceServerControl(deviceId, action);
          const ok = await esp8266Service.controlDeviceOnServer(deviceId, action as any);
          // #region debug-point C:control-result
          dbg('C', 'backgroundService.ts:evaluateAutomationRulesHeadless', 'Control result', {
            deviceId,
            action,
            ok: !!ok,
          });
          // #endregion
          if (ok) {
            await resolvePendingDeviceCommand(k);
          }
        } catch {}
      };

      const now = new Date();
      const isOn = parseOnOff(getFirstStateField(state, 'isOn', 'device1', 'relay1', 'switch1'));
      const device2On = parseOnOff(getFirstStateField(state, 'device2', 'relay2', 'switch2'));
      const device3On = parseOnOff(getFirstStateField(state, 'device3', 'relay3', 'switch3'));
      const device4On = parseOnOff(getFirstStateField(state, 'device4', 'relay4', 'switch4'));
      const device5On = parseOnOff(getFirstStateField(state, 'device5', 'relay5', 'switch5'));
      let pctRaw: any = state?.waterPercentage ?? state?.water_percent ?? state?.waterLevelPercent;
      if (pctRaw === undefined && state?.data) {
        pctRaw = state.data.waterPercentage ?? state.data.water_percent ?? state.data.waterLevelPercent;
      }
      let brRaw: any = state?.brightness ?? state?.value ?? state?.waterLevel;
      if (brRaw === undefined && state?.data) {
        brRaw = state.data.brightness ?? state.data.value ?? state.data.waterLevel;
      }
      if (pctRaw === undefined && brRaw === undefined) {
        try {
          const cached = await AsyncStorage.getItem(`bg_brightness_${deviceId}`);
          const parsed = cached ? JSON.parse(cached) : null;
          const v = parsed?.brightness;
          brRaw = typeof v === 'number' ? v : (typeof v === 'string' ? parseFloat(v) : undefined);
        } catch {}
      }
      let frRaw: any = state?.flowRate ?? state?.flow_rate ?? state?.FlowRate;
      if (frRaw === undefined && state?.data) {
        frRaw = state.data.flowRate ?? state.data.flow_rate ?? state.data.FlowRate;
      }
      if (frRaw === undefined) {
        try {
          const cached = await AsyncStorage.getItem(`bg_flow_${deviceId}`);
          const parsed = cached ? JSON.parse(cached) : null;
          const v = parsed?.flow;
          frRaw = typeof v === 'number' ? v : (typeof v === 'string' ? parseFloat(v) : undefined);
        } catch {}
      }
      const flowRaw = typeof frRaw === 'number' ? frRaw : (typeof frRaw === 'string' ? parseFloat(frRaw) : undefined);
      const flow = typeof flowRaw === 'number' && isFinite(flowRaw) ? normalizeFlowRate(flowRaw) : undefined;
      let tRaw: any = state?.target ?? state?.targetDistance ?? state?.distanceTarget ?? state?.waterTarget;
      if (tRaw === undefined && state?.data) {
        tRaw = state.data.target ?? state.data.targetDistance ?? state.data.distanceTarget ?? state.data.waterTarget;
      }
      let t = typeof tRaw === 'number' && isFinite(tRaw) && tRaw > 0 ? tRaw : NaN;
      if (!(typeof t === 'number' && isFinite(t) && t > 0)) {
        try {
          const local = await AsyncStorage.getItem(`target_${deviceId}`);
          const n = local ? parseFloat(local) : NaN;
          if (typeof n === 'number' && isFinite(n) && n > 0) t = n;
        } catch {}
      }
      if (!(typeof t === 'number' && isFinite(t) && t > 0)) t = 100;
      let level = 0;
      if (typeof pctRaw === 'number' && isFinite(pctRaw)) {
        level = Math.max(0, Math.min(100, Math.round(pctRaw)));
      } else if (typeof brRaw === 'number' && isFinite(brRaw)) {
        level = brightnessToPercent(brRaw, t);
      }

      // #region debug-point B:eval-state
      dbg('B', 'backgroundService.ts:evaluateAutomationRulesHeadless', 'Eval state', {
        deviceId,
        now: now.toISOString(),
        isOn,
        level,
        target: t,
        pctRaw,
        brRaw,
        flow,
        onEnabled,
        onOperator,
        onThreshold,
        offEnabled,
        offOperator,
        offThreshold,
        supplyEnabled,
        freq,
        morningEnabled,
        eveningEnabled,
        morningStart: morningStart ? morningStart.toISOString() : null,
        morningEnd: morningEnd ? morningEnd.toISOString() : null,
        eveningStart: eveningStart ? eveningStart.toISOString() : null,
        eveningEnd: eveningEnd ? eveningEnd.toISOString() : null,
      });
      // #endregion

      if (onEnabled) {
        const onMet = onOperator === 'lt' ? level < onThreshold : level >= onThreshold;
        if (onMet && !isOn && !lastFiredWithin('threshold', 'on', 'on', RULE_DEBOUNCE_MS)) {
          dbg('E', 'backgroundService.ts:evaluateAutomationRulesHeadless', 'ON by level', {
            deviceId,
            level,
            operator: onOperator,
            threshold: onThreshold,
          });
          try { await applyControl('on'); } catch {}
          try { await applyUpdate({ device1: 1 }); } catch {}
          markLastFire('threshold', 'on', 'on', Date.now());
        }
      }
      if (offEnabled) {
        const offMet = offOperator === 'lt' ? level < offThreshold : level >= offThreshold;
        if (offMet && isOn && !lastFiredWithin('threshold', 'off', 'off', RULE_DEBOUNCE_MS)) {
          dbg('E', 'backgroundService.ts:evaluateAutomationRulesHeadless', 'OFF by level', {
            deviceId,
            level,
            operator: offOperator,
            threshold: offThreshold,
          });
          try { await applyControl('off'); } catch {}
          try { await applyUpdate({ device1: 0 }); } catch {}
          markLastFire('threshold', 'off', 'off', Date.now());
        }
      }

      if (supplyEnabled) {
        const inMorning = isInWindow(now, morningEnabled, freq, morningStart, morningEnd);
        const inEvening = isInWindow(now, eveningEnabled, freq, eveningStart, eveningEnd);
        const active = inMorning || inEvening;
        const mkMorning = windowKey(now, freq, 'morning', morningStart, morningEnd);
        const mkEvening = windowKey(now, freq, 'evening', eveningStart, eveningEnd);
        dbg('B', 'backgroundService.ts:evaluateAutomationRulesHeadless', 'Supply window', {
          deviceId,
          inMorning,
          inEvening,
          active,
        });
        const fireOnMorning = inMorning && getLastFire('supplyWater', 'on', mkMorning) == null;
        const fireOnEvening = inEvening && getLastFire('supplyWater', 'on', mkEvening) == null;
        if ((fireOnMorning || fireOnEvening) && !isOn) {
          try { await applyControl('on'); } catch {}
          try { await applyUpdate({ device1: 1 }); } catch {}
          if (inMorning) markLastFire('supplyWater', 'on', mkMorning, Date.now());
          if (inEvening) markLastFire('supplyWater', 'on', mkEvening, Date.now());
        } else if (active) {
          if (inMorning) markLastFire('supplyWater', 'on', mkMorning, getLastFire('supplyWater', 'on', mkMorning) ?? Date.now());
          if (inEvening) markLastFire('supplyWater', 'on', mkEvening, getLastFire('supplyWater', 'on', mkEvening) ?? Date.now());
        }
        const finishedMorning = isFinishedWindow(now, freq, morningStart, morningEnd);
        const finishedEvening = isFinishedWindow(now, freq, eveningStart, eveningEnd);
        dbg('B', 'backgroundService.ts:evaluateAutomationRulesHeadless', 'Supply finished check', {
          deviceId,
          finishedMorning,
          finishedEvening,
          isOn,
        });
        const fireOffMorning = finishedMorning && getLastFire('supplyWater', 'off', mkMorning) == null;
        const fireOffEvening = finishedEvening && getLastFire('supplyWater', 'off', mkEvening) == null;
        if ((fireOffMorning || fireOffEvening) && isOn) {
          try { await applyControl('off'); } catch {}
          try { await applyUpdate({ device1: 0 }); } catch {}
          if (finishedMorning) markLastFire('supplyWater', 'off', mkMorning, Date.now());
          if (finishedEvening) markLastFire('supplyWater', 'off', mkEvening, Date.now());
        } else if (finishedMorning || finishedEvening) {
          if (finishedMorning) markLastFire('supplyWater', 'off', mkMorning, getLastFire('supplyWater', 'off', mkMorning) ?? Date.now());
          if (finishedEvening) markLastFire('supplyWater', 'off', mkEvening, getLastFire('supplyWater', 'off', mkEvening) ?? Date.now());
        }
      }

      const wp = rules?.wateringPlants || {};
      const wpEnabled = !!wp?.enabled;
      const wpFreq = String(wp?.frequency || 'everyday');
      const wpMorningEnabled = !!wp?.morningEnabled;
      const wpEveningEnabled = !!wp?.eveningEnabled;
      const wpMorningStart = wp?.morningStart ? new Date(wp.morningStart) : null;
      const wpMorningEnd = wp?.morningEnd ? new Date(wp.morningEnd) : null;
      const wpEveningStart = wp?.eveningStart ? new Date(wp.eveningStart) : null;
      const wpEveningEnd = wp?.eveningEnd ? new Date(wp.eveningEnd) : null;
      const wpMorningActive = wpEnabled && isInWindow(now, wpMorningEnabled, wpFreq, wpMorningStart, wpMorningEnd);
      const wpEveningActive = wpEnabled && isInWindow(now, wpEveningEnabled, wpFreq, wpEveningStart, wpEveningEnd);
      const wpActive = wpMorningActive || wpEveningActive;
      const wpMKMorning = windowKey(now, wpFreq, 'morning', wpMorningStart, wpMorningEnd);
      const wpMKEvening = windowKey(now, wpFreq, 'evening', wpEveningStart, wpEveningEnd);
      const wpMorningFinished = wpEnabled && isFinishedWindow(now, wpFreq, wpMorningStart, wpMorningEnd);
      const wpEveningFinished = wpEnabled && isFinishedWindow(now, wpFreq, wpEveningStart, wpEveningEnd);
      const wpFinished = wpMorningFinished || wpEveningFinished;

      const dog = rules?.dogFeed || {};
      const dogEnabled = !!dog?.enabled;
      const dogFreq = String(dog?.frequency || 'everyday');
      const dogMorningEnabled = !!dog?.morningEnabled;
      const dogEveningEnabled = !!dog?.eveningEnabled;
      const dogMorningStart = dog?.morningStart ? new Date(dog.morningStart) : null;
      const dogMorningEnd = dog?.morningEnd ? new Date(dog.morningEnd) : null;
      const dogEveningStart = dog?.eveningStart ? new Date(dog.eveningStart) : null;
      const dogEveningEnd = dog?.eveningEnd ? new Date(dog.eveningEnd) : null;
      const dogMorningActive = dogEnabled && isInWindow(now, dogMorningEnabled, dogFreq, dogMorningStart, dogMorningEnd);
      const dogEveningActive = dogEnabled && isInWindow(now, dogEveningEnabled, dogFreq, dogEveningStart, dogEveningEnd);
      const dogActive = dogMorningActive || dogEveningActive;
      const dogMKMorning = windowKey(now, dogFreq, 'morning', dogMorningStart, dogMorningEnd);
      const dogMKEvening = windowKey(now, dogFreq, 'evening', dogEveningStart, dogEveningEnd);
      const dogMorningFinished = dogEnabled && isFinishedWindow(now, dogFreq, dogMorningStart, dogMorningEnd);
      const dogEveningFinished = dogEnabled && isFinishedWindow(now, dogFreq, dogEveningStart, dogEveningEnd);
      const dogFinished = dogMorningFinished || dogEveningFinished;
      const dogField: 'device4' | 'device3' = typeof getStateField(state, 'device4') !== 'undefined' ? 'device4' : 'device3';
      const dogIsOn = dogField === 'device4' ? device4On : device3On;

      const ac = rules?.acControl || {};
      const acEnabled = !!ac?.enabled;
      const acFreq = String(ac?.frequency || 'everyday');
      const acMorningEnabled = !!ac?.morningEnabled;
      const acEveningEnabled = !!ac?.eveningEnabled;
      const acMorningStart = ac?.morningStart ? new Date(ac.morningStart) : null;
      const acMorningEnd = ac?.morningEnd ? new Date(ac.morningEnd) : null;
      const acEveningStart = ac?.eveningStart ? new Date(ac.eveningStart) : null;
      const acEveningEnd = ac?.eveningEnd ? new Date(ac.eveningEnd) : null;
      const acMorningActive = acEnabled && isInWindow(now, acMorningEnabled, acFreq, acMorningStart, acMorningEnd);
      const acEveningActive = acEnabled && isInWindow(now, acEveningEnabled, acFreq, acEveningStart, acEveningEnd);
      const acActive = acMorningActive || acEveningActive;
      const acMKMorning = windowKey(now, acFreq, 'morning', acMorningStart, acMorningEnd);
      const acMKEvening = windowKey(now, acFreq, 'evening', acEveningStart, acEveningEnd);
      const acMorningFinished = acEnabled && isFinishedWindow(now, acFreq, acMorningStart, acMorningEnd);
      const acEveningFinished = acEnabled && isFinishedWindow(now, acFreq, acEveningStart, acEveningEnd);
      const acFinished = acMorningFinished || acEveningFinished;
      let acField: 'device5' | 'device4' | 'device3' = 'device5';
      if (typeof getStateField(state, 'device5') === 'undefined') {
        if (dogField === 'device3') {
          acField = 'device4';
        } else if (typeof getStateField(state, 'device4') !== 'undefined' && dogField !== 'device4') {
          acField = 'device4';
        } else {
          acField = 'device3';
        }
      }
      const acIsOn = (() => {
        if (acField === 'device5') return device5On;
        if (acField === 'device4') return device4On;
        return device3On;
      })();

      const fireWpOnMorning = wpMorningActive && getLastFire('wateringPlants', 'on', wpMKMorning) == null;
      const fireWpOnEvening = wpEveningActive && getLastFire('wateringPlants', 'on', wpMKEvening) == null;
      if ((fireWpOnMorning || fireWpOnEvening) && !device3On) {
        try { await applyUpdate({ device3: 1 }); } catch {}
        if (wpMorningActive) markLastFire('wateringPlants', 'on', wpMKMorning, Date.now());
        if (wpEveningActive) markLastFire('wateringPlants', 'on', wpMKEvening, Date.now());
      } else if (wpActive) {
        if (wpMorningActive) markLastFire('wateringPlants', 'on', wpMKMorning, getLastFire('wateringPlants', 'on', wpMKMorning) ?? Date.now());
        if (wpEveningActive) markLastFire('wateringPlants', 'on', wpMKEvening, getLastFire('wateringPlants', 'on', wpMKEvening) ?? Date.now());
      }
      const fireWpOffMorning = wpMorningFinished && getLastFire('wateringPlants', 'off', wpMKMorning) == null;
      const fireWpOffEvening = wpEveningFinished && getLastFire('wateringPlants', 'off', wpMKEvening) == null;
      if (!wpActive && (fireWpOffMorning || fireWpOffEvening) && device3On) {
        const blockOff = dogField === 'device3' && (dogActive || !dogFinished);
        if (!blockOff) {
          try { await applyUpdate({ device3: 0 }); } catch {}
          if (wpMorningFinished) markLastFire('wateringPlants', 'off', wpMKMorning, Date.now());
          if (wpEveningFinished) markLastFire('wateringPlants', 'off', wpMKEvening, Date.now());
        }
      } else if (wpMorningFinished || wpEveningFinished) {
        if (wpMorningFinished) markLastFire('wateringPlants', 'off', wpMKMorning, getLastFire('wateringPlants', 'off', wpMKMorning) ?? Date.now());
        if (wpEveningFinished) markLastFire('wateringPlants', 'off', wpMKEvening, getLastFire('wateringPlants', 'off', wpMKEvening) ?? Date.now());
      }

      const fireDogOnMorning = dogMorningActive && getLastFire('dogFeed', 'on', dogMKMorning) == null;
      const fireDogOnEvening = dogEveningActive && getLastFire('dogFeed', 'on', dogMKEvening) == null;
      if ((fireDogOnMorning || fireDogOnEvening) && !dogIsOn) {
        try { await applyUpdate({ [dogField]: 1 }); } catch {}
        if (dogMorningActive) markLastFire('dogFeed', 'on', dogMKMorning, Date.now());
        if (dogEveningActive) markLastFire('dogFeed', 'on', dogMKEvening, Date.now());
      } else if (dogActive) {
        if (dogMorningActive) markLastFire('dogFeed', 'on', dogMKMorning, getLastFire('dogFeed', 'on', dogMKMorning) ?? Date.now());
        if (dogEveningActive) markLastFire('dogFeed', 'on', dogMKEvening, getLastFire('dogFeed', 'on', dogMKEvening) ?? Date.now());
      }
      const fireDogOffMorning = dogMorningFinished && getLastFire('dogFeed', 'off', dogMKMorning) == null;
      const fireDogOffEvening = dogEveningFinished && getLastFire('dogFeed', 'off', dogMKEvening) == null;
      if (!dogActive && (fireDogOffMorning || fireDogOffEvening) && dogIsOn) {
        const blockOff = dogField === 'device3' && (wpActive || !wpFinished);
        if (!blockOff) {
          try { await applyUpdate({ [dogField]: 0 }); } catch {}
          if (dogMorningFinished) markLastFire('dogFeed', 'off', dogMKMorning, Date.now());
          if (dogEveningFinished) markLastFire('dogFeed', 'off', dogMKEvening, Date.now());
        }
      } else if (dogMorningFinished || dogEveningFinished) {
        if (dogMorningFinished) markLastFire('dogFeed', 'off', dogMKMorning, getLastFire('dogFeed', 'off', dogMKMorning) ?? Date.now());
        if (dogEveningFinished) markLastFire('dogFeed', 'off', dogMKEvening, getLastFire('dogFeed', 'off', dogMKEvening) ?? Date.now());
      }

      const fireAcOnMorning = acMorningActive && getLastFire('acControl', 'on', acMKMorning) == null;
      const fireAcOnEvening = acEveningActive && getLastFire('acControl', 'on', acMKEvening) == null;
      if ((fireAcOnMorning || fireAcOnEvening) && !acIsOn) {
        try { await applyUpdate({ [acField]: 1 }); } catch {}
        if (acMorningActive) markLastFire('acControl', 'on', acMKMorning, Date.now());
        if (acEveningActive) markLastFire('acControl', 'on', acMKEvening, Date.now());
      } else if (acActive) {
        if (acMorningActive) markLastFire('acControl', 'on', acMKMorning, getLastFire('acControl', 'on', acMKMorning) ?? Date.now());
        if (acEveningActive) markLastFire('acControl', 'on', acMKEvening, getLastFire('acControl', 'on', acMKEvening) ?? Date.now());
      }
      const fireAcOffMorning = acMorningFinished && getLastFire('acControl', 'off', acMKMorning) == null;
      const fireAcOffEvening = acEveningFinished && getLastFire('acControl', 'off', acMKEvening) == null;
      if (!acActive && (fireAcOffMorning || fireAcOffEvening) && acIsOn) {
        try { await applyUpdate({ [acField]: 0 }); } catch {}
        if (acMorningFinished) markLastFire('acControl', 'off', acMKMorning, Date.now());
        if (acEveningFinished) markLastFire('acControl', 'off', acMKEvening, Date.now());
      } else if (acMorningFinished || acEveningFinished) {
        if (acMorningFinished) markLastFire('acControl', 'off', acMKMorning, getLastFire('acControl', 'off', acMKMorning) ?? Date.now());
        if (acEveningFinished) markLastFire('acControl', 'off', acMKEvening, getLastFire('acControl', 'off', acMKEvening) ?? Date.now());
      }
      // Headless no-flow auto OFF
      const noFlowEnabled = !!rules?.noFlow?.enabled;
      const noFlowDelaySec = Number(rules?.noFlow?.delaySec || 40);
      if (noFlowEnabled && isOn) {
        // #region debug-point D:no-flow-eval
        dbg('D', 'backgroundService.ts:evaluateAutomationRulesHeadless', 'No-flow eval', {
          deviceId,
          isOn,
          flow,
          threshold: NO_FLOW_THRESHOLD,
          delaySec: noFlowDelaySec,
        });
        // #endregion
        if (typeof flow === 'number' && isFinite(flow) && flow < NO_FLOW_THRESHOLD) {
          await scheduleNoFlowPending(deviceId, Math.max(1, noFlowDelaySec) * 1000);
        } else {
          await clearNoFlowPending(deviceId);
        }
      } else {
        await clearNoFlowPending(deviceId);
      }
      if (rulesChanged) {
        try { await AsyncStorage.setItem(`auto_rules_${deviceId}`, JSON.stringify(rules)); } catch {}
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
  if (endM >= startM) {
    return nowM >= startM && nowM <= endM;
  }
  // Overnight window (e.g., 22:00 -> 02:00)
  return nowM >= startM || nowM <= endM;
}

function isFinishedWindow(now: Date, frequency: string, start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false;
  if (frequency === 'once') {
    return now.getTime() > end.getTime();
  }
  const startM = start.getHours() * 60 + start.getMinutes();
  const endM = end.getHours() * 60 + end.getMinutes();
  const nowM = now.getHours() * 60 + now.getMinutes();
  if (endM >= startM) {
    return nowM > endM;
  }
  // Overnight: "finished" = we passed end minute AND we're no longer within the overnight window
  return nowM > endM && nowM < startM;
}

function windowKey(now: Date, freq: string, slot: 'morning' | 'evening', start: Date | null, end: Date | null): string {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (freq === 'once') {
    const s = start ? new Date(start.getTime()) : null;
    if (!s) return `${slot}:once:no-start`;
    return `${slot}:once:${ymd(s)}:${s.getHours()}-${s.getMinutes()}`;
  }
  const nowTs = now.getTime();
  const today00 = new Date(now);
  today00.setHours(0, 0, 0, 0);
  const ts00 = today00.getTime();
  const startT = start ? new Date(start.getTime()) : null;
  const endT = end ? new Date(end.getTime()) : null;
  const startMin = startT ? (startT.getHours() * 60 + startT.getMinutes()) : -1;
  const endMin = endT ? (endT.getHours() * 60 + endT.getMinutes()) : -1;
  let dayKey = ymd(now);
  if (endMin !== -1 && startMin !== -1 && endMin < startMin) {
    // Overnight window: any time after start tonight up to end tomorrow should share same key
    const nowMin = now.getHours() * 60 + now.getMinutes();
    if (nowMin <= endMin) {
      // It's the "tomorrow morning" portion of overnight — day key = yesterday
      const yesterday = new Date(nowTs - DAY_MS);
      dayKey = ymd(yesterday);
    }
  }
  return `${slot}:everyday:${dayKey}`;
}

export async function refreshAutomationSchedule(): Promise<void> {
  try {
    try { await scheduleNextAutomationTick(); } catch {}
    try { await scheduleNextPendingCommandsTick(); } catch {}
    try { await ensureForegroundServiceRunningIfNeeded(); } catch {}
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

  const DAY_MS = 24 * 60 * 60 * 1000;
  if (endToday >= startToday) {
    // Normal same-day window
    if (nowMs < startToday) return startToday;
    if (nowMs <= endToday) return endToday;
    return startToday + DAY_MS;
  }

  // Overnight window (e.g., 22:00 -> 02:00): startToday=22:00, endToday=02:00 < startToday
  // Logical: window starts at startToday, ends at endToday + DAY_MS (next day 02:00)
  const endTomorrow = endToday + DAY_MS;
  if (nowMs < endToday) {
    // Still within previous overnight window (before 02:00) — next boundary is endToday (02:00)
    return endToday;
  }
  if (nowMs < startToday) {
    // Between 02:00 and 22:00 — next boundary is startToday (22:00)
    return startToday;
  }
  // After 22:00 today — next boundary is endTomorrow (02:00 next day)
  return endTomorrow;
}

async function scheduleNextPendingCommandsTick(): Promise<void> {
  try {
    const now = Date.now();
    let earliest: number | null = null;
    try {
      const raw = await AsyncStorage.getItem(PENDING_DEVICE_COMMANDS_KEY);
      const list: any[] = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list) && list.length > 0) {
        for (const it of list) {
          if (it && typeof it?.dueAt === 'number' && isFinite(it.dueAt) && it.dueAt >= now) {
            if (earliest === null || it.dueAt < earliest) earliest = it.dueAt;
          }
        }
      }
    } catch {}
    try {
      const raw = await AsyncStorage.getItem(PENDING_LOCK_KEY);
      const list: any[] = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list) && list.length > 0) {
        for (const it of list) {
          if (it && typeof it?.dueAt === 'number' && isFinite(it.dueAt) && it.dueAt >= now) {
            if (earliest === null || it.dueAt < earliest) earliest = it.dueAt;
          }
        }
      }
    } catch {}
    try {
      const raw = await AsyncStorage.getItem(PENDING_NO_FLOW_KEY);
      const list: any[] = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list) && list.length > 0) {
        for (const it of list) {
          if (it && typeof it?.dueAt === 'number' && isFinite(it.dueAt) && it.dueAt >= now) {
            if (earliest === null || it.dueAt < earliest) earliest = it.dueAt;
          }
        }
      }
    } catch {}

    const existing = await AsyncStorage.getItem(DEVICE_COMMAND_SCHEDULE_AT_KEY);
    const existingAt = existing ? parseInt(existing, 10) : NaN;
    if (earliest === null) {
      try { await AsyncStorage.removeItem(DEVICE_COMMAND_SCHEDULE_AT_KEY); } catch {}
      return;
    }

    const SIGNIFICANT_DELTA_MS = 60 * 1000;
    const sig = typeof existingAt === 'number' && isFinite(existingAt)
      ? (Math.abs(existingAt - earliest) >= SIGNIFICANT_DELTA_MS)
      : true;
    if (!sig) return;

    await AsyncStorage.setItem(DEVICE_COMMAND_SCHEDULE_AT_KEY, String(earliest));
    const delay = Math.max(0, earliest - now);
    await bgScheduleTask({
      taskId: DEVICE_COMMAND_TASK_ID,
      delay,
      periodic: false,
      stopOnTerminate: false,
      enableHeadless: true,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
    });
  } catch {}
}

async function scheduleNextAutomationTick(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ruleKeys = keys.filter((k) => k.startsWith('auto_rules_'));
    const now = new Date();
    let nextAt: number | null = null;

    for (const [, value] of ruleKeys.length > 0 ? await AsyncStorage.multiGet(ruleKeys) : []) {
      if (!value) continue;
      let rules: any = null;
      try { rules = JSON.parse(value); } catch {}
      if (!rules) continue;

      const collect = (section: any) => {
        const enabled = !!section?.enabled;
        const freq = String(section?.frequency || 'everyday');
        const morningAt = nextBoundaryForWindow(
          now,
          !!section?.morningEnabled && enabled,
          freq,
          section?.morningStart ? new Date(section.morningStart) : null,
          section?.morningEnd ? new Date(section.morningEnd) : null
        );
        const eveningAt = nextBoundaryForWindow(
          now,
          !!section?.eveningEnabled && enabled,
          freq,
          section?.eveningStart ? new Date(section.eveningStart) : null,
          section?.eveningEnd ? new Date(section.eveningEnd) : null
        );
        return [morningAt, eveningAt].filter((x): x is number => typeof x === 'number' && isFinite(x));
      };

      const candidates = [
        ...collect(rules?.supplyWater),
        ...collect(rules?.wateringPlants),
        ...collect(rules?.dogFeed),
        ...collect(rules?.acControl),
      ];

      for (const c of candidates) {
        if (c <= now.getTime()) continue;
        if (nextAt === null || c < nextAt) nextAt = c;
      }
    }

    const nowTs = now.getTime();
    try {
      const raw = await AsyncStorage.getItem(PENDING_NO_FLOW_KEY);
      const list: any[] = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list)) {
        for (const it of list) {
          if (it && typeof it?.dueAt === 'number' && isFinite(it.dueAt) && it.dueAt > nowTs) {
            if (nextAt === null || it.dueAt < nextAt) nextAt = it.dueAt;
          }
        }
      }
    } catch {}
    try {
      const raw = await AsyncStorage.getItem(PENDING_LOCK_KEY);
      const list: any[] = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list)) {
        for (const it of list) {
          if (it && typeof it?.dueAt === 'number' && isFinite(it.dueAt) && it.dueAt > nowTs) {
            if (nextAt === null || it.dueAt < nextAt) nextAt = it.dueAt;
          }
        }
      }
    } catch {}

    if (nextAt === null) {
      try { await AsyncStorage.removeItem(AUTOMATION_SCHEDULE_AT_KEY); } catch {}
      return;
    }

    const existing = await AsyncStorage.getItem(AUTOMATION_SCHEDULE_AT_KEY);
    const existingAt = existing ? parseInt(existing, 10) : NaN;
    const SIGNIFICANT_DELTA_MS = 60 * 1000;
    const shouldReschedule = !(typeof existingAt === 'number' && isFinite(existingAt) && Math.abs(existingAt - nextAt) < SIGNIFICANT_DELTA_MS);
    if (!shouldReschedule) return;

    await AsyncStorage.setItem(AUTOMATION_SCHEDULE_AT_KEY, String(nextAt));
    const delay = Math.max(0, nextAt - nowTs);
    await bgScheduleTask({
      taskId: AUTOMATION_TASK_ID,
      delay,
      periodic: false,
      stopOnTerminate: false,
      enableHeadless: true,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
    });
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

export async function hasAnyActiveAutomationSchedules(): Promise<boolean> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ruleKeys = keys.filter((k) => k.startsWith('auto_rules_'));
    if (ruleKeys.length === 0) return false;
    const entries = await AsyncStorage.multiGet(ruleKeys);
    for (const [, value] of entries) {
      if (!value) continue;
      let rules: any = null;
      try { rules = JSON.parse(value); } catch {}
      if (!rules) continue;
      const checkSec = (sec: any) => {
        if (!sec) return false;
        if (!sec.enabled) return false;
        if (sec.morningEnabled || sec.eveningEnabled) return true;
        return false;
      };
      if (checkSec(rules?.supplyWater)) return true;
      if (checkSec(rules?.wateringPlants)) return true;
      if (checkSec(rules?.dogFeed)) return true;
      if (checkSec(rules?.acControl)) return true;
    }
  } catch {}
  try {
    const locks = await AsyncStorage.getItem(PENDING_LOCK_KEY);
    if (locks) {
      const list = JSON.parse(locks);
      if (Array.isArray(list) && list.length > 0) return true;
    }
  } catch {}
  try {
    const cmds = await AsyncStorage.getItem(PENDING_DEVICE_COMMANDS_KEY);
    if (cmds) {
      const list = JSON.parse(cmds);
      if (Array.isArray(list) && list.length > 0) return true;
    }
  } catch {}
  try {
    const noflow = await AsyncStorage.getItem(PENDING_NO_FLOW_KEY);
    if (noflow) {
      const list = JSON.parse(noflow);
      if (Array.isArray(list) && list.length > 0) return true;
    }
  } catch {}
  return false;
}

const verySleepyForegroundServiceTask = async (taskDataArguments?: any): Promise<void> => {
  await new Promise<void>(async (resolve) => {
    try {
      for (;;) {
        try {
          const delayMs = (taskDataArguments && typeof taskDataArguments?.delay === 'number') ? taskDataArguments.delay : 30000;
          await new Promise<void>((inner) => BackgroundTimer.setTimeout(() => inner(), delayMs));
          try { await runBackgroundPipeline('com.voodoosmart.foreground_tick'); } catch {}
        } catch {}
      }
    } finally {
      resolve();
    }
  });
};

export async function ensureForegroundServiceRunningIfNeeded(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    if (typeof BgActionsModule?.isRunning === 'function') {
      const running: boolean = await BgActionsModule.isRunning();
      foregroundActionRunning = !!running;
    }
  } catch {}
  const active = await hasAnyActiveAutomationSchedules();
  if (!active && foregroundActionRunning && typeof BgActionsModule?.stop === 'function') {
    try {
      await BgActionsModule.stop();
      foregroundActionRunning = false;
    } catch {}
    return;
  }
  if (!active) return;
  if (foregroundActionRunning) return;
  try {
    const options = {
      taskName: 'VooDooAutomation',
      taskTitle: 'VooDoo',
      taskDesc: 'Running device timers in background',
      taskIcon: { name: 'ic_launcher', type: 'mipmap' },
      color: '#0E7C7B',
      parameters: { delay: 15000 },
      linkingURI: 'voodoohomes2://shortcut',
    } as any;
    if (typeof BgActionsModule?.start === 'function') {
      await BgActionsModule.start(verySleepyForegroundServiceTask, options);
      foregroundActionRunning = true;
    }
  } catch {}
}

async function handleAppStateChange(next: AppStateStatus): Promise<void> {
  try {
    if (Platform.OS === 'android' && (next === 'background' || next === 'inactive')) {
      try { await ensureForegroundServiceRunningIfNeeded(); } catch {}
      try { await refreshAutomationSchedule(); } catch {}
    }
    if (next === 'active') {
      try { await refreshAutomationSchedule(); } catch {}
      try { await scheduleNextPendingCommandsTick(); } catch {}
    }
  } catch {}
}

async function foregroundMonitorTick(): Promise<void> {
  try {
    try { await runBackgroundPipeline('com.voodoosmart.foreground_interval_tick'); } catch {}
  } catch {}
}

export async function startAutomationMonitorForeground(): Promise<void> {
  try {
    if (foregroundMonitorIntervalRef != null) return;
    try {
      const anyActive = await hasAnyActiveAutomationSchedules();
      if (anyActive) try { await ensureForegroundServiceRunningIfNeeded(); } catch {}
    } catch {}
    foregroundMonitorIntervalRef = BackgroundTimer.setInterval(() => {
      foregroundMonitorTick().catch(() => {});
    }, 60 * 1000);
  } catch {}
}

export async function stopAutomationMonitorForeground(): Promise<void> {
  try {
    if (foregroundMonitorIntervalRef != null) {
      BackgroundTimer.clearInterval(foregroundMonitorIntervalRef);
      foregroundMonitorIntervalRef = null;
    }
    if (Platform.OS === 'android' && foregroundActionRunning && typeof BgActionsModule?.stop === 'function') {
      try {
        await BgActionsModule.stop();
        foregroundActionRunning = false;
      } catch {}
    }
  } catch {}
}
