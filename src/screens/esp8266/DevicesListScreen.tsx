import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import esp8266Service from '../../services/esp8266/esp8266Service';
import { COLORS } from '../../theme/theme';

interface DeviceItem {
  _id?: string;
  id?: string;
  name?: string;
  type?: string;
  isOn?: boolean;
  isConnected?: boolean;
  subscriptionActive?: number;
  subscriptionEndDate?: string | null;
}

const DevicesListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      const list = await esp8266Service.getDevicesFromServer();
      setDevices(list || []);
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load devices', position: 'bottom' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
    const unsubscribe = navigation.addListener('focus', loadDevices);
    return unsubscribe;
  }, [navigation]);

  const renderItem = ({ item }: { item: DeviceItem }) => {
    const deviceId = item._id || item.id || '';
    const subText = item.subscriptionActive === 1
      ? (item.subscriptionEndDate ? `Active until ${String(item.subscriptionEndDate).slice(0, 10)}` : 'Active')
      : 'Inactive';
    return (
      <TouchableOpacity
        style={styles.deviceCard}
        onPress={() => navigation.navigate('DeviceControl', { deviceId })}
      >
        <View style={styles.info}>
          <Text style={styles.name}>{item.name || 'Unnamed Device'}</Text>
          <Text style={styles.type}>{item.type || 'ESP8266'}</Text>
          <Text style={styles.subscription}>{subText}</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: item.isConnected ? COLORS.success : COLORS.gray }]} />
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 8, color: COLORS.textMedium }}>Loading devices...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {devices.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No devices found</Text>
        </View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={(item) => String(item._id || item.id)}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.textMedium },
  deviceCard: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: COLORS.textDark },
  type: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },
  subscription: { fontSize: 12, color: COLORS.textMedium, marginTop: 2 },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginLeft: 8 },
});

export default DevicesListScreen;
