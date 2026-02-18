import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import roomService from '../../services/rooms/roomService';
import esp8266Service from '../../services/esp8266/esp8266Service';
import logService from '../../services/logging/logService';
import { AppSwitch } from '../../components/AppSwitch';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface Device {
  id: string;
  name: string;
  deviceType?: string;
  isOn?: boolean;
  brightness?: number;
  ipAddress?: string | null;
  room?: string | null;
}

// Local room model used in this screen (matches server payload without devices array)
interface RoomDetailModel {
  id: string;
  name: string;
  deviceCount?: number;
  type?: string;
  user?: any;
  createdAt?: string;
}

type RoomsStackParamList = {
  RoomsList: undefined;
  RoomDetail: { roomId: string };
  AddEditRoom: { room?: any } | undefined;
  AddDeviceToRoom: { roomId: string };
};

type RoomDetailRouteProp = RouteProp<RoomsStackParamList, 'RoomDetail'>;
type RoomDetailNavigationProp = StackNavigationProp<RoomsStackParamList, 'RoomDetail'>;

interface RoomDetailScreenProps {
  route: RoomDetailRouteProp;
  navigation: RoomDetailNavigationProp;
}

const RoomDetailScreen: React.FC<RoomDetailScreenProps> = ({ route, navigation }) => {
  const { roomId } = route.params;
  const [room, setRoom] = useState<RoomDetailModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [roomDevices, setRoomDevices] = useState<Device[]>([]);

  const loadRoomDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const roomData = await roomService.getRoomById(roomId);
      if (roomData) {
        // Map server room response to local model to avoid type mismatches
        setRoom({
          id: (roomData as any).id,
          name: (roomData as any).name,
          deviceCount: (roomData as any).deviceCount,
          type: (roomData as any).type,
          user: (roomData as any).user,
          createdAt: (roomData as any).createdAt,
        });
      } else {
        setRoom(null);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load room details',
        position: 'bottom'
      });
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  const loadRoomDevices = useCallback(async () => {
    try {
      const devices = await esp8266Service.getDevicesByRoom(roomId);
      setRoomDevices(devices);
    } catch (error) {
      console.error('Failed to load room devices:', error);
      setRoomDevices([]);
    }
  }, [roomId]);

  useEffect(() => {
    loadRoomDetails();
    loadRoomDevices();
    const unsubscribe = navigation.addListener('focus', () => {
      loadRoomDevices();
    });
    return unsubscribe;
  }, [navigation, loadRoomDetails, loadRoomDevices]);

  const handleAddDevice = async () => {
    try { await logService.logButtonClick('Add Device To Room', { roomId }); } catch (e) {}
    navigation.navigate('AddDeviceToRoom', { roomId });
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      try { await logService.logButtonClick('Remove Device From Room', { roomId, deviceId }); } catch (e) {}
      const ok = await esp8266Service.unassignDeviceFromRoom(deviceId);
      if (!ok) throw new Error('Unassign failed');
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Device removed from room',
        position: 'bottom'
      });
      loadRoomDevices();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to remove device from room',
        position: 'bottom'
      });
    }
  };

  const toggleDeviceStatus = async (device: Device) => {
    try {
      const newStatus: 'on' | 'off' = device.isOn ? 'off' : 'on';
      try { await logService.logButtonClick('Toggle Device Status', { deviceId: device.id, to: newStatus }); } catch (e) {}
      const ok = await esp8266Service.controlDeviceOnServer(device.id, newStatus);
      if (!ok) throw new Error('Control failed');
      
      // Update local state
      const updatedDevices = roomDevices.map(d => 
        d.id === device.id ? { ...d, isOn: newStatus === 'on' } : d
      );
      setRoomDevices(updatedDevices);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to toggle device status',
        position: 'bottom'
      });
    }
  };

  const renderDeviceItem = ({ item }: { item: Device }) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => {
        try { logService.logButtonClick('Open Device From Room', { deviceId: item.id }); } catch (e) {}
        // Navigate to Devices stack control screen
        const parent = navigation.getParent?.();
        if (parent) {
          parent.navigate('Devices', { screen: 'DeviceControl', params: { deviceId: item.id } });
        } else {
          // Fallback if parent not available
          // @ts-ignore
          navigation.navigate('Devices', { screen: 'DeviceControl', params: { deviceId: item.id } });
        }
      }}
    >
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceType}>{item.deviceType || 'Device'}</Text>
      </View>
      <View style={styles.deviceControls}>
        <AppSwitch
          value={!!item.isOn}
          onValueChange={() => toggleDeviceStatus(item)}
        />
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveDevice(item.id)}
        >
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading room details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {navigation.canGoBack() ? (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12, padding: 4 }}>
              <Icon name="arrow-back" size={24} color="#222" />
            </TouchableOpacity>
          ) : null}
          <Text style={styles.roomName}>{room?.name}</Text>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={async () => { try { await logService.logButtonClick('Edit Room', { roomId }); } catch (e) {} ; navigation.navigate('AddEditRoom', { room }); }}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.devicesContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Devices</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleAddDevice}>
            <Text style={styles.addButtonText}>Add Device</Text>
          </TouchableOpacity>
        </View>

        {roomDevices && roomDevices.length > 0 ? (
          <FlatList
            data={roomDevices}
            renderItem={renderDeviceItem}
            keyExtractor={(item) => String(item.id)}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No devices in this room</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  roomName: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  editButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  devicesContainer: {
    flex: 1,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deviceType: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  deviceControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  removeButtonText: {
    color: '#ffffff',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
  },
});

export default RoomDetailScreen;
