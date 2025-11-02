import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import addressApi from '../../services/ecommerce/addressApi';
import { useNavigation } from '@react-navigation/native';

type Address = {
  id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
};

const DOUBLE_PRESS_DELAY = 300; // ms

const AddressListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const lastPressRef = useRef<number>(0);

  const loadAddresses = async () => {
    setIsLoading(true);
    try {
      const list = await addressApi.list();
      setAddresses(list.map((a: any) => ({
        id: String(a.id ?? a._id ?? ''),
        name: a.name,
        phone: a.phone,
        addressLine1: a.addressLine1,
        addressLine2: a.addressLine2 || '',
        city: a.city,
        state: a.state,
        zipCode: a.zipCode,
        country: a.country,
        isDefault: !!a.isDefault,
      })));
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to load addresses', position: 'bottom' });
      setAddresses([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
    const unsubscribe = navigation.addListener('focus', loadAddresses);
    return unsubscribe;
  }, [navigation]);

  const handlePressItem = async (address: Address) => {
    const now = Date.now();
    if (now - lastPressRef.current < DOUBLE_PRESS_DELAY) {
      // Double press -> set default
      try {
        await addressApi.setDefault(address.id);
      } catch (err) {
        Toast.show({ type: 'error', text1: 'Failed to set default', position: 'bottom' });
      }
      Toast.show({ type: 'success', text1: 'Default Address Set', position: 'bottom' });
      await loadAddresses();
    } else {
      // Single press -> edit
      navigation.navigate('AddressEdit', { addressId: address.id });
    }
    lastPressRef.current = now;
  };

  const renderItem = ({ item }: { item: Address }) => (
    <TouchableOpacity style={[styles.card, item.isDefault ? styles.defaultCard : null]} onPress={() => handlePressItem(item)}>
      <View style={styles.cardHeader}>
        <Text style={styles.name}>{item.name}</Text>
        {item.isDefault && <Text style={styles.defaultBadge}>Default</Text>}
      </View>
      <Text style={styles.phone}>{item.phone}</Text>
      <Text style={styles.addrLine}>{item.addressLine1}</Text>
      {item.addressLine2 ? <Text style={styles.addrLine}>{item.addressLine2}</Text> : null}
      <Text style={styles.addrLine}>{item.city}, {item.state} {item.zipCode}</Text>
      <Text style={styles.addrLine}>{item.country}</Text>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AddressEdit', { addressId: item.id })}>
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={async () => {
          try {
            await addressApi.remove(item.id);
            Toast.show({ type: 'success', text1: 'Address Deleted', position: 'bottom' });
            await loadAddresses();
          } catch (err) {
            Toast.show({ type: 'error', text1: 'Failed to delete address', position: 'bottom' });
          }
        }}>
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>My Addresses</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddressEdit')}>
          <Text style={styles.addText}>Add New</Text>
        </TouchableOpacity>
      </View>
      {isLoading ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : addresses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No addresses saved yet</Text>
          <TouchableOpacity style={styles.addPrimaryBtn} onPress={() => navigation.navigate('AddressEdit')}>
            <Text style={styles.addPrimaryText}>Add Address</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={addresses}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { fontSize: 20, fontWeight: '600' },
  addBtn: { backgroundColor: '#4a90e2', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  addText: { color: '#fff', fontWeight: '600' },
  list: { padding: 16 },
  card: { backgroundColor: '#f7f9fc', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e3e7ee' },
  defaultCard: { borderColor: '#4a90e2' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600' },
  phone: { marginTop: 4, color: '#555' },
  defaultBadge: { color: '#4a90e2', fontWeight: '700' },
  addrLine: { marginTop: 2, color: '#333' },
  actionsRow: { flexDirection: 'row', marginTop: 10 },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#e9eef6', marginRight: 8 },
  actionText: { color: '#1a3b5d', fontWeight: '600' },
  deleteBtn: { backgroundColor: '#fdecec' },
  deleteText: { color: '#d9534f' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#666', marginBottom: 12 },
  addPrimaryBtn: { backgroundColor: '#4a90e2', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  addPrimaryText: { color: '#fff', fontWeight: '600' },
  loading: { padding: 16 },
});

export default AddressListScreen;