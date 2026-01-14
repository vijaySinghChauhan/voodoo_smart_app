import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import roomService from '../../services/rooms/roomService';

const getRoomImage = (name: string) => {
  const n = String(name || '').toLowerCase();
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

const AddEditRoomScreen = ({ route, navigation }) => {
  const { room } = route.params || {};
  const [roomName, setRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('Living Room');

  useEffect(() => {
    if (room) {
      setRoomName(room.name);
    }
  }, [room]);

  const handleSave = async () => {
    if (!roomName.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a room name',
        position: 'bottom'
      });
      return;
    }

    setIsLoading(true);
    try {
      if (room) {
        // Update existing room
        await roomService.updateRoom(room.id, { name: roomName });
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Room updated successfully',
          position: 'bottom'
        });
      } else {
        // Create new room
        await roomService.addRoom({ name: roomName });
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Room created successfully',
          position: 'bottom'
        });
      }
      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: room ? 'Failed to update room' : 'Failed to create room',
        position: 'bottom'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.label}>Room Name</Text>
        <TextInput
          style={styles.input}
          value={roomName}
          onChangeText={setRoomName}
          placeholder="Enter room name"
          autoCapitalize="words"
        />
        <Text style={styles.label}>Select Room Type</Text>
        <View style={styles.typesWrap}>
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
              style={[
                styles.typeItem,
                { borderColor: selectedType === t ? '#3A56D4' : '#ddd', borderWidth: selectedType === t ? 2 : 1 },
              ]}
              activeOpacity={0.85}
            >
              <ImageBackground
                source={{ uri: getRoomImage(t) }}
                style={styles.typeImage}
                imageStyle={styles.typeImageInner}
              >
                <View style={styles.typeLabel}>
                  <Text style={styles.typeLabelText}>{t}</Text>
                </View>
              </ImageBackground>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>
              {room ? 'Update Room' : 'Create Room'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  formContainer: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  typesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  typeItem: {
    width: '48%',
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  typeImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  typeImageInner: {
    borderRadius: 8,
  },
  typeLabel: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  typeLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#222',
  },
});

export default AddEditRoomScreen;
