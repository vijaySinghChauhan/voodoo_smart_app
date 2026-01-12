import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Alert, Platform, ActionSheetIOS } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import logService from '../../services/logging/logService';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import ImageResizer from 'react-native-image-resizer';
import RNFS from 'react-native-fs';
import subscriptionService, { Subscription } from '../../services/subscriptions/subscriptionService';

const ProfileScreen: React.FC = () => {
  const { user, updateProfile, logout, isLoading } = useAuth();
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [mySubscriptions, setMySubscriptions] = useState<Subscription[]>([]);
  const [subLoading, setSubLoading] = useState(false);
  const MAX_SIZE_BYTES = 2 * 1024 * 1024;

  useEffect(() => {
    if (user) {
      setName(user.name);
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        setSubLoading(true);
        const list = await subscriptionService.listMy();
        setMySubscriptions(Array.isArray(list) ? list : []);
      } catch (e) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load subscriptions',
          position: 'bottom'
        });
      } finally {
        setSubLoading(false);
      }
    })();
  }, []);

  const ensureUnder2MB = async (uri: string): Promise<string> => {
    try {
      const stat = await RNFS.stat(uri.replace('file://', ''));
      if (Number(stat.size) <= MAX_SIZE_BYTES) return uri;
    } catch {}
    let width = 1200;
    let height = 1200;
    let quality = 80;
    let currentUri = uri;
    for (let i = 0; i < 5; i++) {
      try {
        const resized = await ImageResizer.createResizedImage(currentUri, width, height, 'JPEG', quality);
        const path = resized.uri || resized.path;
        const stat2 = await RNFS.stat(path.replace('file://', ''));
        if (Number(stat2.size) <= MAX_SIZE_BYTES) {
          return path;
        }
        width = Math.max(600, Math.round(width * 0.75));
        height = Math.max(600, Math.round(height * 0.75));
        quality = Math.max(50, Math.round(quality * 0.8));
        currentUri = path;
      } catch (e) {
        break;
      }
    }
    return currentUri;
  };

  const handlePickImage = async (source: 'camera' | 'gallery') => {
    try {
      const options: any = { mediaType: 'photo', includeBase64: false, quality: 1 };
      const result = source === 'camera' ? await launchCamera(options) : await launchImageLibrary(options);
      if (result.didCancel) return;
      const asset = result.assets && result.assets[0];
      if (!asset?.uri) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No image selected', position: 'bottom' });
        return;
      }
      const compressedUri = await ensureUnder2MB(asset.uri);
      await updateProfile({ profilePicture: compressedUri });
      Toast.show({ type: 'success', text1: 'Updated', text2: 'Profile picture updated', position: 'bottom' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Upload Failed', text2: e?.message || 'Could not update picture', position: 'bottom' });
    }
  };

  const chooseImageSource = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Camera', 'Gallery', 'Cancel'],
          cancelButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) handlePickImage('camera');
          else if (buttonIndex === 1) handlePickImage('gallery');
        }
      );
      return;
    }
    Alert.alert('Choose Photo', 'Select source', [
      { text: 'Camera', onPress: () => handlePickImage('camera') },
      { text: 'Gallery', onPress: () => handlePickImage('gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleUpdateProfile = async () => {
    if (!name) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Name cannot be empty',
        position: 'bottom'
      });
      return;
    }

    try {
      try { await logService.logButtonClick('Update Profile', { name }); } catch (e) {}
      await updateProfile({ name });
      setIsEditing(false);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Profile updated successfully',
        position: 'bottom'
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: 'Could not update profile. Please try again.',
        position: 'bottom'
      });
    }
  };

  const handleLogout = async () => {
    try {
      try { await logService.logButtonClick('Logout'); } catch (e) {}
      await logout();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to logout. Please try again.',
        position: 'bottom'
      });
    }
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a90e2" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.profileContainer}>
          <View style={styles.avatarContainer}>
            {user.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>👤</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editBadge} onPress={chooseImageSource} activeOpacity={0.8}>
              <Icon name="edit" size={18} color="#fff" />
            </TouchableOpacity>
            <View style={styles.photoActions}>
              <TouchableOpacity style={[styles.button, styles.photoBtn]} onPress={() => handlePickImage('camera')}>
                <Text style={styles.photoBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.photoBtn]} onPress={() => handlePickImage('gallery')}>
                <Text style={styles.photoBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.label}>Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
              />
            ) : (
              <Text style={styles.infoText}>{user.name}</Text>
            )}
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.infoText}>{user.email}</Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.sectionTitle}>My Subscriptions</Text>
            {subLoading ? (
              <ActivityIndicator size="small" color="#4a90e2" />
            ) : mySubscriptions.length > 0 ? (
              mySubscriptions.map((s) => (
                <View key={s.id} style={styles.subscriptionCard}>
                  <View style={styles.subscriptionRow}>
                    <Text style={styles.subscriptionLabel}>Plan</Text>
                    <Text style={styles.subscriptionValue}>{s.plan}</Text>
                  </View>
                  <View style={styles.subscriptionRow}>
                    <Text style={styles.subscriptionLabel}>Price</Text>
                    <Text style={styles.subscriptionValue}>₹{s.price}</Text>
                  </View>
                  <View style={styles.subscriptionRow}>
                    <Text style={styles.subscriptionLabel}>Status</Text>
                    <Text style={styles.subscriptionValue}>{s.status}</Text>
                  </View>
                  {s.startDate ? (
                    <View style={styles.subscriptionRow}>
                      <Text style={styles.subscriptionLabel}>Start</Text>
                      <Text style={styles.subscriptionValue}>{s.startDate}</Text>
                    </View>
                  ) : null}
                  {s.endDate ? (
                    <View style={styles.subscriptionRow}>
                      <Text style={styles.subscriptionLabel}>End</Text>
                      <Text style={styles.subscriptionValue}>{s.endDate}</Text>
                    </View>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={styles.infoText}>No subscriptions purchased yet</Text>
            )}
          </View>

          {!user.subscriptionId && (
            <TouchableOpacity
              style={[styles.button, styles.subscribeButton]}
              onPress={() => navigation.navigate('Subscriptions' as never)}
            >
              <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
            </TouchableOpacity>
          )}

          {isEditing ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  try { logService.logButtonClick('Cancel Edit Profile'); } catch (e) {}
                  setIsEditing(false);
                  setName(user.name);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleUpdateProfile}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.editButton]}
              onPress={async () => { try { await logService.logButtonClick('Edit Profile'); } catch (e) {} ; setIsEditing(true); }}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.button, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flexGrow: 1,
  },
  profileContainer: {
    padding: 20,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ddd',
  },
  avatarFallback: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 54,
    color: '#666',
  },
  photoActions: {
    flexDirection: 'row',
    marginTop: 12,
  },
  photoBtn: {
    backgroundColor: '#4a90e2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginHorizontal: 6,
  },
  photoBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  infoText: {
    fontSize: 18,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginBottom: 8,
  },
  subscriptionCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  subscriptionLabel: {
    fontSize: 13,
    color: '#666',
  },
  subscriptionValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  editButton: {
    backgroundColor: '#4a90e2',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
    marginLeft: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
    flex: 1,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ff6b6b',
    marginTop: 30,
  },
  logoutButtonText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: 'bold',
  },
  subscribeButton: {
    backgroundColor: '#4a90e2',
    marginTop: 10,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  editBadge: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#4a90e2',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
});

export default ProfileScreen;
