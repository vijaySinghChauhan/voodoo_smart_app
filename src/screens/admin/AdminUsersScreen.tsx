import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import adminService from '../../services/admin/adminService';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../theme/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { DataTable } from 'react-native-paper';

const AdminUsersScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await adminService.listUsers(search);
      setUsers(list);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {navigation.canGoBack() ? (
              <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12, padding: 4 }}>
                <Icon name="arrow-back" size={24} color={COLORS.textDark} />
              </TouchableOpacity>
            ) : null}
            <Text style={styles.title}>Manage Users</Text>
          </View>
        </View>
        <View style={styles.searchRow}>
          <TextInput value={search} onChangeText={setSearch} placeholder="Search name, email, phone"
            style={styles.input} placeholderTextColor={COLORS.textLight} />
          <TouchableOpacity style={styles.searchBtn} onPress={load}><Text style={styles.searchTxt}>Search</Text></TouchableOpacity>
        </View>
        {loading ? (
          <View style={styles.center}><ActivityIndicator /></View>
        ) : (
          <View style={{ paddingHorizontal: SIZES.padding }}>
            <View style={{ backgroundColor: COLORS.white, borderRadius: SIZES.radius, ...SHADOWS.large }}>
              <DataTable>
                <DataTable.Header>
                  <DataTable.Title><Text style={styles.th}>Name</Text></DataTable.Title>
                  <DataTable.Title><Text style={styles.th}>Email</Text></DataTable.Title>
                  <DataTable.Title><Text style={styles.th}>Phone</Text></DataTable.Title>
                  <DataTable.Title><Text style={styles.th}>Action</Text></DataTable.Title>
                </DataTable.Header>
                {users.map((u:any) => (
                  <DataTable.Row key={String(u.id)}>
                    <DataTable.Cell style={{ flex: 2 }}><Text style={styles.td}>{u.name}</Text></DataTable.Cell>
                    <DataTable.Cell style={{ flex: 2 }}><Text style={styles.td}>{u.email}</Text></DataTable.Cell>
                    <DataTable.Cell style={{ flex: 1.5 }}><Text style={styles.td}>{u.phone || ''}</Text></DataTable.Cell>
                    <DataTable.Cell style={{ flex: 1.2 }}>
                      <TouchableOpacity style={styles.viewBtn} activeOpacity={0.85} onPress={() => navigation.navigate('AdminUserDetail', { user: u })}>
                        <Text style={styles.viewTxt}>View</Text>
                      </TouchableOpacity>
                    </DataTable.Cell>
                  </DataTable.Row>
                ))}
              </DataTable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: SIZES.padding },
  header: { padding: SIZES.padding },
  title: { ...FONTS.h2, color: COLORS.textDark },
  searchRow: { flexDirection:'row', alignItems:'center', paddingHorizontal: SIZES.padding },
  input: { flex:1, backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: 10, marginRight: 8, ...SHADOWS.small },
  searchBtn: { backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingHorizontal: 10, paddingVertical: 6 },
  searchTxt: { ...FONTS.body3, color: COLORS.white },
  center: { flex:1, alignItems:'center', justifyContent:'center' },
  th: { ...FONTS.body3, color: COLORS.textLight },
  td: { ...FONTS.body3, color: COLORS.textDark },
  viewBtn: { backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  viewTxt: { ...FONTS.small, color: COLORS.white }
});

export default AdminUsersScreen;
