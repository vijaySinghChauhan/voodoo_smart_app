import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import configService from '../config/configService';

class AdminService {
  private async getBaseUrl() {
    return `${await configService.getBaseUrl()}/admin`;
  }

  private async getAuthHeader() {
    const token = await AsyncStorage.getItem('auth_token');
    return { Authorization: `Bearer ${token}` };
  }

  async listUsers(search?: string) {
    const headers = await this.getAuthHeader();
    const params = search ? { search } : {};
    const baseUrl = await this.getBaseUrl();
    const { data } = await axios.get(`${baseUrl}/users`, { headers, params });
    return data.data as Array<any>;
  }

  async getUserRooms(userId: string) {
    const headers = await this.getAuthHeader();
    const baseUrl = await this.getBaseUrl();
    const { data } = await axios.get(`${baseUrl}/users/${userId}/rooms`, { headers });
    return data.data as Array<any>;
  }

  async getUserDevices(userId: string, roomId?: string) {
    const headers = await this.getAuthHeader();
    const params = roomId ? { roomId } : {};
    const baseUrl = await this.getBaseUrl();
    const { data } = await axios.get(`${baseUrl}/users/${userId}/devices`, { headers, params });
    const items = (data?.data || []) as Array<any>;
    return items.map((d) => ({
      ...d,
      id: String(d.id ?? d._id ?? ''),
      roomId: String(d.roomId ?? d.room_id ?? ''),
      roomName: String(d.roomName ?? ''),
      deviceType: String(d.deviceType ?? d.device_type ?? ''),
      isOn: typeof d.isOn === 'number' ? (Number(d.isOn) === 1) : !!d.isOn,
      macAddress: String(d.macAddress ?? d.mac_address ?? ''),
      ip: String(d.ip ?? d.ipAddress ?? d.ip_address ?? ''),
      ssid: String(d.ssid ?? ''),
      device1: typeof d.device1 === 'number' ? d.device1 : (typeof d.device1 === 'boolean' ? (d.device1 ? 1 : 0) : 0),
      device2: typeof d.device2 === 'number' ? d.device2 : (typeof d.device2 === 'boolean' ? (d.device2 ? 1 : 0) : 0),
      device3: typeof d.device3 === 'number' ? d.device3 : (typeof d.device3 === 'boolean' ? (d.device3 ? 1 : 0) : 0),
      device4: typeof d.device4 === 'number' ? d.device4 : (typeof d.device4 === 'boolean' ? (d.device4 ? 1 : 0) : 0),
      device5: typeof d.device5 === 'number' ? d.device5 : (typeof d.device5 === 'boolean' ? (d.device5 ? 1 : 0) : 0),
      subscriptionActive: typeof d.subscriptionActive !== 'undefined' ? Number(d.subscriptionActive) : (
        typeof d.subscription !== 'undefined' ? Number(d.subscription) : 0
      ),
      subscriptionEndDate: d.subscriptionEndDate ?? d.subscriptionEnd ?? d.subscription_last_date ?? null,
    }));
  }

  async getStats() {
    const headers = await this.getAuthHeader();
    const baseUrl = await this.getBaseUrl();
    const { data } = await axios.get(`${baseUrl}/stats`, { headers });
    return data as any;
  }

  async getUser(userId: string) {
    const headers = await this.getAuthHeader();
    const baseUrl = await this.getBaseUrl();
    const { data } = await axios.get(`${baseUrl}/users/${userId}`, { headers });
    return (data?.data ?? data?.user ?? data) as any;
  }

  async updateUser(userId: string, payload: Partial<{
    name: string;
    email: string;
    phone: string;
    role: 'user' | 'admin';
    tester?: boolean | number;
    beta?: boolean | number;
    subscriptionType?: string;
    subscriptionId?: string | null;
    subdeviceIds?: string[]; 
    sharedAccessEnabled?: boolean | number;
    planId?: string | null;
  }>) {
    const headers = await this.getAuthHeader();
    const baseUrl = await this.getBaseUrl();
    const body: any = { ...payload };
    if (typeof body.tester !== 'undefined') {
      body.tester = typeof body.tester === 'boolean' ? (body.tester ? 1 : 0) : body.tester;
    }
    if (typeof body.beta !== 'undefined') {
      body.beta = typeof body.beta === 'boolean' ? (body.beta ? 1 : 0) : body.beta;
    }
    if (typeof body.sharedAccessEnabled !== 'undefined') {
      body.sharedAccessEnabled = typeof body.sharedAccessEnabled === 'boolean' ? (body.sharedAccessEnabled ? 1 : 0) : body.sharedAccessEnabled;
    }
    if (Array.isArray(body.subdeviceIds)) {
      body.subdeviceIds = body.subdeviceIds.map((s:any)=>String(s));
    }
    const { data } = await axios.put(`${baseUrl}/users/${userId}`, body, { headers });
    return (data?.data ?? data?.user ?? data) as any;
  }

  async updateDevice(deviceId: string, payload: Record<string, any>) {
    const headers = await this.getAuthHeader();
    const baseUrl = await this.getBaseUrl();
    const body: any = { ...payload };
    if (typeof body.isConnected !== 'undefined') {
      body.isConnected = typeof body.isConnected === 'boolean' ? (body.isConnected ? 1 : 0) : body.isConnected;
    }
    if (typeof body.isOn !== 'undefined') {
      body.isOn = typeof body.isOn === 'boolean' ? (body.isOn ? 1 : 0) : body.isOn;
    }
    ['device1','device2','device3','device4','device5'].forEach((k) => {
      if (typeof body[k] !== 'undefined') {
        body[k] = typeof body[k] === 'boolean' ? (body[k] ? 1 : 0) : body[k];
      }
    });
    const { data } = await axios.put(`${baseUrl}/devices/${deviceId}`, body, { headers });
    return (data?.data ?? data) as any;
  }
}

export default new AdminService();
