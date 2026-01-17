import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import roomService from '../../services/rooms/roomService';

const getRoomImage = (name: string) => {
  const n = String(name || '').toLowerCase();
  if (n.includes('living')) return 'https://images.unsplash.com/photo-1501045661006-fcebe0257c3f?fm=jpg&fit=crop&w=1200&q=60';
  if (n.includes('kitchen')) return 'https://images.unsplash.com/photo-1556912172-085d6163b5a6?fm=jpg&fit=crop&w=1200&q=60';
  if (n.includes('bed')) return 'https://images.unsplash.com/photo-1505691723518-36a7f0a2661a?fm=jpg&fit=crop&w=1200&q=60';
  if (n.includes('bath')) return 'https://images.unsplash.com/photo-1617093727347-fd68450f33b3?fm=jpg&fit=crop&w=1200&q=60';
  if (n.includes('study') || n.includes('office')) return 'https://images.unsplash.com/photo-1519710164239-da123dc03ef4?fm=jpg&fit=crop&w=1200&q=60';
  if (n.includes('balcony')) return 'https://images.unsplash.com/photo-1540575467063-178a50b15eef?fm=jpg&fit=crop&w=1200&q=60';
  if (n.includes('store') || n.includes('storage')) return 'https://images.unsplash.com/photo-1585386959984-a41552231679?fm=jpg&fit=crop&w=1200&q=60';
  if (n.includes('terrace') || n.includes('roof')) return 'https://images.unsplash.com/photo-1554991651-4538d9e96be9?fm=jpg&fit=crop&w=1200&q=60';
  return 'https://images.unsplash.com/photo-1493809842364-78817add7ff5?fm=jpg&fit=crop&w=1200&q=60';
};

const getRoomFallbackImage = (name: string) => {
  const n = String(name || '').toLowerCase();
  if (n.includes('living')) return 'https://images.unsplash.com/photo-1493666438817-866a91353ca9?fm=jpg&fit=crop&w=1200&q=60';
  if (n.includes('kitchen')) return 'https://images.unsplash.com/photo-1588854337112-1c67c1a5b5fe?fm=jpg&fit=crop&w=1200&q=60';
  if (n.includes('bed')) return 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?fm=jpg&fit=crop&w=1200&q=60';
  if (n.includes('bath')) return 'https://images.unsplash.com/photo-1505574969061-11338c88e315?fm=jpg&fit=crop&w=1200&q=60';
  if (n.includes('study') || n.includes('office')) return 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?fm=jpg&fit=crop&w=1200&q=60';
  if (n.includes('balcony')) return 'https://images.unsplash.com/photo-1508062759719-6ec0f8f018b8?fm=jpg&fit=crop&w=1200&q=60';
  if (n.includes('store') || n.includes('storage')) return 'https://images.unsplash.com/photo-1484154218962-a197022b5858?fm=jpg&fit=crop&w=1200&q=60';
  if (n.includes('terrace') || n.includes('roof')) return 'https://images.unsplash.com/photo-1560185127-6d4b0dfe0c67?fm=jpg&fit=crop&w=1200&q=60';
  return 'https://images.unsplash.com/photo-1493809842364-78817add7ff5?fm=jpg&fit=crop&w=1200&q=60';
};

const getRoomEmoji = (name: string) => {
  const n = String(name || '').toLowerCase();
  if (n.includes('living')) return '🛋️';
  if (n.includes('bed')) return '🛏️';
  if (n.includes('kitchen')) return '🍳';
  if (n.includes('bath')) return '🛁';
  if (n.includes('balcony')) return '🌤️';
  if (n.includes('store') || n.includes('storage')) return '📦';
  if (n.includes('study') || n.includes('office')) return '📚';
  if (n.includes('terrace') || n.includes('roof')) return '🏡';
  return '🏠';
};

const AddEditRoomScreen = ({ route, navigation }) => {
  const { room } = route.params || {};
  const [roomName, setRoomName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('Living Room');
  const [imageFailed, setImageFailed] = useState<Record<string, boolean>>({});

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
      <ScrollView contentContainerStyle={styles.scroll}>
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
                  source={imageFailed[t] ? { uri: getRoomFallbackImage(t) } : { uri: getRoomImage(t) }}
                  style={styles.typeImage}
                  imageStyle={styles.typeImageInner}
                  resizeMode="cover"
                  onError={() => setImageFailed((prev) => ({ ...prev, [t]: true }))}
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scroll: {
    paddingBottom: 16,
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
  typeImageFallback: {
    backgroundColor: '#eeeeee',
  },
  fallbackCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackEmoji: {
    fontSize: 24,
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
