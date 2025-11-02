import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

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

  private baseUrl: string = '192.168.4.1';
  private isConnected: boolean = false;
  private deviceName: string = '';
  
  // Store the last known IP of the ESP8266 device
  async setDeviceIP(ip: string): Promise<void> {
    this.baseUrl = `http://${ip}`;
    await AsyncStorage.setItem('ESP8266_IP', ip);
  }
  
  // Retrieve the last known IP
  async getDeviceIP(): Promise<string | null> {
   // const ip = await AsyncStorage.getItem('ESP8266_IP');
    const ip = '192.168.4.1';

    if (ip) {
      this.baseUrl = `http://${ip}`;
      return ip;
    }
    return null;
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
      if (!this.baseUrl) {
        const ip = await this.getDeviceIP();
        if (!ip) return false;
      }
      
      // Increase timeout from 5000 to 10000 (10 seconds)
      const response = await axios.get(`${this.baseUrl}/status`, { timeout: 10000 });
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
 
      if (!this.baseUrl && !config.deviceIP) {
        throw new Error('Device IP not set');
      }
      
      if (config.deviceIP) {
        await this.setDeviceIP(config.deviceIP);
      }
      
      const response = await axios.post(`${this.baseUrl}/configure`, {
        ssid: config.ssid,
        password: config.password
      }, { timeout: 30000 }); // Increased timeout to 30 seconds
      
      return response.status === 200;
    } catch (error) {
      console.error('Failed to configure WiFi on ESP8266:', error);
      return false;
    }
  }
  
  // Reset the ESP8266 device
  async resetDevice(): Promise<boolean> {
    try {
      if (!this.baseUrl) {
        const ip = await this.getDeviceIP();
        if (!ip) return false;
      }
      
      const response = await axios.post(`${this.baseUrl}/reset`, {}, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.error('Failed to reset ESP8266:', error);
      return false;
    }
  }
  
  // Get the status of the ESP8266
  async getDeviceStatus(): Promise<DeviceStatus> {
    try {
      if (!this.baseUrl) {
        const ip = await this.getDeviceIP();
        if (!ip) throw new Error('Device IP not set');
      }
      
      const response = await axios.get(`${this.baseUrl}/status`, { timeout: 5000 });
      return response.data;
    } catch (error) {
      console.error('Failed to get ESP8266 status:', error);
      throw error;
    }
  }
  
  // Disable the ESP8266 device
  async disableDevice(): Promise<boolean> {
    try {
      if (!this.baseUrl) {
        const ip = await this.getDeviceIP();
        if (!ip) return false;
      }
      
      const response = await axios.post(`${this.baseUrl}/disable`, {}, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.error('Failed to disable ESP8266:', error);
      return false;
    }
  }

  // Turn the device on
  async turnOn(): Promise<boolean> {
    try {
      // if (!this.baseUrl) {
      //   const ip = await this.getDeviceIP();
      //   if (!ip) return false;
      // }
      
      // const response = await axios.post(`${this.baseUrl}/power`, { state: 'on' }, { timeout: 5000 });
      const response = await axios.post(`http://192.168.4.1/switch?state=on`,{ timeout: 5000 });

      return response.status === 200;
    } catch (error) {
      console.error('Failed to turn on ESP8266:', error);
      return false;
    }
  }

  // Turn the device off
  async turnOff(): Promise<boolean> {
    try {
      // if (!this.baseUrl) {
      //   const ip = await this.getDeviceIP();
      //   if (!ip) return false;
      // }
        
      // const response = await axios.post(`${this.baseUrl}/power`, { state: 'off' }, { timeout: 5000 });
      const response = await axios.post(`${this.baseUrl}/switch?state=off`, { state: 'off' }, { timeout: 5000 });

      return response.status === 200;
    } catch (error) {
      console.error('Failed to turn off ESP8266:', error);
      return false;
    }
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
      if (!this.baseUrl) {
        const ip = await this.getDeviceIP();
        if (!ip) throw new Error('Device IP not set');
      }
      
      const response = await axios.get(`${this.baseUrl}/energy`, { timeout: 5000 });
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
    id: string;
    name: string;
    type: string;
    status: 'on' | 'off';
    roomId: string | null;
  }>> {
    try {
      // In a real implementation, you would fetch this data from your backend or local storage
      // For demo purposes, we'll return mock data
      return [
        { id: '1', name: 'Living Room Light', type: 'Light', status: 'on', roomId: 'room1' },
    ];
    } catch (error) {
      console.error('Failed to get all devices:', error);
      return [];
    }
  }
  
  // Get unassigned devices (devices not assigned to any room)
  async getUnassignedDevices(): Promise<Array<{
    id: string;
    name: string;
    type: string;
    status: 'on' | 'off';
    roomId: string | null;
  }>> {
    try {
      const allDevices = await this.getAllDevices();
      return allDevices.filter(device => device.roomId === null);
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
}

export default new ESP8266Service();