import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import roomService from '../../services/rooms/roomService';

interface Room {
  id: string;
  name: string;
  deviceCount: number;
}

const RoomsScreen = ({ navigation }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const roomsData = await roomService.getRooms();
      setRooms(roomsData);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load rooms',
        position: 'bottom'
      });
    }
  };

  const openAddModal = () => {
    setRoomName('');
    setEditingRoom(null);
    setIsModalVisible(true);
  };

  const openEditModal = (room: Room) => {
    setRoomName(room.name);
    setEditingRoom(room);
    setIsModalVisible(true);
  };

  const handleSaveRoom = async () => {
    if (!roomName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Room name cannot be empty',
        position: 'bottom'
      });
      return;
    }

    try {
      if (editingRoom) {
        // Update existing room
        await roomService.updateRoom({
          ...editingRoom,
          name: roomName,
        });
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Room updated successfully',
          position: 'bottom'
        });
      } else {
        // Add new room
        const room: Room = {
          id: Date.now().toString(),
          name: roomName,
          deviceCount: 0
        };
        await roomService.addRoom(room);
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Room added successfully',
          position: 'bottom'
        });
      }
      
      setIsModalVisible(false);
      loadRooms();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save room',
        position: 'bottom'
      });
    }
  };

  const handleDeleteRoom = (room: Room) => {
    Alert.alert(
      'Delete Room',
      `Are you sure you want to delete "${room.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await roomService.deleteRoom(room.id);
              Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Room deleted successfully',
                position: 'bottom'
              });
              loadRooms();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete room',
                position: 'bottom'
              });
            }
          } 
        },
      ]
    );
  };

  const renderRoomItem = ({ item }: { item: Room }) => (
    <TouchableOpacity 
      style={{
        padding: 15,
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      }}
      onPress={() => navigation.navigate('RoomDetail', { roomId: item.id })}
    >
      <View style={styles.roomInfo}>
        <Text style={styles.roomName}>{item.name}</Text>
        <Text style={styles.deviceCount}>{item.deviceCount} devices</Text>
      </View>
      
      <View style={styles.roomActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openEditModal(item)}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteRoom(item)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )

};
export default RoomsScreen;

const styles = StyleSheet.create({
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  roomInfo: {
    flex: 1
  },
  roomName: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  deviceCount: {
    fontSize: 14,
    color: '#888'
  },
  modal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  roomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
  actionButton: {
    padding: 8,
    borderRadius: 4
  },
  editButton: {
    backgroundColor: '#3498db'
  },
  deleteButton: {
    backgroundColor: '#e74c3c'
  }
});