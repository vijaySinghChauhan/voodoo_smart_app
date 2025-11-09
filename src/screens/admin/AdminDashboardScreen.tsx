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

  const makeWeeklyFallback = (weeks = 8) => {
    const now = new Date();
    const monday = new Date(now);
    const day = monday.getDay();
    const diffToMonday = (day + 6) % 7; // 0->6, 1->0, ...
    monday.setDate(monday.getDate() - diffToMonday);
    const res: Array<{ label: string; value: number }> = [];
    for (let i = weeks - 1; i >= 0; i--) {
      const start = new Date(monday);
      start.setDate(monday.getDate() - i * 7);
      const yyyy = start.getFullYear();
      const mm = String(start.getMonth() + 1).padStart(2, '0');
      const dd = String(start.getDate()).padStart(2, '0');
      res.push({ label: `Wk ${yyyy}-${mm}-${dd}`, value: 0 });
    }
    return res;
  };

  const randInt = (min:number, max:number) => Math.floor(Math.random() * (max - min + 1)) + min;
  const makeWeeklyDemo = (weeks = 8, min = 2, max = 12) => {
    const base = makeWeeklyFallback(weeks);
    return base.map(b => ({ label: b.label, value: randInt(min, max) }));
  };

  const userData = ((stats?.users?.trend || []).length
    ? (stats?.users?.trend || []).map((d:any) => ({ label: d.week_start ? `Wk ${String(d.week_start)}` : String(d.day), value: d.count }))
    : makeWeeklyDemo(8, 3, 12));
  const subsData = ((stats?.subscriptions?.trend || []).length
    ? (stats?.subscriptions?.trend || []).map((d:any) => ({ label: d.week_start ? `Wk ${String(d.week_start)}` : String(d.day), value: d.count }))
    : makeWeeklyDemo(8, 1, 8));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Admin Dashboard</Text>

        <View style={styles.cardsRow}>
          <Card style={styles.card} elevation="small">
            <Text style={styles.cardValue}>{stats?.users?.total ?? 0}</Text>
            <Text style={styles.cardLabel}>Total Users</Text>
          </Card>
          <Card style={styles.card} elevation="small">
            <Text style={styles.cardValue}>{stats?.devices?.total ?? 0}</Text>
            <Text style={styles.cardLabel}>Total Devices</Text>
          </Card>
          <Card style={styles.card} elevation="small">
            <Text style={styles.cardValue}>{stats?.subscriptions?.total ?? 0}</Text>
            <Text style={styles.cardLabel}>Active Subscriptions</Text>
          </Card>
        </View>

        <View style={{ marginTop: SIZES.margin }}>
          <Text style={styles.sectionTitle}>Users (last 8 weeks)</Text>
          <BarChart data={userData} />
        </View>

        <View style={{ marginTop: SIZES.margin }}>
          <Text style={styles.sectionTitle}>Subscriptions (last 8 weeks)</Text>
          <BarChart data={subsData} />
        </View>

        <View style={{ marginTop: SIZES.margin }}>
          <Text style={styles.sectionTitle}>Logs (30-day pie)</Text>
          <PieChart
            data={((stats?.logs?.pie || []).length ? (stats?.logs?.pie || []) : [
              { type: 'login', count: randInt(20, 40) },
              { type: 'device_toggle', count: randInt(30, 60) },
              { type: 'error', count: randInt(1, 10) },
              { type: 'purchase', count: randInt(5, 15) }
            ]).map((row:any) => ({ label: row.type, value: row.count }))}
          />
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
  barLabel: { ...FONTS.body3, color: COLORS.textLight },
  barBg: { height: 10, backgroundColor: '#eee', borderRadius: 5 },
  barFill: { height: 10, backgroundColor: COLORS.primary, borderRadius: 5 },
  barValue: { ...FONTS.small, color: COLORS.textLight },
  logRow: { flexDirection:'row', justifyContent:'space-between', paddingVertical:6, borderBottomWidth:1, borderBottomColor:'#eee' },
  logType: { ...FONTS.body3, color: COLORS.textDark },
  logCount: { ...FONTS.body3, color: COLORS.textLight }
});

export default AdminDashboardScreen;
