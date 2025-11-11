import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import authService from '../auth/authService';
import * as constantsV from '../../constants/constatantsV';

interface ESP8266Config {
  ssid: string;
  password: string;
  deviceIP?: string;
}

interface DeviceStatus {
  connected: boolean;
  ssid?: string;
  ip?: string;
  macAddress?: string;
  powerState?: 'on' | 'off';
  firmwareVersion?: string;
  lastUpdated?: string;
  energyUsage?: number;
}

class ESP8266Service {

  // Separate bases for server API and device HTTP
  private apiBaseUrl: string = constantsV.BASE_URL;
  private deviceHttpBaseUrl: string | null = null;
  private isConnected: boolean = false;
  private deviceName: string = '';
  
  // Store the last known IP of the ESP8266 device
  async setDeviceIP(ip: string): Promise<void> {
    // Ensure protocol for device direct calls
    const withProto = ip.startsWith('http') ? ip : `http://${ip}`;
    this.deviceHttpBaseUrl = withProto;
    await AsyncStorage.setItem('ESP8266_IP', ip);
  }
  
  // Retrieve the last known IP
  async getDeviceIP(): Promise<string | null> {
    const ip = await AsyncStorage.getItem('ESP8266_IP');
    //const ip = '192.168.4.1';

  
    return ip;
  }

  // Set device name
  async setDeviceName(name: string): Promise<void> {
    this.deviceName = name;
    await AsyncStorage.setItem('ESP8266_NAME', name);
  }

  // Get device name
  async getDeviceName(): Promise<string | null> {
    const name = await AsyncStorage.getItem('ESP8266_NAME');
    if (name) {
      this.deviceName = name;
      return name;
    }
    return null;
  }
  
  // Check if the ESP8266 is reachable
  async checkConnection(): Promise<boolean> {
    try {
      if (!this.deviceHttpBaseUrl) {
        const ip = await this.getDeviceIP();
        if (!ip) return false;
        this.deviceHttpBaseUrl = ip.startsWith('http') ? ip : `http://${ip}`;
      }
      
      // Increase timeout from 5000 to 10000 (10 seconds)
      const response = await axios.get(`${this.deviceHttpBaseUrl}/status`, { timeout: 10000 });
      this.isConnected = response.status === 200;
      return this.isConnected;
    } catch (error) {
      console.error('Failed to connect to ESP8266:', error);
      this.isConnected = false;
      return false;
    }
  }
  
