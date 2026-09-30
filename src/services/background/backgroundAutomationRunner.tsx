import { Platform } from 'react-native';
import {
  initBackgroundDevicePolling,
  startAutomationMonitorForeground,
  refreshAutomationSchedule,
  evaluateAutomationRulesHeadless,
  processPendingDeviceCommands,
  processPendingLockAutoOff,
  processPendingNoFlowAutoOff,
} from './backgroundService';

export async function startAutomationBackgroundService(): Promise<void> {
  try {
    await initBackgroundDevicePolling();
    try { await refreshAutomationSchedule(); } catch {}
    startAutomationMonitorForeground();
  } catch (error) {
    if (__DEV__) {
      console.error('[backgroundAutomationRunner] startAutomationBackgroundService failed:', error);
    }
  }
}

export async function runBackgroundAutomation(): Promise<void> {
  if (__DEV__) {
    console.log('[BackgroundAutomation] Started on', Platform.OS, 'at', new Date().toISOString());
  }
  try {
    try { await processPendingDeviceCommands(); } catch {}
    try { await evaluateAutomationRulesHeadless(); } catch {}
    try { await processPendingLockAutoOff(); } catch {}
    try { await processPendingNoFlowAutoOff(); } catch {}
    try { await refreshAutomationSchedule(); } catch {}
  } catch (error) {
    console.error('[BackgroundAutomation] Error:', error);
  }
  if (__DEV__) {
    console.log('[BackgroundAutomation] Completed at', new Date().toISOString());
  }
}

export {
  initBackgroundDevicePolling,
  startAutomationMonitorForeground,
  refreshAutomationSchedule,
};
