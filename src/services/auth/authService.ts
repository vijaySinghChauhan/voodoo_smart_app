import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as constantsV from '../../constants/constatantsV';
import configService from '../config/configService';
import { mockUser } from '../mock/mockData';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  profilePicture?: string;
  role?: 'user' | 'admin';
  phone?: string;
  beta?: number | string | boolean;
  tester?: number | string | boolean;
  token?: string;
  subdeviceIds?: string[];
  subscriptionType?: string;
  subscriptionStartDate?: string;
  subscriptionExpiryDate?: string;
  subscriptionId?: string | null;
}

interface AuthResponse {
  user: User;
  token: string;
}

interface UpdateUserResponse {
  success: boolean;
  user: User;
}

class AuthService {
  // Base URL is resolved dynamically via configService

  private token: string | null = null;
  
  constructor() {
    this.loadToken();
  }
  
  private async loadToken() {
    try {
      this.token = await AsyncStorage.getItem('auth_token');
    } catch (error) {
      console.error('Failed to load auth token:', error);
    }
  }
  
  private async saveToken(token: string) {
    try {
      await AsyncStorage.setItem('auth_token', token);
      this.token = token;
    } catch (error) {
      console.error('Failed to save auth token:', error);
    }
  }
  
  async login(email: string, password: string): Promise<User> {
    try {
      // Offline mode: accept mock credentials and return mock user
      if ((constantsV as any).OFFLINE_MODE) {
        const { email: mockEmail, password: mockPass } = (constantsV as any).MOCK_CREDENTIALS || {};
        if (email === mockEmail && password === mockPass) {
          await this.saveToken((constantsV as any).MOCK_TOKEN || 'mock-token');
          await AsyncStorage.setItem('user', JSON.stringify(mockUser));
          return mockUser as User;
        }
        // If wrong creds in offline, throw an error similar to server
        throw new Error('Invalid credentials (offline)');
      }
      const loginUrl = (constantsV as any).API_ENDPOINTS?.LOGIN || '';
      console.log('[Auth] Calling login API:', loginUrl);
      const response = await axios.post<AuthResponse>(loginUrl, {
        email,
        password
      });
   //   Alert.alert(JSON.stringify(response.data))
      
      await this.saveToken(response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      
      return response.data.user;
    } catch (error) {
   //   Alert.alert(JSON.stringify(error))

      console.error('Login failed:', error);
      throw error;
    }
  }
  
  async signup(name: string, email: string, password: string, phone?: string, role: 'user' | 'admin' = 'user'): Promise<User> {
    try {
      if ((constantsV as any).OFFLINE_MODE) {
        const offlineUser: User = {
          id: 'u_local',
          name: name || mockUser.name,
          email: email || mockUser.email,
          role,
          phone,
        } as any;
        await this.saveToken((constantsV as any).MOCK_TOKEN || 'mock-token');
        await AsyncStorage.setItem('user', JSON.stringify(offlineUser));
        return offlineUser;
      }
      const baseUrl = await configService.getBaseUrl();
      const response = await axios.post<AuthResponse>(`${baseUrl}/auth/register`, {
        name,
        email,
        password,
        phone,
        role
      });
      
      await this.saveToken(response.data.token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
      
      return response.data.user;
    } catch (error) {
      console.error('Signup failed:', error);
      throw error;
    }
  }
  
  async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user');
      this.token = null;
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }
  
  async getCurrentUser(): Promise<User | null> {
    try {
      const userJson = await AsyncStorage.getItem('user');
      if (userJson) {
        return JSON.parse(userJson);
      }
      return null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }
  
  async updateProfile(userData: Partial<User>): Promise<User> {
    try {
      if ((constantsV as any).OFFLINE_MODE) {
        const currentUser = await this.getCurrentUser();
        const updatedUser = { ...(currentUser || mockUser), ...userData } as User;
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        return updatedUser;
      }
      if (!this.token) {
        throw new Error('Not authenticated');
      }
      
      const baseUrl = await configService.getBaseUrl();
      const response = await axios.put<UpdateUserResponse>(`${baseUrl}/auth/updatedetails`, userData, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });
      
      const currentUser = await this.getCurrentUser();
      const updatedUser = { ...(currentUser || {}), ...(response.data?.user || {}) } as User;
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  }
  
  async uploadAvatar(uri: string): Promise<User> {
    try {
      if ((constantsV as any).OFFLINE_MODE) {
        const currentUser = await this.getCurrentUser();
        const updatedUser = { ...(currentUser || mockUser), avatar: uri, profilePicture: uri } as User;
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
        return updatedUser;
      }
      const token = await this.getToken();
      if (!token) {
        throw new Error('Not authenticated');
      }
      const baseUrl = await configService.getBaseUrl();
      const form: any = new FormData();
      const name = 'avatar.jpg';
      form.append('avatar', { uri, name, type: 'image/jpeg' } as any);
      const response = await axios.put<UpdateUserResponse>(`${baseUrl}/auth/updateavatar`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      const updatedUser = response.data?.user as User;
      if (updatedUser) {
        await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      }
      return updatedUser;
    } catch (error) {
      console.error('Avatar upload failed:', error);
      throw error;
    }
  }
  
  isAuthenticated(): boolean {
    return !!this.token;
  }

  // Expose current JWT for non-HTTP clients (e.g., Socket.IO)
  async getToken(): Promise<string | null> {
    if (this.token) return this.token;
    try {
      const t = await AsyncStorage.getItem('auth_token');
      this.token = t;
      if ((constantsV as any).OFFLINE_MODE) {
        return (constantsV as any).MOCK_TOKEN || 'mock-token';
      }
      return t;
    } catch (err) {
      console.error('Failed to read auth token:', err);
      return null;
    }
  }
}

export default new AuthService();
