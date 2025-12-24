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
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import roomService from '../../services/rooms/roomService';
import type { StackNavigationProp } from '@react-navigation/stack';

interface Room {
  id: string;
  name: string;
  deviceCount: number;
}

type RoomsStackParamList = {
  RoomsList: undefined;
  RoomDetail: { roomId: string };
  AddEditRoom: { room?: any };
};

type RoomsScreenNavigationProp = StackNavigationProp<RoomsStackParamList, 'RoomsList'>;

interface RoomsScreenProps {
  navigation: RoomsScreenNavigationProp;
}

const RoomsScreen: React.FC<RoomsScreenProps> = ({ navigation }) => {
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

  const getRoomImage = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('living'))
      return 'https://images.unsplash.com/photo-1505691723518-36a5ac3b2b8f?q=80&w=1200&auto=format&fit=crop';
    if (n.includes('kitchen'))
      return 'https://images.unsplash.com/photo-1496412705862-e0088f16f791?q=80&w=1200&auto=format&fit=crop';
    if (n.includes('bed'))
      return 'https://images.unsplash.com/photo-1505691723518-41e5e5b2b8f0?q=80&w=1200&auto=format&fit=crop';
    if (n.includes('bath'))
      return 'https://images.unsplash.com/photo-1617093627127-6c4b7f2a9f50?q=80&w=1200&auto=format&fit=crop';
    if (n.includes('office'))
      return 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1200&auto=format&fit=crop';
    return 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1200&auto=format&fit=crop';
  };

  const renderRoomItem = ({ item }: { item: Room }) => (
    <TouchableOpacity style={styles.cardWrap} activeOpacity={0.9} onPress={() => navigation.navigate('RoomDetail', { roomId: item.id })}>
      <ImageBackground
        source={{ uri: getRoomImage(item.name) }}
        style={styles.cardImage}
        imageStyle={styles.cardImageInner}
      >
        <View style={styles.cardFooter}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <View style={styles.cardDevicesBarWrap}>
            <View style={[styles.cardDevicesBar, { width: `${Math.min(100, (item.deviceCount || 0) * 20)}%` }]} />
          </View>
          <Text style={styles.cardDevicesText}>{item.deviceCount} devices</Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Rooms</Text>
      </View>

      {rooms.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#777' }}>No rooms found</Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderRoomItem}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
      )}

      <TouchableOpacity style={styles.fab} activeOpacity={0.9} onPress={openAddModal}>
        <Text style={styles.fabPlus}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modal}>
          <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 8, width: '85%' }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
              {editingRoom ? 'Edit Room' : 'Add Room'}
            </Text>
            <TextInput
              placeholder="Room name"
              value={roomName}
              onChangeText={setRoomName}
              style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10 }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#9E9E9E', marginRight: 8 }]}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionButton, styles.editButton]} onPress={handleSaveRoom}>
                <Text style={styles.actionButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
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
    backgroundColor: '#f2f5f9'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  roomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
  actionButton: {
    padding: 6,
    borderRadius: 4
  },
  editButton: {
    backgroundColor: '#3498db'
  },
  deleteButton: {
    backgroundColor: '#e74c3c'
  },
  cardWrap: { width: '48%', marginBottom: 14 },
  cardImage: { width: '100%', height: 140, justifyContent: 'flex-end' },
  cardImageInner: { borderRadius: 12 },
  cardFooter: { backgroundColor: 'rgba(255,255,255,0.95)', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, padding: 10 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#222' },
  cardDevicesBarWrap: { height: 4, backgroundColor: '#e6eaf2', borderRadius: 2, marginTop: 6 },
  cardDevicesBar: { height: 4, backgroundColor: '#3A56D4', borderRadius: 2 },
  cardDevicesText: { fontSize: 12, color: '#6C757D', marginTop: 6 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#0F4C81', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 6 },
  fabPlus: { color: '#fff', fontSize: 26, fontWeight: '700', marginTop: -2 }
});
