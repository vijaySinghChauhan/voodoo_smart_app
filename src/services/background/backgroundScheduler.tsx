import {
  NativeModules,
  Platform,
} from 'react-native';

import {
  BackgroundSchedule,
  saveSchedule,
} from './backgroundStorage';

const {BackgroundScheduler} = NativeModules;

export async function scheduleBackgroundService(
  schedule: BackgroundSchedule,
): Promise<void> {

  await saveSchedule(schedule);

  if (Platform.OS === 'android') {
    await BackgroundScheduler.schedule(
      schedule.startTime,
      schedule.stopTime,
    );
  }

  if (Platform.OS === 'ios') {
    await BackgroundScheduler.schedule(
      schedule.startTime,
      schedule.stopTime,
    );
  }
}

export async function startBackgroundService(): Promise<void> {

  if (Platform.OS === 'android') {
    await BackgroundScheduler.start();
  }

  if (Platform.OS === 'ios') {
    await BackgroundScheduler.start();
  }
}

export async function stopBackgroundService(): Promise<void> {

  if (Platform.OS === 'android') {
    await BackgroundScheduler.stop();
  }

  if (Platform.OS === 'ios') {
    await BackgroundScheduler.stop();
  }
}