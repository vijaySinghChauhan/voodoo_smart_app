import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import roomService from '../../services/rooms/roomService';

interface Device {
  id: string;
  name: string;
  deviceType?: string;
  macAddress?: string;
  ipAddress?: string | null;
  room?: string | null;
}

const AddDeviceToRoomScreen = ({ route, navigation }: any) => {
  const { roomId } = route.params;
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUnassignedDevices = async () => {
    setLoading(true);
    try {
      // Reuse device service to fetch unassigned, or call backend and filter
      const list = await (await import('../../services/esp8266/esp8266Service')).default.getUnassignedDevices();
      setDevices(list as any);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load devices', position: 'bottom' });
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnassignedDevices();
  }, []);

  const handleAssign = async (deviceId: string) => {
    try {
      const ok = await roomService.addDeviceToRoom(roomId, { id: deviceId } as any);
      if (!ok) throw new Error('Assign failed');
      Toast.show({ type: 'success', text1: 'Device Added', text2: 'Assigned to room', position: 'bottom' });
      navigation.goBack();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not add device', position: 'bottom' });
    }
  };

  const renderItem = ({ item }: { item: Device }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>{item.deviceType || 'Device'} • {item.ipAddress || 'No IP'}</Text>
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={() => handleAssign(item.id)}>
        <Text style={styles.addTxt}>Add</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Device to Room</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : devices.length ? (
        <FlatList data={devices} keyExtractor={(d) => String(d.id)} renderItem={renderItem} />
      ) : (
        <View style={styles.center}><Text style={styles.meta}>No unassigned devices available</Text></View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  title: { fontSize: 18, fontWeight: 'bold' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, marginHorizontal: 16, marginVertical: 8, borderRadius: 8, elevation: 2 },
  name: { fontSize: 16, fontWeight: 'bold' },
  meta: { fontSize: 12, color: '#666', marginTop: 4 },
  addBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  addTxt: { color: '#fff', fontWeight: 'bold' },
});

export default AddDeviceToRoomScreen;
