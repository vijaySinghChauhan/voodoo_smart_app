import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import adminService from '../../services/admin/adminService';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../theme/theme';

const AdminUserDetailScreen: React.FC<{ route: any }> = ({ route }) => {
  const { user } = route.params;
  const [rooms, setRooms] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const rs = await adminService.getUserRooms(user.id);
        const ds = await adminService.getUserDevices(user.id);
        setRooms(rs);
        setDevices(ds);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user.id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}><View style={styles.center}><ActivityIndicator /></View></SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>{user.name}</Text><Text style={styles.sub}>{user.email} • {user.role}</Text></View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Rooms</Text>
        <FlatList data={rooms} keyExtractor={(r)=>String(r.id)} renderItem={({item}) => (
          <View style={styles.card}><Text style={styles.cardTitle}>{item.name}</Text><Text style={styles.cardSub}>{item.deviceCount} devices</Text></View>
        )} />
      </View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Devices</Text>
        <FlatList data={devices} keyExtractor={(d)=>String(d.id)} renderItem={({item}) => (
          <View style={styles.card}><Text style={styles.cardTitle}>{item.name}</Text><Text style={styles.cardSub}>{item.deviceType || 'Device'} • {item.isOn ? 'On' : 'Off'}</Text></View>
        )} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor: COLORS.background },
  center: { flex:1, alignItems:'center', justifyContent:'center' },
  header: { padding: SIZES.padding },
  title: { ...FONTS.h2, color: COLORS.textDark },
  sub: { ...FONTS.caption, color: COLORS.textLight },
  section: { paddingHorizontal: SIZES.padding, marginTop: SIZES.margin },
  sectionTitle: { ...FONTS.h3, color: COLORS.textDark, marginBottom: 8 },
  card: { backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.padding, marginBottom: 10, ...SHADOWS.small },
  cardTitle: { ...FONTS.body2, color: COLORS.textDark },
  cardSub: { ...FONTS.caption, color: COLORS.textLight }
});

export default AdminUserDetailScreen;
