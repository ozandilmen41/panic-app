import AsyncStorage from '@react-native-async-storage/async-storage';

export async function setJson(key: string, value: unknown) {
  const json = JSON.stringify(value);
  await AsyncStorage.setItem(key, json);
}

export async function getJson<T>(key: string): Promise<T | null> {
  const stored = await AsyncStorage.getItem(key);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as T;
  } catch {
    return null;
  }
}

export async function setBoolean(key: string, value: boolean) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function getBoolean(key: string): Promise<boolean | null> {
  const stored = await AsyncStorage.getItem(key);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as boolean;
  } catch {
    return null;
  }
}

