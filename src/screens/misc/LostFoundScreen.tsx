import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../theme/theme';

type LostFoundItem = {
  id: string;
  serialNo: string;
  foundAt: string;
  itemDesc: string;
  quantity: number;
  foundBy: string;
  receivedBy: string;
  receivedAt: string;
  handedOver: string;
  contact: string;
  remarks: string;
};

const STORAGE_KEY = 'lost_found_items';

const LostFoundScreen: React.FC = () => {
  const [serialNo, setSerialNo] = React.useState('');
  const [foundAt, setFoundAt] = React.useState<Date>(new Date());
  const [itemDesc, setItemDesc] = React.useState('');
  const [quantity, setQuantity] = React.useState('1');
  const [foundBy, setFoundBy] = React.useState('');
  const [receivedBy, setReceivedBy] = React.useState('');
  const [receivedAt, setReceivedAt] = React.useState<Date>(new Date());
  const [handedOver, setHandedOver] = React.useState('');
  const [contact, setContact] = React.useState('');
  const [remarks, setRemarks] = React.useState('');
  const [items, setItems] = React.useState<LostFoundItem[]>([]);
  const [showFoundPicker, setShowFoundPicker] = React.useState(false);
  const [showReceivedPicker, setShowReceivedPicker] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const list: LostFoundItem[] = raw ? JSON.parse(raw) : [];
        setItems(Array.isArray(list) ? list : []);
      } catch {}
    })();
  }, []);

  const saveItems = async (list: LostFoundItem[]) => {
    setItems(list);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  };

  const addEntry = async () => {
    const newItem: LostFoundItem = {
      id: String(Date.now()),
      serialNo: serialNo.trim(),
      foundAt: foundAt.toISOString(),
      itemDesc: itemDesc.trim(),
      quantity: Math.max(0, parseInt(quantity || '0', 10) || 0),
      foundBy: foundBy.trim(),
      receivedBy: receivedBy.trim(),
      receivedAt: receivedAt.toISOString(),
      handedOver: handedOver.trim(),
      contact: contact.trim(),
      remarks: remarks.trim(),
    };
    const list = [newItem, ...items];
    await saveItems(list);
    setSerialNo('');
    setItemDesc('');
    setQuantity('1');
    setFoundBy('');
    setReceivedBy('');
    setHandedOver('');
    setContact('');
    setRemarks('');
  };

  const renderItem = ({ item }: { item: LostFoundItem }) => {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{item.itemDesc || 'Item'}</Text>
        <Text style={styles.meta}>Serial: {item.serialNo || '-'}</Text>
        <Text style={styles.meta}>Qty: {item.quantity}</Text>
        <Text style={styles.meta}>Found: {new Date(item.foundAt).toLocaleString()}</Text>
        <Text style={styles.meta}>Found by: {item.foundBy || '-'}</Text>
        <Text style={styles.meta}>Received by: {item.receivedBy || '-'}</Text>
        <Text style={styles.meta}>Received at: {new Date(item.receivedAt).toLocaleString()}</Text>
        <Text style={styles.meta}>Handed over: {item.handedOver || '-'}</Text>
        <Text style={styles.meta}>Contact: {item.contact || '-'}</Text>
        {!!item.remarks && <Text style={styles.meta}>Remarks: {item.remarks}</Text>}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <View style={styles.form}>
            <Text style={styles.header}>Lost & Found</Text>
            <TextInput style={styles.input} placeholder="Serial no." value={serialNo} onChangeText={setSerialNo} />
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFoundPicker(true)}>
              <Text style={styles.dateTxt}>Found at: {foundAt.toLocaleString()}</Text>
            </TouchableOpacity>
            {showFoundPicker && (
              <DateTimePicker
                value={foundAt}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, d) => {
                  setShowFoundPicker(false);
                  if (d) setFoundAt(d);
                }}
              />
            )}
            <TextInput style={styles.input} placeholder="Item description" value={itemDesc} onChangeText={setItemDesc} />
            <TextInput style={styles.input} placeholder="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Found by" value={foundBy} onChangeText={setFoundBy} />
            <TextInput style={styles.input} placeholder="Received by" value={receivedBy} onChangeText={setReceivedBy} />
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowReceivedPicker(true)}>
              <Text style={styles.dateTxt}>Received at: {receivedAt.toLocaleString()}</Text>
            </TouchableOpacity>
            {showReceivedPicker && (
              <DateTimePicker
                value={receivedAt}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, d) => {
                  setShowReceivedPicker(false);
                  if (d) setReceivedAt(d);
                }}
              />
            )}
            <TextInput style={styles.input} placeholder="Handed over" value={handedOver} onChangeText={setHandedOver} />
            <TextInput style={styles.input} placeholder="Contact" value={contact} onChangeText={setContact} keyboardType="phone-pad" />
            <TextInput style={[styles.input, { height: 80 }]} placeholder="Remarks" value={remarks} onChangeText={setRemarks} multiline />
            <TouchableOpacity style={styles.addBtn} onPress={addEntry}>
              <Text style={styles.addTxt}>Add</Text>
            </TouchableOpacity>
            <Text style={styles.subHeader}>Recent Entries</Text>
          </View>
        }
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: SIZES.padding }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  form: { padding: SIZES.padding },
  header: { ...FONTS.h2, color: COLORS.textDark, marginBottom: 12 },
  subHeader: { ...FONTS.body2, color: COLORS.textDark, marginTop: 12 },
  input: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: SIZES.radius, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  dateBtn: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: SIZES.radius, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 10 },
  dateTxt: { ...FONTS.body3, color: COLORS.textDark },
  addBtn: { backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 12, alignItems: 'center', ...SHADOWS.small },
  addTxt: { ...FONTS.body3, color: COLORS.white },
  card: { backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.padding, marginHorizontal: SIZES.padding, marginTop: 10, ...SHADOWS.large },
  title: { ...FONTS.body2, color: COLORS.textDark },
  meta: { ...FONTS.caption, color: COLORS.textLight, marginTop: 2 },
});

export default LostFoundScreen;
