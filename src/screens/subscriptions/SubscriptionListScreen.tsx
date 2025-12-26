import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import subscriptionService from '../../services/subscriptions/subscriptionService';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../theme/theme';

const SubscriptionListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [plans, setPlans] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const ps = await subscriptionService.getPlans();
      const ss = await subscriptionService.listMy();
      setPlans(ps);
      setSubs(ss);
    } catch (e) {
      setPlans([]);
      setSubs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const renderPlan = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={{ flex:1 }}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.meta}>{item.price} {item.currency} / {item.interval}</Text>
      </View>
      <TouchableOpacity
        style={styles.buyBtn}
        onPress={() => navigation.navigate('SubscriptionCheckout', { plan: item })}
      >
        <Text style={styles.buyTxt}>Subscribe</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSub = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={{ flex:1 }}>
        <Text style={styles.name}>{item.plan}</Text>
        <Text style={styles.meta}>{item.status} • {new Date(item.startDate).toLocaleDateString()} - {item.endDate ? new Date(item.endDate).toLocaleDateString() : 'ongoing'}</Text>
      </View>
    </View>
  );

  if (loading) {
    return <SafeAreaView style={styles.container}><View style={styles.center}><ActivityIndicator /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}><Text style={styles.title}>Subscriptions</Text></View>
      <View style={styles.section}><Text style={styles.sectionTitle}>Available Plans</Text>
        {plans.length ? (
          <FlatList data={plans} keyExtractor={(p)=>String(p.id)} renderItem={renderPlan} />
        ) : (
          <Text style={styles.empty}>No plans found</Text>
        )}
      </View>
      <View style={styles.section}><Text style={styles.sectionTitle}>My Subscriptions</Text>
        {subs.length ? (
          <FlatList data={subs} keyExtractor={(s)=>String(s.id)} renderItem={renderSub} />
        ) : (
          <Text style={styles.empty}>No active subscriptions</Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex:1, backgroundColor: COLORS.background },
  center: { flex:1, alignItems:'center', justifyContent:'center' },
  header: { padding: SIZES.padding },
  title: { ...FONTS.h2, color: COLORS.textDark },
  section: { paddingHorizontal: SIZES.padding, marginTop: SIZES.margin },
  sectionTitle: { ...FONTS.h3, color: COLORS.textDark, marginBottom: 8 },
  card: { flexDirection:'row', alignItems:'center', backgroundColor: COLORS.white, borderRadius: SIZES.radius, padding: SIZES.padding, marginBottom: 10, ...SHADOWS.small },
  name: { ...FONTS.body2, color: COLORS.textDark },
  meta: { ...FONTS.caption, color: COLORS.textLight },
  buyBtn: { backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingHorizontal: 14, paddingVertical: 10 },
  buyTxt: { ...FONTS.body3, color: COLORS.white },
  empty: { ...FONTS.caption, color: COLORS.textLight, fontStyle:'italic' }
});

export default SubscriptionListScreen;
