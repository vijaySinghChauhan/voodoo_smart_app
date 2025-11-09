import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import * as constantsV from '../../constants/constatantsV';

interface User {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  role?: 'user' | 'admin';
  phone?: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

class AuthService {
  //private baseUrl: string = 'http://localhost:3001/api/auth'; // Local API URL
    private  baseUrl: string = constantsV.BASE_URL+'/auth'; // Local API URL

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
      const response = await axios.post<AuthResponse>(`${this.baseUrl}/login`, {
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
      const response = await axios.post<AuthResponse>(`${this.baseUrl}/register`, {
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
      if (!this.token) {
        throw new Error('Not authenticated');
      }
      
      const response = await axios.put<User>(`${this.baseUrl}/updatedetails`, userData, {
        headers: {
          Authorization: `Bearer ${this.token}`
        }
      });
      
      const currentUser = await this.getCurrentUser();
      const updatedUser = { ...currentUser, ...response.data };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      
      return updatedUser;
    } catch (error) {
      console.error('Profile update failed:', error);
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
      return t;
    } catch (err) {
      console.error('Failed to read auth token:', err);
      return null;
    }
  }
}

export default new AuthService();
