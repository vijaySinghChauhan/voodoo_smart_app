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
import subscriptionService, { Subscription } from '../../services/subscriptions/subscriptionService';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../theme/theme';
import { StatusBar } from 'react-native';

const RNFSSafe: any = (() => {
  try {
    if (Platform.OS === 'web') {
      return { stat: async () => ({ size: 0 }) };
    }
    const mod = require('react-native-fs');
    return (mod && (mod.default || mod)) || {};
  } catch {
    return { stat: async () => ({ size: 0 }) };
  }
})();

const ProfileScreen: React.FC = () => {
  const { user, updateProfile, uploadAvatar, logout, isLoading } = useAuth();
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
      const stat = await RNFSSafe.stat(uri.replace('file://', ''));
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
        const stat2 = await RNFSSafe.stat(path.replace('file://', ''));
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
      const options: any = { mediaType: 'photo', includeBase64: false, quality: 1, selectionLimit: 1, presentationStyle: 'fullScreen', saveToPhotos: false };
      const result = source === 'camera' ? await launchCamera(options) : await launchImageLibrary(options);
      if ((result as any)?.errorCode) {
        const msg = (result as any)?.errorMessage || (result as any)?.errorCode || 'Unknown error';
        Toast.show({ type: 'error', text1: 'Picker Error', text2: String(msg), position: 'bottom' });
        return;
      }
      if (result.didCancel) return;
      const asset = result.assets && result.assets[0];
      if (!asset?.uri) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No image selected', position: 'bottom' });
        return;
      }
      const compressedUri = await ensureUnder2MB(asset.uri);
      await uploadAvatar(compressedUri);
      Toast.show({ type: 'success', text1: 'Updated', text2: 'Profile photo updated', position: 'bottom' });
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
        <ActivityIndicator size="large" color={COLORS.primaryDark} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.profileContainer}>
          <View style={styles.avatarContainer}>
            {user.avatar ? (
              <Image source={{ uri: String(user.avatar) }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarFallbackText}>👤</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editBadge} onPress={chooseImageSource} activeOpacity={0.8}>
              <Icon name="edit" size={18} color={COLORS.white} />
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
              <ActivityIndicator size="small" color={COLORS.primaryDark} />
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
                  <ActivityIndicator color={COLORS.white} size="small" />
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
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flexGrow: 1,
  },
  profileContainer: {
    padding: SIZES.padding,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: SIZES.padding * 1.5,
    paddingTop: SIZES.base,
  },
  avatar: {
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: COLORS.lightGray,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarFallback: {
    width: 124,
    height: 124,
    borderRadius: 62,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  avatarFallbackText: {
    fontSize: 56,
  },
  photoActions: {
    flexDirection: 'row',
    marginTop: SIZES.base * 1.5,
  },
  photoBtn: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: SIZES.base * 2,
    paddingVertical: SIZES.base + 2,
    borderRadius: SIZES.radius,
    marginHorizontal: SIZES.base,
    ...SHADOWS.small,
  },
  photoBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  infoContainer: {
    marginBottom: SIZES.base * 2,
  },
  label: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: SIZES.base / 2,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  infoText: {
    fontSize: 17,
    color: COLORS.textDark,
    fontWeight: '600',
    backgroundColor: COLORS.card,
    padding: SIZES.base * 1.3,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    color: COLORS.textDark,
    fontWeight: '700',
    marginBottom: SIZES.base,
    letterSpacing: 0.2,
  },
  subscriptionCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius + 2,
    padding: SIZES.base * 1.3,
    marginTop: SIZES.base,
    ...SHADOWS.medium,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.base / 1.5,
  },
  subscriptionLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  subscriptionValue: {
    fontSize: 14,
    color: COLORS.textDark,
    fontWeight: '700',
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    padding: SIZES.base * 1.3,
    fontSize: 15,
    color: COLORS.textDark,
    fontWeight: '600',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SIZES.base,
  },
  button: {
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.base * 1.7,
    alignItems: 'center',
    marginTop: SIZES.base,
  },
  editButton: {
    backgroundColor: COLORS.primaryDark,
    ...SHADOWS.medium,
  },
  editButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  saveButton: {
    backgroundColor: COLORS.success,
    flex: 1,
    marginLeft: SIZES.base,
    ...SHADOWS.small,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    flex: 1,
  },
  cancelButtonText: {
    color: COLORS.textMedium,
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1.2,
    borderColor: COLORS.error,
    marginTop: SIZES.padding * 1.5,
  },
  logoutButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  subscribeButton: {
    backgroundColor: COLORS.primaryDark,
    marginTop: SIZES.base,
    ...SHADOWS.medium,
  },
  subscribeButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  editBadge: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
});

export default ProfileScreen;
