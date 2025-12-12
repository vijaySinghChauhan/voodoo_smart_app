import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as constantsV from '../../constants/constatantsV';
import { mockRooms, mockDevices } from '../mock/mockData';

interface Device {
  id: string;
  name: string;
  type: string;
  status: 'on' | 'off';
}

interface Room {
  id: string;
  name: string;
  deviceCount: number;
  devices?: Device[];
}

class RoomService {
  storageKey: any;
  createRoom(room: String) {
  
  }
  // private baseUrl: string = 'http://localhost:3001/api/rooms';
  private baseUrl: string = constantsV.BASE_URL+'/rooms';
  async getRooms(): Promise<Room[]> {
    if ((constantsV as any).OFFLINE_MODE) {
      // Persist a local copy so add/edit/delete work in offline mode
      const existing = await AsyncStorage.getItem('rooms_offline');
      if (existing) return JSON.parse(existing);
      await AsyncStorage.setItem('rooms_offline', JSON.stringify(mockRooms));
      return mockRooms as any;
    }
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get<Room[]>(this.baseUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to get rooms:', error);
      return [];
    }
  }

  async getRoomById(roomId: string): Promise<Room | null> {
    if ((constantsV as any).OFFLINE_MODE) {
      const roomsJson = await AsyncStorage.getItem('rooms_offline');
      const arr: Room[] = roomsJson ? JSON.parse(roomsJson) : mockRooms as any;
      return arr.find((r: any)=> String(r.id) === String(roomId)) || null;
    }
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get<Room>(`${this.baseUrl}/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to get room ${roomId}:`, error);
      return null;
    }
  }

  async addRoom(room: Room): Promise<boolean> {
    if ((constantsV as any).OFFLINE_MODE) {
      const roomsJson = await AsyncStorage.getItem('rooms_offline');
      const arr: Room[] = roomsJson ? JSON.parse(roomsJson) : [];
      const newRoom: Room = { id: String(Date.now()), name: room.name, deviceCount: room.deviceCount || 0 } as any;
      arr.push(newRoom);
      await AsyncStorage.setItem('rooms_offline', JSON.stringify(arr));
      return true;
    }
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const payload: any = { name: room.name };
      if (room.devices) payload.devices = room.devices;
      await axios.post(this.baseUrl, payload, { headers: { Authorization: `Bearer ${token}` } });
      return true;
    } catch (error) {
      console.error('Failed to add room:', error);
      return false;
    }
  }

  async updateRoom(updatedRoom: Room): Promise<boolean> {
    if ((constantsV as any).OFFLINE_MODE) {
      const roomsJson = await AsyncStorage.getItem('rooms_offline');
      let arr: Room[] = roomsJson ? JSON.parse(roomsJson) : [];
      arr = arr.map(r => (String(r.id) === String(updatedRoom.id) ? { ...r, ...updatedRoom } : r));
      await AsyncStorage.setItem('rooms_offline', JSON.stringify(arr));
      return true;
    }
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await axios.put(`${this.baseUrl}/${updatedRoom.id}`, updatedRoom, { headers: { Authorization: `Bearer ${token}` } });
      return true;
    } catch (error) {
      console.error(`Failed to update room ${updatedRoom.id}:`, error);
      return false;
    }
  }

  async deleteRoom(roomId: string): Promise<boolean> {
    if ((constantsV as any).OFFLINE_MODE) {
      const roomsJson = await AsyncStorage.getItem('rooms_offline');
      let arr: Room[] = roomsJson ? JSON.parse(roomsJson) : [];
      arr = arr.filter(r => String(r.id) !== String(roomId));
      await AsyncStorage.setItem('rooms_offline', JSON.stringify(arr));
      return true;
    }
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await axios.delete(`${this.baseUrl}/${roomId}`, { headers: { Authorization: `Bearer ${token}` } });
      return true;
    } catch (error) {
      console.error(`Failed to delete room ${roomId}:`, error);
      return false;
    }
  }
  
  // Device management within rooms
  async getRoomDevices(roomId: string): Promise<Device[]> {
    if ((constantsV as any).OFFLINE_MODE) {
      // Filter mock devices by room
      const list = (mockDevices as any[]).filter(d => String(d.room) === String(roomId));
      return list.map(d => ({ id: String(d.id), name: d.name, type: d.deviceType || 'device', status: d.isOn ? 'on' : 'off' }));
    }
    try {
      const devicesJson = await AsyncStorage.getItem(`${this.storageKey}_devices_${roomId}`);
      return devicesJson ? JSON.parse(devicesJson) : [];
    } catch (error) {
      console.error(`Failed to get devices for room ${roomId}:`, error);
      return [];
    }
  }
  
  async addDeviceToRoom(roomId: string, device: Device): Promise<boolean> {
    if ((constantsV as any).OFFLINE_MODE) {
      // Update local mockDevices room assignment
      const key = 'devices_offline';
      const existingJson = await AsyncStorage.getItem(key);
      let arr: any[] = existingJson ? JSON.parse(existingJson) : (mockDevices as any[]);
      arr = arr.map(d => (String(d.id) === String(device.id) ? { ...d, room: roomId } : d));
      await AsyncStorage.setItem(key, JSON.stringify(arr));
      return true;
    }
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const payload: any = device?.id && (!device.name || !device.type)
        ? { deviceId: device.id }
        : { deviceId: device.id, name: device.name, deviceType: (device as any).type, isOn: device.status === 'on' };
      await axios.post(`${this.baseUrl}/${roomId}/devices`, payload, { headers: { Authorization: `Bearer ${token}` } });
      return true;
    } catch (error) {
      console.error(`Failed to add device to room ${roomId}:`, error);
      return false;
    }
  }
  
  async removeDeviceFromRoom(roomId: string, deviceId: string): Promise<boolean> {
    if ((constantsV as any).OFFLINE_MODE) {
      const key = 'devices_offline';
      const existingJson = await AsyncStorage.getItem(key);
      let arr: any[] = existingJson ? JSON.parse(existingJson) : (mockDevices as any[]);
      arr = arr.map(d => (String(d.id) === String(deviceId) ? { ...d, room: null } : d));
      await AsyncStorage.setItem(key, JSON.stringify(arr));
      return true;
    }
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await axios.delete(`${this.baseUrl}/${roomId}/devices/${deviceId}`, { headers: { Authorization: `Bearer ${token}` } });
      return true;
    } catch (error) {
      console.error(`Failed to remove device from room ${roomId}:`, error);
      return false;
    }
  }
  
  async updateDeviceStatus(roomId: string, deviceId: string, status: 'on' | 'off'): Promise<boolean> {
    if ((constantsV as any).OFFLINE_MODE) {
      const key = 'devices_offline';
      const existingJson = await AsyncStorage.getItem(key);
      let arr: any[] = existingJson ? JSON.parse(existingJson) : (mockDevices as any[]);
      arr = arr.map(d => (String(d.id) === String(deviceId) ? { ...d, isOn: status === 'on' } : d));
      await AsyncStorage.setItem(key, JSON.stringify(arr));
      return true;
    }
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await axios.patch(`${this.baseUrl}/${roomId}/devices/${deviceId}/status`, { status }, { headers: { Authorization: `Bearer ${token}` } });
      return true;
    } catch (error) {
      console.error(`Failed to update device status in room ${roomId}:`, error);
      return false;
    }
  }
}

export default new RoomService();
