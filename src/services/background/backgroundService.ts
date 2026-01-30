import BackgroundFetch from 'react-native-background-fetch';
import esp8266Service from '../esp8266/esp8266Service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundTimer from 'react-native-background-timer';

export async function initBackgroundDevicePolling() {
  try {
    await BackgroundFetch.configure(
      {
        minimumFetchInterval: 15,
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
  } catch {}
  BackgroundFetch.finish(event.taskId);
};

BackgroundFetch.registerHeadlessTask(BackgroundDeviceHeadless);

const PENDING_LOCK_KEY = 'pending_lock_auto_off';

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
      let pctRaw: any = state?.waterPercentage ?? state?.water_percent ?? state?.waterLevelPercent;
      if (pctRaw === undefined && state?.data) {
        pctRaw = state.data.waterPercentage ?? state.data.water_percent ?? state.data.waterLevelPercent;
      }
      let brRaw: any = state?.brightness ?? state?.value ?? state?.waterLevel;
      if (brRaw === undefined && state?.data) {
        brRaw = state.data.brightness ?? state.data.value ?? state.data.waterLevel;
      }
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
    }
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
    }, 10000);
  } catch {}
}
