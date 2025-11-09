import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../constants/constatantsV';

class UserService {
  private baseUrl = `${BASE_URL}/users`;

  private async getAuthHeader() {
    const token = await AsyncStorage.getItem('auth_token');
    return { Authorization: `Bearer ${token}` };
  }

  async listUsers(search?: string) {
    const headers = await this.getAuthHeader();
    const params = search ? { search } : {};
    const { data } = await axios.get(this.baseUrl, { headers, params });
    return data.data as Array<any>;
  }
}

export default new UserService();