  // Configure WiFi on the ESP8266
  async configureWiFi(config: ESP8266Config): Promise<boolean> {
    try {
      // Prefer provided device IP; otherwise keep existing base or default to SoftAP
      if (config.deviceIP) {
        await this.setDeviceIP(config.deviceIP);
      }
      
      // Default to ESP SoftAP when no explicit IP provided
      if (!this.deviceHttpBaseUrl) {
        this.deviceHttpBaseUrl = 'http://'+ config.deviceIP;
      }

      // ESP8266 sketch expects POST /connect with form fields: ssid and pass
      const formBody = new URLSearchParams({
        ssid: config.ssid,
        pass: config.password
      }).toString();
      const response = await axios.post(
        `${this.deviceHttpBaseUrl}/connect`,
        formBody,
        {
          timeout: 30000,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );
      
      return response.status === 200;
    } catch (error) {
      console.error('Failed to configure WiFi on ESP8266:', error);
      return false;
    }
  }
  
  // Reset the ESP8266 device
  async resetDevice(): Promise<boolean> {
    try {
      if (!this.deviceHttpBaseUrl) {
        const ip = await this.getDeviceIP();
        if (!ip) return false;
        this.deviceHttpBaseUrl = ip.startsWith('http') ? ip : `http://${ip}`;
      }
      
      const response = await axios.post(`${this.deviceHttpBaseUrl}/reset`, {}, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.error('Failed to reset ESP8266:', error);
      return false;
    }
  }
  
  // Get the status of the ESP8266
  async getDeviceStatus(): Promise<DeviceStatus> {
    try {
      if (!this.deviceHttpBaseUrl) {
        const ip = await this.getDeviceIP();
        if (!ip) throw new Error('Device IP not set');
        this.deviceHttpBaseUrl = ip.startsWith('http') ? ip : `http://${ip}`;
      }
      
      const response = await axios.get(`${this.deviceHttpBaseUrl}/status`, { timeout: 5000 });
      return response.data;
    } catch (error) {
      console.error('Failed to get ESP8266 status:', error);
      throw error;
    }
  }
  
  // Disable the ESP8266 device
  async disableDevice(): Promise<boolean> {
    try {
      if (!this.deviceHttpBaseUrl) {
        const ip = await this.getDeviceIP();
        if (!ip) return false;
        this.deviceHttpBaseUrl = ip.startsWith('http') ? ip : `http://${ip}`;
      }
      
      const response = await axios.post(`${this.deviceHttpBaseUrl}/disable`, {}, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.error('Failed to disable ESP8266:', error);
      return false;
    }
  }

  // Turn the device on
  async turnOn(): Promise<boolean> {
    try {
      if (!this.deviceHttpBaseUrl) {
        const ip = await this.getDeviceIP();
        if (!ip) return false;
        this.deviceHttpBaseUrl = ip.startsWith('http') ? ip : `http://${ip}`;
      }
      const response = await axios.get(`${this.deviceHttpBaseUrl}/switch?state=on`, { timeout: 5000 });
      return response.status === 200 || response.status === 204;
    } catch (error) {
      console.error('Failed to turn on ESP8266:', error);
      return false;
    }
  }

  // Turn the device off
  async turnOff(): Promise<boolean> {
    try {
      if (!this.deviceHttpBaseUrl) {
        const ip = await this.getDeviceIP();
        if (!ip) return false;
        this.deviceHttpBaseUrl = ip.startsWith('http') ? ip : `http://${ip}`;
      }
      const response = await axios.get(`${this.deviceHttpBaseUrl}/switch?state=off`, { timeout: 5000 });
      return response.status === 200 || response.status === 204;
    } catch (error) {
      console.error('Failed to turn off ESP8266:', error);
      return false;
    }
  }

  // Generic switch API
  async switchState(state: 'on' | 'off'): Promise<boolean> {
    try {
      if (!this.deviceHttpBaseUrl) {
        const ip = await this.getDeviceIP();
        if (!ip) return false;
        this.deviceHttpBaseUrl = ip.startsWith('http') ? ip : `http://${ip}`;
      }
      const response = await axios.get(`${this.deviceHttpBaseUrl}/switch?state=${state}`, { timeout: 5000 });
      return response.status === 200 || response.status === 204;
    } catch (error) {
      console.error(`Failed to switch state to ${state}:`, error);
      return false;
    }
  }

  // Explicit wrappers for requested APIs
  async status(): Promise<DeviceStatus> {
    return this.getDeviceStatus();
  }

  async configure(payload: ESP8266Config): Promise<boolean> {
    return this.configureWiFi(payload);
  }

  async reset(): Promise<boolean> {
    return this.resetDevice();
  }

  async disable(): Promise<boolean> {
    return this.disableDevice();
  }

  async energy(): Promise<{daily: number, weekly: number, monthly: number}> {
    return this.getEnergyUsage();
  }

  // Discover ESP8266 devices on the network
  async discoverDevices(): Promise<Array<{ip: string, name: string}>> {
    // In a real implementation, you would send a request to the ESP8266 to discover devices on the network
    // For demo purposes, we'll return mock data
    console.log('Discovering devices...');
    // For demo purposes, we'll return mock data
    
    
    return [
      { ip: '192.168.1.100', name: 'Living Room Light' },

    ];
  }

  // Get energy usage data
  async getEnergyUsage(): Promise<{daily: number, weekly: number, monthly: number}> {
    try {
      if (!this.deviceHttpBaseUrl) {
        const ip = await this.getDeviceIP();
        if (!ip) throw new Error('Device IP not set');
        this.deviceHttpBaseUrl = ip.startsWith('http') ? ip : `http://${ip}`;
      }
      
      const response = await axios.get(`${this.deviceHttpBaseUrl}/energy`, { timeout: 5000 });
      return response.data;
    } catch (error) {
      console.error('Failed to get energy usage data:', error);
      // Return mock data for demo
      return {
        daily: 1.2,
        weekly: 8.5,
        monthly: 32.7
      };
    }
  }
  
  // Get all devices (both assigned and unassigned)
  async getAllDevices(): Promise<Array<{
    status: string;
    id: string;
    name: string;
    deviceType?: string;
    isOn?: boolean;
    room?: string | null;
  }>> {
    try {
      // Fetch devices from backend API
      const devices = await this.getDevicesFromServer();
      return devices;
    } catch (error) {
      console.error('Failed to get all devices:', error);
      return [];
    }
  }
  
  // Get unassigned devices (devices not assigned to any room)
  async getUnassignedDevices(): Promise<Array<{
    id: string;
    name: string;
    deviceType?: string;
    isOn?: boolean;
    room?: string | null;
  }>> {
    try {
      const allDevices = await this.getDevicesFromServer();
      return allDevices.filter((device: any) => !device.room);
    } catch (error) {
      console.error('Failed to get unassigned devices:', error);
      return [];
    }
  }

  // Set device power state
  async setDevicePowerState(deviceId: string, state: 'on' | 'off'): Promise<boolean> {
    try {
      // In a real implementation, you would send a request to the device or your backend
      // For demo purposes, we'll just return success
      console.log(`Setting device ${deviceId} power state to ${state}`);
      return true;
    } catch (error) {
      console.error(`Failed to set device ${deviceId} power state:`, error);
      return false;
    }
  }

  // ===== Backend API helpers =====
  async getDevicesFromServer(): Promise<any[]> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${this.apiBaseUrl}/devices`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return response.data?.data || [];
    } catch (error) {
      console.error('Failed to get devices from server:', error);
      return [];
    }
  }

  async getDeviceStateFromServer(deviceId: string): Promise<any | null> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${this.apiBaseUrl}/devices/${deviceId}/state`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return response.data?.data || null;
    } catch (error) {
      console.error('Failed to get device state from server:', error);
      return null;
    }
  }

  async getDeviceBrightnessFromServer(deviceId: string): Promise<number | null> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${this.apiBaseUrl}/devices/${deviceId}/brightness`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      const data = response.data?.data;
      if (typeof data?.brightness === 'number' && isFinite(data.brightness)) {
        const clamped = Math.max(0, Math.min(100, data.brightness));
        return data?.brightness;
      }
      return null;
    } catch (error) {
      console.error('Failed to get device brightness from server:', error);
      return null;
    }
  }

  async controlDeviceOnServer(deviceId: string, action: 'on' | 'off' | 'toggle', brightness?: number): Promise<boolean> {
    try {
      const token = (await authService.getToken()) || (await AsyncStorage.getItem('auth_token')) || undefined;
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const payload: any = { action };
      if (typeof brightness === 'number' && isFinite(brightness)) {
        payload.brightness =  brightness;
      }
      const url = `${this.apiBaseUrl}/devices/${deviceId}/control`;
      const response = await axios.post(url, payload, {
        headers,
        timeout: 10000,
      });
      return response.status === 200;
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || String(error);
      console.error('Failed to control device on server:', msg);
      return false;
    }
  }

  async getDeviceFromServer(deviceId: string): Promise<any | null> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${this.apiBaseUrl}/devices/${deviceId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return response.data?.data || null;
    } catch (error) {
      console.error('Failed to get device from server:', error);
      return null;
    }
  }

  async getDevicesByRoom(roomId: string): Promise<any[]> {
    try {
      const devices = await this.getDevicesFromServer();
      return devices.filter((d: any) => String(d.room) === String(roomId));
    } catch (error) {
      console.error('Failed to get devices by room from server:', error);
      return [];
    }
  }

  async assignDeviceToRoom(deviceId: string, roomId: string): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.put(`${this.apiBaseUrl}/devices/${deviceId}`, { room: roomId }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return response.status === 200;
    } catch (error) {
      console.error('Failed to assign device to room:', error);
      return false;
    }
  }

  async updateDeviceOnServer(deviceId: string, payload: Record<string, any>): Promise<boolean> {
    try {
      if (!deviceId) {
        console.error('Failed to update device on server: missing deviceId');
        return false;
      }
      const token = await authService.getToken();
      if (!token) {
        console.error('Failed to update device on server: missing auth token');
        return false;
      }
      const response = await axios.put(`${this.apiBaseUrl}/devices/${deviceId}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });
      return response.status >= 200 && response.status < 300;
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      const message = typeof data?.message === 'string' ? data.message : undefined;
      console.error(
        `Failed to update device on server: ${status || 'network/error'}${message ? ` - ${message}` : ''}`,
        data || error
      );
      return false;
    }
  }

  async unassignDeviceFromRoom(deviceId: string): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.put(`${this.apiBaseUrl}/devices/${deviceId}`, { room: null }, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      return response.status === 200;
    } catch (error) {
      console.error('Failed to unassign device from room:', error);
      return false;
    }
  }
}

export default new ESP8266Service();
