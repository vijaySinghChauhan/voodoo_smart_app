import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as constantsV from '../../constants/constatantsV';

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
    try {
      const token = await AsyncStorage.getItem('auth_token');
      // Only send required fields for creation
      const payload: any = {
        name: room.name
      };
      if (room.devices) {
        payload.devices = room.devices;
      }
      await axios.post(this.baseUrl, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return true;
    } catch (error) {
      console.error('Failed to add room:', error);
      return false;
    }
  }

  async updateRoom(updatedRoom: Room): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await axios.put(`${this.baseUrl}/${updatedRoom.id}`, updatedRoom, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return true;
    } catch (error) {
      console.error(`Failed to update room ${updatedRoom.id}:`, error);
      return false;
    }
  }

  async deleteRoom(roomId: string): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await axios.delete(`${this.baseUrl}/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return true;
    } catch (error) {
      console.error(`Failed to delete room ${roomId}:`, error);
      return false;
    }
  }
  
  // Device management within rooms
  async getRoomDevices(roomId: string): Promise<Device[]> {
    try {
      const devicesJson = await AsyncStorage.getItem(`${this.storageKey}_devices_${roomId}`);
      return devicesJson ? JSON.parse(devicesJson) : [];
    } catch (error) {
      console.error(`Failed to get devices for room ${roomId}:`, error);
      return [];
    }
  }
  
  async addDeviceToRoom(roomId: string, device: Device): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      // If device has only id, send as deviceId to assign; otherwise create with provided details
      const payload: any = device?.id && (!device.name || !device.type)
        ? { deviceId: device.id }
        : {
            deviceId: device.id, // allow backend to prefer id if provided
            name: device.name,
            deviceType: (device as any).type,
            isOn: device.status === 'on',
          };
      await axios.post(`${this.baseUrl}/${roomId}/devices`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return true;
    } catch (error) {
      console.error(`Failed to add device to room ${roomId}:`, error);
      return false;
    }
  }
  
  async removeDeviceFromRoom(roomId: string, deviceId: string): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await axios.delete(`${this.baseUrl}/${roomId}/devices/${deviceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return true;
    } catch (error) {
      console.error(`Failed to remove device from room ${roomId}:`, error);
      return false;
    }
  }
  
  async updateDeviceStatus(roomId: string, deviceId: string, status: 'on' | 'off'): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await axios.patch(`${this.baseUrl}/${roomId}/devices/${deviceId}/status`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return true;
    } catch (error) {
      console.error(`Failed to update device status in room ${roomId}:`, error);
      return false;
    }
  }
}

export default new RoomService();
