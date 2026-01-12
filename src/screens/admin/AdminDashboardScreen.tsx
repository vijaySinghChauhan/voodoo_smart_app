import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import adminService from '../../services/admin/adminService';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../theme/theme';
import Card from '../../components/Card';
import BarChart from '../../components/BarChart';
import PieChart from '../../components/PieChart';

const Bar: React.FC<{ label: string; value: number; max: number }> = ({ label, value, max }) => {
  const width = max > 0 ? Math.max(8, Math.min(100, Math.round((value / max) * 100))) : 8;
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${width}%` }]} />
      </View>
      <Text style={styles.barValue}>{value}</Text>
    </View>
  );
};

const AdminDashboardScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const s = await adminService.getStats();
        setStats(s);
      } catch (e) {
        setStats(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}> 
        <View style={styles.center}><ActivityIndicator color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  const userData = (stats?.users?.trend || []).map((d:any) => ({ label: d.week_start ? `Wk ${String(d.week_start)}` : String(d.day), value: d.count }));
  const subsData = (stats?.subscriptions?.trend || []).map((d:any) => ({ label: d.week_start ? `Wk ${String(d.week_start)}` : String(d.day), value: d.count }));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Admin Dashboard</Text>

        <View style={styles.cardsRow}>
          <Card style={styles.card} elevation="large">
            <Text style={styles.cardValue}>{stats?.users?.total ?? 0}</Text>
            <Text style={styles.cardLabel}>Total Users</Text>
          </Card>
          <Card style={styles.card} elevation="large">
            <Text style={styles.cardValue}>{stats?.devices?.total ?? 0}</Text>
            <Text style={styles.cardLabel}>Total Devices</Text>
          </Card>
          <Card style={styles.card} elevation="large">
            <Text style={styles.cardValue}>{stats?.subscriptions?.total ?? 0}</Text>
            <Text style={styles.cardLabel}>Active Subscriptions</Text>
          </Card>
        </View>

        <View style={{ marginTop: SIZES.margin }}>
          <Text style={styles.sectionTitle}>Users (last 8 weeks)</Text>
          {userData.length > 0 ? (
            <BarChart data={userData} />
          ) : (
            <Text style={styles.noData}>No data</Text>
          )}
        </View>

        <View style={{ marginTop: SIZES.margin }}>
          <Text style={styles.sectionTitle}>Subscriptions (last 8 weeks)</Text>
          {subsData.length > 0 ? (
            <BarChart data={subsData} />
          ) : (
            <Text style={styles.noData}>No data</Text>
          )}
        </View>

        <View style={{ marginTop: SIZES.margin }}>
          <Text style={styles.sectionTitle}>Logs (30-day pie)</Text>
          {(stats?.logs?.pie || []).length > 0 ? (
            <PieChart data={(stats?.logs?.pie || []).map((row:any) => ({ label: row.type, value: row.count }))} />
          ) : (
            <Text style={styles.noData}>No data</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SIZES.padding },
  center: { flex:1, alignItems:'center', justifyContent:'center' },
  title: { ...FONTS.h1, color: COLORS.textDark, marginBottom: SIZES.margin },
  cardsRow: { flexDirection:'row', justifyContent:'space-between' },
  card: { width:'32%', alignItems:'center', padding:SIZES.padding/2 },
  cardValue: { ...FONTS.h2, color: COLORS.primary },
  cardLabel: { ...FONTS.body3, color: COLORS.textLight },
  sectionTitle: { ...FONTS.h3, color: COLORS.textDark, marginBottom: 8 },
  noData: { ...FONTS.body3, color: COLORS.textLight },
  barLabel: { ...FONTS.body3, color: COLORS.textLight },
  barBg: { height: 10, backgroundColor: '#eee', borderRadius: 5 },
  barFill: { height: 10, backgroundColor: COLORS.primary, borderRadius: 5 },
  barValue: { ...FONTS.small, color: COLORS.textLight },
  logRow: { flexDirection:'row', justifyContent:'space-between', paddingVertical:6, borderBottomWidth:1, borderBottomColor:'#eee' },
  logType: { ...FONTS.body3, color: COLORS.textDark },
  logCount: { ...FONTS.body3, color: COLORS.textLight }
});

export default AdminDashboardScreen;
