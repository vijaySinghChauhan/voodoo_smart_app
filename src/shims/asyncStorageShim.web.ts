type AsyncStorageValue = string | null;

const storage = {
  async getItem(key: string): Promise<AsyncStorageValue> {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {}
  },
  async removeItem(key: string): Promise<void> {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {}
  },
  async clear(): Promise<void> {
    try {
      window.localStorage.clear();
    } catch (e) {}
  },
  async getAllKeys(): Promise<string[]> {
    try {
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k) keys.push(k);
      }
      return keys;
    } catch (e) {
      return [];
    }
  },
};

export default storage;

