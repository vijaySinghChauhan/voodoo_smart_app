import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import adminService from '../../services/admin/adminService';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../theme/theme';

const AdminUsersScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const list = await adminService.listUsers(search);
      setUsers(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('AdminUserDetail', { user: item })}>
      <View style={{ flex:1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>{item.email} • {item.role}</Text>
      </View>
      <View style={styles.badges}>
        <Text style={styles.badge}>Rooms: {item.roomCount}</Text>
        <Text style={styles.badge}>Devices: {item.deviceCount}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>Manage Users</Text></View>
      <View style={styles.searchRow}>
        <TextInput value={search} onChangeText={setSearch} placeholder="Search name, email, phone"
          style={styles.input} placeholderTextColor={COLORS.textLight} />
        <TouchableOpacity style={styles.searchBtn} onPress={load}><Text style={styles.searchTxt}>Search</Text></TouchableOpacity>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator /></View>
      ) : (
        <FlatList data={users} keyExtractor={(u)=>String(u.id)} renderItem={renderItem} contentContainerStyle={{ padding:SIZES.padding }} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor: COLORS.background },
  header: { padding: SIZES.padding },
  title: { ...FONTS.h2, color: COLORS.textDark },
  searchRow: { flexDirection:'row', alignItems:'center', paddingHorizontal: SIZES.padding },
  input: { flex:1, backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: 10, marginRight: 8, ...SHADOWS.small },
  searchBtn: { backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingHorizontal: 10, paddingVertical: 6 },
  searchTxt: { ...FONTS.body3, color: COLORS.white },
  center: { flex:1, alignItems:'center', justifyContent:'center' },
  card: { flexDirection:'row', alignItems:'center', backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.padding, marginBottom: 10, ...SHADOWS.large },
  name: { ...FONTS.h4, color: COLORS.textDark },
  meta: { ...FONTS.caption, color: COLORS.textLight },
  badges: { alignItems:'flex-end' },
  badge: { ...FONTS.caption, color: COLORS.textLight }
});

export default AdminUsersScreen;
