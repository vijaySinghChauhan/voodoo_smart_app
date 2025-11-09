import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import userService from '../../services/users/userService';

interface SimpleUser {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

const demoUsers: SimpleUser[] = [
  { id: '2', name: 'Alice' },
  { id: '3', name: 'Bob' },
  { id: '4', name: 'Charlie' },
];

const UserAudioListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
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

  useEffect(() => { load(); }, [search]);

  const handleSelect = (u: SimpleUser) => {
    navigation.navigate('AudioCall', { targetUserId: u.id, targetUserName: u.name });
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search users"
        value={search}
        onChangeText={setSearch}
      />

      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.item} onPress={() => handleSelect(item)}>
              <Text style={styles.name}>{item.name}</Text>
              {item.email ? <Text style={styles.email}>{item.email}</Text> : null}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  search: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 12 },
  item: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#eee' },
  name: { fontSize: 16, fontWeight: '500' },
  email: { fontSize: 12, color: '#666' },
});

export default UserAudioListScreen;
