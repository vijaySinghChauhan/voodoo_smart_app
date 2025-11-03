import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import addressApi, { AddressDTO } from '../../services/ecommerce/addressApi';

type Address = {
  id: string;
  name: string;
  email?: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault?: boolean;
};

interface RouteParams {
  addressId?: string;
}

const AddressEditScreen: React.FC<{ route: { params?: RouteParams }, navigation: any }> = ({ route, navigation }) => {
  const addressId = route?.params?.addressId;
  const [form, setForm] = useState<Omit<Address, 'id'>>({
    name: '',
    email: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    isDefault: false,
  });
  const [editing, setEditing] = useState<Address | null>(null);

  const load = async () => {
    if (!addressId) return;
    try {
      const list = await addressApi.list();
      const normalized: Address[] = list.map((a: any) => ({
        id: String(a.id ?? a._id ?? ''),
        name: a.name,
        email: a.email || '',
        phone: a.phone,
        addressLine1: a.addressLine1,
        addressLine2: a.addressLine2 || '',
        city: a.city,
        state: a.state,
        zipCode: a.zipCode,
        country: a.country,
        isDefault: !!a.isDefault,
      }));
      const found = normalized.find((addr: Address) => addr.id === addressId) || null;
      setEditing(found);
      if (found) {
        setForm({
          name: found.name,
          email: found.email || '',
          phone: found.phone,
          addressLine1: found.addressLine1,
          addressLine2: found.addressLine2 || '',
          city: found.city,
          state: found.state,
          zipCode: found.zipCode,
          country: found.country,
          isDefault: !!found.isDefault,
        });
      }
    } catch (err) {
      // If API fails, keep form as-is
    }
  };

  useEffect(() => {
    load();
  }, [addressId]);

  const updateField = (key: keyof Omit<Address, 'id'>, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value } as Omit<Address, 'id'>));
  };

  const handleAutofill = async () => {
    Toast.show({ type: 'info', text1: 'Autofill not available', position: 'bottom' });
  };

  const handleSave = async () => {
    // Basic validation
    if (!form.name || !form.email || !form.phone || !form.addressLine1 || !form.city || !form.state || !form.zipCode || !form.country) {
      Toast.show({ type: 'error', text1: 'Please fill all required fields', position: 'bottom' });
      return;
    }

    if (editing) {
      try {
        await addressApi.update(editing.id, form as AddressDTO);
        Toast.show({ type: 'success', text1: 'Address updated', position: 'bottom' });
        navigation.goBack();
      } catch (err) {
        Toast.show({ type: 'error', text1: 'Failed to update address', position: 'bottom' });
        return;
      }
    } else {
      try {
        await addressApi.create(form as AddressDTO);
        Toast.show({ type: 'success', text1: 'Address added', position: 'bottom' });
        navigation.goBack();
      } catch (err) {
        Toast.show({ type: 'error', text1: 'Failed to add address', position: 'bottom' });
        return;
      }
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    Alert.alert('Delete Address', 'Are you sure you want to delete this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await addressApi.remove(editing.id);
            Toast.show({ type: 'success', text1: 'Address deleted', position: 'bottom' });
            navigation.goBack();
          } catch (err) {
            Toast.show({ type: 'error', text1: 'Failed to delete address', position: 'bottom' });
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{editing ? 'Edit Address' : 'Add Address'}</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={form.name} onChangeText={(t) => updateField('name', t)} placeholder="Full Name" />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={form.email as string} onChangeText={(t) => updateField('email', t)} placeholder="Email" keyboardType="email-address" autoCapitalize="none" />

        <Text style={styles.label}>Phone</Text>
        <TextInput style={styles.input} value={form.phone} onChangeText={(t) => updateField('phone', t)} placeholder="Phone Number" keyboardType="phone-pad" />

        <Text style={styles.label}>Address Line 1</Text>
        <TextInput style={styles.input} value={form.addressLine1} onChangeText={(t) => updateField('addressLine1', t)} placeholder="Street, area" />

        <Text style={styles.label}>Address Line 2</Text>
        <TextInput style={styles.input} value={form.addressLine2} onChangeText={(t) => updateField('addressLine2', t)} placeholder="Apartment, landmark (optional)" />

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>City</Text>
            <TextInput style={styles.input} value={form.city} onChangeText={(t) => updateField('city', t)} placeholder="City" />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>State</Text>
            <TextInput style={styles.input} value={form.state} onChangeText={(t) => updateField('state', t)} placeholder="State" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.col}>
            <Text style={styles.label}>ZIP</Text>
            <TextInput style={styles.input} value={form.zipCode} onChangeText={(t) => updateField('zipCode', t)} placeholder="ZIP" keyboardType="number-pad" />
          </View>
          <View style={styles.col}>
            <Text style={styles.label}>Country</Text>
            <TextInput style={styles.input} value={form.country} onChangeText={(t) => updateField('country', t)} placeholder="Country" />
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.button, styles.autofill]} onPress={handleAutofill}>
            <Text style={styles.buttonText}>Use Current Location</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.save]} onPress={handleSave}>
            <Text style={[styles.buttonText, styles.saveText]}>Save</Text>
          </TouchableOpacity>
          {editing && (
            <TouchableOpacity style={[styles.button, styles.delete]} onPress={handleDelete}>
              <Text style={[styles.buttonText, styles.deleteText]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  label: { marginTop: 12, marginBottom: 6, color: '#333' },
  input: { borderWidth: 1, borderColor: '#e3e7ee', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#f7f9fc' },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  button: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8 },
  autofill: { backgroundColor: '#e9eef6' },
  save: { backgroundColor: '#4a90e2' },
  buttonText: { color: '#1a3b5d', fontWeight: '600' },
  saveText: { color: '#fff' },
  delete: { backgroundColor: '#fdecec' },
  deleteText: { color: '#d9534f' },
});

export default AddressEditScreen;