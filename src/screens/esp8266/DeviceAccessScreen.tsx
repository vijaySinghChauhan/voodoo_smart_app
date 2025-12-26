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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import esp8266Service from '../../services/esp8266/esp8266Service';
import logService from '../../services/logging/logService';

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
        loadUsers(); // Refresh list
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
      {/* Future: Add Remove button here */}
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
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.shareButtonText}>Share</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Current Users</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#4a90e2" style={{ marginTop: 20 }} />
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#4a90e2',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    fontSize: 16,
  },
  shareButton: {
    backgroundColor: '#4a90e2',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  disabledButton: {
    backgroundColor: '#a0c4ff',
  },
  shareButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  userItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  removeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff0f0',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ff6b6b',
    marginLeft: 10,
  },
  removeButtonText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontStyle: 'italic',
  },
});

export default DeviceAccessScreen;
