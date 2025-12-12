import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL, OFFLINE_MODE } from '../../constants/constatantsV';
import { mockUsers } from '../mock/mockData';

class UserService {
  private baseUrl = `${BASE_URL}/users`;

  private async getAuthHeader() {
    const token = await AsyncStorage.getItem('auth_token');
    return { Authorization: `Bearer ${token}` };
  }

  async listUsers(search?: string) {
    if (OFFLINE_MODE) {
      const q = String(search || '').toLowerCase();
      const arr = mockUsers.filter(u => !q || (u.name.toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q)));
      return arr.map(u => ({ ...u }));
    }
    const headers = await this.getAuthHeader();
    const params = search ? { search } : {};
    const { data } = await axios.get(this.baseUrl, { headers, params });
    return data.data as Array<any>;
  }
}

export default new UserService();
