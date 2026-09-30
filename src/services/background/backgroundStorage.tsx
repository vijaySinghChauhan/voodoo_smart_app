import AsyncStorage from '@react-native-async-storage/async-storage';

export type BackgroundSchedule = {
  enabled: boolean;
  startTime: string; // HH:mm
  stopTime: string; // HH:mm
};

const STORAGE_KEY = '@background_schedule';

const DEFAULT_SCHEDULE: BackgroundSchedule = {
  enabled: true,
  startTime: '08:00',
  stopTime: '22:00',
};

export async function saveSchedule(
  schedule: BackgroundSchedule,
): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(schedule),
  );
}

export async function getSchedule(): Promise<BackgroundSchedule> {
  const value = await AsyncStorage.getItem(STORAGE_KEY);

  if (!value) {
    return DEFAULT_SCHEDULE;
  }

  try {
    return JSON.parse(value);
  } catch {
    return DEFAULT_SCHEDULE;
  }
}

export async function clearSchedule(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}