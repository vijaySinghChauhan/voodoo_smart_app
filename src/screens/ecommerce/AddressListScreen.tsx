import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import addressApi from '../../services/ecommerce/addressApi';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SHADOWS, SIZES, FONTS } from '../../theme/theme';

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

const DOUBLE_PRESS_DELAY = 300;

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
      try {
        await addressApi.setDefault(address.id);
      } catch (err) {
        Toast.show({ type: 'error', text1: 'Failed to set default', position: 'bottom' });
      }
      Toast.show({ type: 'success', text1: 'Default Address Set', position: 'bottom' });
      await loadAddresses();
    } else {
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
      <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" />
      <View style={styles.headerRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {navigation.canGoBack() ? (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: SIZES.base * 1.5, padding: SIZES.base * 0.5 }}>
              <Icon name="arrow-back" size={24} color={COLORS.textDark} />
            </TouchableOpacity>
          ) : null}
          <Text style={styles.title}>My Addresses</Text>
        </View>
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
  container: { flex: 1, backgroundColor: COLORS.background },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SIZES.padding },
  title: { fontSize: SIZES.h3, fontWeight: '600', color: COLORS.textDark },
  addBtn: { backgroundColor: COLORS.primaryDark, paddingVertical: SIZES.base, paddingHorizontal: SIZES.base * 1.5, borderRadius: SIZES.radius },
  addText: { color: COLORS.white, fontWeight: '600' },
  list: { padding: SIZES.padding },
  card: { backgroundColor: COLORS.card, borderRadius: SIZES.radius, padding: SIZES.base * 1.5, marginBottom: SIZES.base * 1.5, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.small },
  defaultCard: { borderColor: COLORS.primaryDark },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: SIZES.body1, fontWeight: '600', color: COLORS.textDark },
  phone: { marginTop: SIZES.base * 0.5, color: COLORS.textLight },
  defaultBadge: { color: COLORS.primaryDark, fontWeight: '700' },
  addrLine: { marginTop: SIZES.base * 0.25, color: COLORS.textDark },
  actionsRow: { flexDirection: 'row', marginTop: SIZES.base * 1.25 },
  actionBtn: { paddingVertical: SIZES.base * 0.75, paddingHorizontal: SIZES.base * 1.5, borderRadius: SIZES.radius, backgroundColor: COLORS.lightGray, marginRight: SIZES.base },
  actionText: { color: COLORS.textMedium, fontWeight: '600' },
  deleteBtn: { backgroundColor: COLORS.lightGray },
  deleteText: { color: COLORS.error },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.textLight, marginBottom: SIZES.base * 1.5 },
  addPrimaryBtn: { backgroundColor: COLORS.primaryDark, paddingVertical: SIZES.base * 1.25, paddingHorizontal: SIZES.base * 1.75, borderRadius: SIZES.radius },
  addPrimaryText: { color: COLORS.white, fontWeight: '600' },
  loading: { padding: SIZES.padding, color: COLORS.textDark },
});

export default AddressListScreen;
