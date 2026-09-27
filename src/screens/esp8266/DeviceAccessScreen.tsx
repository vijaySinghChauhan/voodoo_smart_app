import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import esp8266Service from '../../services/esp8266/esp8266Service';
import logService from '../../services/logging/logService';
import { COLORS, SHADOWS, SIZES, FONTS } from '../../theme/theme';

interface DeviceUser {
  email: string;
  role: string;
  addedAt?: string;
}

const DeviceAccessScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { deviceId, deviceName } = route.params || {};
  const [users, setUsers] = useState<DeviceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!deviceId) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'No device selected' });
      navigation.goBack();
      return;
    }
    loadUsers();
  }, [deviceId]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await esp8266Service.getDeviceUsers(deviceId);
      setUsers(data);
    } catch (error) {
      console.error('Failed to load users:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!email.trim()) {
      Toast.show({ type: 'error', text1: 'Validation', text2: 'Please enter an email address' });
      return;
    }

    try {
      setSharing(true);
      await logService.logButtonClick('Share Device', { deviceId, email });
      const success = await esp8266Service.shareDevice(deviceId, email.trim());
      
      if (success) {
        Toast.show({ type: 'success', text1: 'Success', text2: 'Device shared successfully' });
        setEmail('');
        loadUsers();
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to share device' });
      }
    } catch (error) {
      console.error('Share error:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'An unexpected error occurred' });
    } finally {
      setSharing(false);
    }
  };

  const renderUserItem = ({ item }: { item: DeviceUser }) => (
    <View style={styles.userItem}>
      <View style={styles.userInfo}>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userRole}>{item.role}</Text>
      </View>
      <TouchableOpacity 
        onPress={() => handleRemove(item.email)}
        style={styles.removeButton}
      >
        <Text style={styles.removeButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  const handleRemove = async (userEmail: string) => {
    Alert.alert(
      'Remove Access',
      `Are you sure you want to remove access for ${userEmail}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await esp8266Service.removeDeviceUser(deviceId, userEmail);
              if (success) {
                Toast.show({ type: 'success', text1: 'Removed', text2: 'User access removed' });
                loadUsers();
              } else {
                Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to remove user' });
              }
            } catch (error) {
              Toast.show({ type: 'error', text1: 'Error', text2: 'An error occurred' });
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Access: {deviceName || 'Device'}</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Share with new user</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter email address"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TouchableOpacity
            style={[styles.shareButton, sharing && styles.disabledButton]}
            onPress={handleShare}
            disabled={sharing}
          >
            {sharing ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Text style={styles.shareButtonText}>Share</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Current Users</Text>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primaryDark} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={users}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.email}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No other users have access to this device.</Text>
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.small,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: COLORS.primaryDark,
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
  },
  content: {
    flex: 1,
    padding: SIZES.padding,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    padding: 12,
    marginRight: 12,
    fontSize: 16,
    color: COLORS.textDark,
  },
  shareButton: {
    backgroundColor: COLORS.primaryDark,
    paddingVertical: 12,
    paddingHorizontal: SIZES.padding,
    borderRadius: SIZES.radius,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  disabledButton: {
    backgroundColor: COLORS.primaryLight,
  },
  shareButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
  listContent: {
    paddingBottom: SIZES.padding,
  },
  userItem: {
    backgroundColor: COLORS.card,
    padding: 16,
    borderRadius: SIZES.radius,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.medium,
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    color: COLORS.textDark,
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: COLORS.textLight,
    textTransform: 'capitalize',
  },
  removeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: COLORS.error,
    marginLeft: 10,
  },
  removeButtonText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textVeryLight,
    marginTop: 20,
    fontStyle: 'italic',
  },
});

export default DeviceAccessScreen;
