import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { COLORS, FONTS, SIZES } from '../../theme/theme';
import userService from '../../services/users/userService';
import { useAuth } from '../../context/AuthContext';

type ChatUser = { id: string; name: string; email?: string; role?: string };

const demoUsers: ChatUser[] = [
  { id: 'u101', name: 'Alice Johnson' },
  { id: 'u102', name: 'Bob Singh' },
  { id: 'u103', name: 'Charlie Kumar' },
  { id: 'u104', name: 'Diana Verma' },
];

const UserListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      // Load real users for authenticated clients
      const list = await userService.listUsers(search).catch(() => demoUsers);
      const normalized = (list || []).map((u: any) => ({ id: String(u.id), name: u.name || u.fullName || 'Unknown', email: u.email, role: u.role }));
      const filtered = normalized.filter(u => u.id !== String(user?.id) && u.role !== 'admin');
      setUsers(filtered);
    } catch (e) {
      setUsers(demoUsers.filter(u => u.id !== String(user?.id)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startChat = (target: ChatUser) => {
    navigation.navigate('Chat', { targetUserId: target.id, targetUserName: target.name });
  };

  const renderItem = ({ item }: { item: ChatUser }) => (
    <TouchableOpacity style={styles.card} onPress={() => startChat(item)}>
      <View style={{ flex:1 }}>
        <Text style={styles.name}>{item.name}</Text>
        {!!item.email && <Text style={styles.meta}>{item.email}</Text>}
      </View>
      <View style={styles.action}><Text style={styles.actionTxt}>Chat</Text></View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>Select a user to chat</Text></View>
      <View style={styles.searchRow}>
        <TextInput value={search} onChangeText={setSearch} placeholder="Search users by name"
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
  container: { flex:1, backgroundColor: COLORS.primaryLight },
  header: { paddingHorizontal: SIZES.padding, paddingTop: SIZES.padding },
  title: { ...FONTS.h2, color: COLORS.textDark },
  searchRow: { flexDirection:'row', paddingHorizontal: SIZES.padding, paddingTop: SIZES.base, alignItems:'center' },
  input: { flex:1, borderWidth:1, borderColor: COLORS.lightGray, borderRadius:8, paddingHorizontal:12, paddingVertical:8, marginRight:8, backgroundColor: COLORS.card },
  searchBtn: { backgroundColor: COLORS.primary, paddingHorizontal:14, paddingVertical:10, borderRadius:8 },
  searchTxt: { ...FONTS.body2, color: COLORS.white },
  center: { flex:1, alignItems:'center', justifyContent:'center' },
  card: { backgroundColor: COLORS.card, marginHorizontal: SIZES.padding, marginVertical: 8, padding: 12, borderRadius: 12, flexDirection:'row', alignItems:'center' },
  name: { ...FONTS.h4, color: COLORS.textDark },
  meta: { ...FONTS.body3, color: COLORS.textLight, marginTop: 4 },
  action: { backgroundColor: COLORS.accent, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginLeft: 10 },
  actionTxt: { ...FONTS.body2, color: COLORS.white },
});

export default UserListScreen;
