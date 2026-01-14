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
import Icon from 'react-native-vector-icons/MaterialIcons';

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
  const [selectedType, setSelectedType] = useState<string>('Living Room');

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

  const handleSaveRoom = async () => {
    if (!roomName.trim()) {
      Alert.alert('Error', 'Room name cannot be empty');
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

  const getRoomImage = (nameOrRoom: any) => {
    const src = typeof nameOrRoom === 'string' ? nameOrRoom : ((nameOrRoom?.type || nameOrRoom?.roomType || nameOrRoom?.name) || '');
    const n = String(src).toLowerCase();
    const base = 'https://source.unsplash.com/1200x800/?';
    if (n.includes('living')) return `${base}living-room,interior`;
    if (n.includes('kitchen')) return `${base}kitchen,interior`;
    if (n.includes('bed')) return `${base}bedroom,home`;
    if (n.includes('bath')) return `${base}bathroom,interior`;
    if (n.includes('study') || n.includes('office')) return `${base}study,home-office`;
    if (n.includes('balcony')) return `${base}balcony,terrace`;
    if (n.includes('store') || n.includes('storage')) return `${base}storage,pantry`;
    if (n.includes('terrace') || n.includes('roof')) return `${base}terrace,rooftop`;
    return `${base}home,interior`;
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {navigation.canGoBack() ? (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12, padding: 4 }}>
              <Icon name="arrow-back" size={24} color="#222" />
            </TouchableOpacity>
          ) : null}
          <Text style={styles.headerTitle}>Your Rooms</Text>
        </View>
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

      <Modal visible={isModalVisible} animationType="fade" transparent onRequestClose={() => setIsModalVisible(false)}>
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
              <View style={{ height: 1, marginVertical: 12, backgroundColor: '#eee' }} />
              <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Select Room Type</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {[
                  'Living Room',
                  'Bed Room',
                  'Kitchen',
                  'Bath Room',
                  'Balcony',
                  'Store Room',
                  'Study Room',
                  'Terrace',
                ].map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => {
                      setSelectedType(t);
                      if (!roomName) setRoomName(t);
                    }}
                    style={{
                      width: '48%',
                      height: 80,
                      marginBottom: 10,
                      borderRadius: 8,
                      overflow: 'hidden',
                      borderWidth: selectedType === t ? 2 : 1,
                      borderColor: selectedType === t ? '#3A56D4' : '#ddd',
                    }}
                  >
                    <ImageBackground
                      source={{ uri: getRoomImage({ name: t }) }}
                      style={{ flex: 1, justifyContent: 'flex-end' }}
                      imageStyle={{ borderRadius: 8 }}
                    >
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.9)', paddingVertical: 6, alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#222' }}>{t}</Text>
                      </View>
                    </ImageBackground>
                  </TouchableOpacity>
                ))}
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
  cardWrap: {
    width: '48%',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
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
