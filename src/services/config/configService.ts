import AsyncStorage from '@react-native-async-storage/async-storage';
import * as constantsV from '../../constants/constatantsV';

const KEY_API_BASE_URL = 'api_base_url';

let cachedBaseUrl: string | null = null;

class ConfigService {
  async getBaseUrl(): Promise<string> {
    if (cachedBaseUrl) return cachedBaseUrl;
    try {
      const stored = await AsyncStorage.getItem(KEY_API_BASE_URL);
      cachedBaseUrl = stored || constantsV.BASE_URL;
      return cachedBaseUrl;
    } catch (err) {
      return constantsV.BASE_URL;
    }
  }

  async setBaseUrl(url: string): Promise<void> {
    cachedBaseUrl = url;
    try {
      await AsyncStorage.setItem(KEY_API_BASE_URL, url);
    } catch (err) {
      // ignore persistence failure
    }
  }
}

export default new ConfigService();
