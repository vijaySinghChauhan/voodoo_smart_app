import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import roomService from '../../services/rooms/roomService';
import esp8266Service from '../../services/esp8266/esp8266Service';

interface Device {
  id: string;
  name: string;
  type: string;
  status: 'on' | 'off';
  roomId: string | null;
}

interface Room {
  id: string;
  name: string;
  devices: Device[];
}

const RoomDetailScreen = ({ route, navigation }) => {
  const { roomId } = route.params;
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableDevices, setAvailableDevices] = useState<Device[]>([]);

  useEffect(() => {
    loadRoomDetails();
    loadAvailableDevices();
  }, []);

  const loadRoomDetails = async () => {
    setIsLoading(true);
    try {
      const roomData = await roomService.getRoomById(roomId);
      setRoom(roomData);
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
  };

  const loadAvailableDevices = async () => {
    try {
      const devices = await esp8266Service.getUnassignedDevices();
      setAvailableDevices(devices);
    } catch (error) {
      console.error('Failed to load available devices:', error);
    }
  };

  const handleAddDevice = () => {
    if (availableDevices.length === 0) {
      Alert.alert('No Devices Available', 'There are no unassigned devices available to add to this room.');
      return;
    }

    navigation.navigate('DeviceDiscovery', { roomId });
  };

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      await roomService.removeDeviceFromRoom(roomId, deviceId);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Device removed from room',
        position: 'bottom'
      });
      loadRoomDetails();
      loadAvailableDevices();
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
      const newStatus = device.status === 'on' ? 'off' : 'on';
      await esp8266Service.setDevicePowerState(device.id, newStatus);
      
      // Update local state
      if (room) {
        const updatedDevices = room.devices.map(d => 
          d.id === device.id ? { ...d, status: newStatus } : d
        );
        setRoom({ ...room, devices: updatedDevices });
      }
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
    <View style={styles.deviceItem}>
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceType}>{item.type}</Text>
      </View>
      <View style={styles.deviceControls}>
        <Switch
          value={item.status === 'on'}
          onValueChange={() => toggleDeviceStatus(item)}
        />
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveDevice(item.id)}
        >
          <Text style={styles.removeButtonText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
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
        <Text style={styles.roomName}>{room?.name}</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('AddEditRoom', { room })}
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

        {room?.devices && room.devices.length > 0 ? (
          <FlatList
            data={room.devices}
            renderItem={renderDeviceItem}
            keyExtractor={(item) => item.id}
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