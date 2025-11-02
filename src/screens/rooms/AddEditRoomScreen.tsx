import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import roomService from '../../services/rooms/roomService';

interface Room {
  id: string;
  name: string;
}

const AddEditRoomScreen = ({ route, navigation }) => {
  const { room } = route.params || {};
  const [roomName, setRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
});

export default AddEditRoomScreen;