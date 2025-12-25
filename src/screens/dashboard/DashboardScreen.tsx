import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  FlatList,
  ImageBackground,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import roomService from '../../services/rooms/roomService';
import esp8266Service from '../../services/esp8266/esp8266Service';
import productService, { Product } from '../../services/ecommerce/productService';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { COLORS, FONTS, SHADOWS, SIZES } from '../../theme/theme';
import logService from '../../services/logging/logService';
import axios from 'axios';

interface Room {
  id: string;
  name: string;
  deviceCount: number;
}

interface Device {
  id: string;
  name: string;
  type: string;
  status: 'on' | 'off';
  roomId: string | null;
}

const DashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDevices, setActiveDevices] = useState(0);
  const [totalDevices, setTotalDevices] = useState(0);
  const [forceUpdateUrl, setForceUpdateUrl] = useState<string | null>(null);

  // Prevent blank screen on slow/blocked network: enforce per-call timeouts
  const withTimeout = async <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
    ]);
  };

  useEffect(() => {
    loadDashboardData();

    const unsubscribe = navigation?.addListener ? navigation.addListener('focus', () => {
      loadDashboardData();
    }) : null;

    return unsubscribe || (() => {});
  }, [navigation]);

  useEffect(() => {
    const checkAppUpdate = async () => {
      try {
        if (Platform.OS === 'web') return;
        const platform = Platform.OS;
        const packageName = 'com.voodoohomes2';
        const bundleId = 'org.reactjs.native.example.voodoohomeS2';
        const currentVersion = Platform.OS === 'android' ? '1.1.1' : '1.0.0';
        const params: any = { platform, currentVersion };
        if (platform === 'android') params.packageName = packageName; else params.bundleId = bundleId;
        if (platform === 'ios') {
          const lookup = `https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(bundleId)}&country=IN`;
          const resp = await axios.get(lookup, { timeout: 12000 });
          const result = resp.data && resp.data.results && resp.data.results[0];
          const latestVersion = result?.version;
          const storeUrl = result?.trackViewUrl;
          const newer = latestVersion && compareVersions(latestVersion, currentVersion) > 0;
          if (newer && storeUrl) setForceUpdateUrl(storeUrl);
        } else if (platform === 'android') {
          const url = `https://play.google.com/store/apps/details?id=${encodeURIComponent(packageName)}&hl=en&gl=US`;
          const { data: html } = await axios.get(url, { timeout: 12000, headers: { 'User-Agent': 'Mozilla/5.0' } });
          const candidates: string[] = [];
          const re1 = /"currentVersion"\s*:\s*"([^"]+)"/i;
          const re2 = /softwareVersion"[^>]*>([^<]+)</i;
          const re3 = /<div[^>]*>Current Version<\/div>\s*<span[^>]*><div[^>]*><span[^>]*>([^<]+)</i;
          const m1 = html.match(re1); if (m1) candidates.push(m1[1]);
          const m2 = html.match(re2); if (m2) candidates.push(m2[1]);
          const m3 = html.match(re3); if (m3) candidates.push(m3[1]);
          const latestVersion = normalizeVersion(candidates.find(Boolean));
          const storeUrl = `https://play.google.com/store/apps/details?id=${packageName}`;
          const newer = latestVersion && compareVersions(latestVersion, currentVersion) > 0;
          if (newer) setForceUpdateUrl(storeUrl);
        }
      } catch (e) {
        // ignore failures
      }
    };
    checkAppUpdate();
  }, []);

  const normalizeVersion = (v: string) => String(v || '').trim();
  const compareVersions = (a: string, b: string) => {
    const pa = normalizeVersion(a).split('.').map(n => parseInt(n, 10) || 0);
    const pb = normalizeVersion(b).split('.').map(n => parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
      const da = pa[i] || 0; const db = pb[i] || 0;
      if (da > db) return 1;
      if (da < db) return -1;
    }
    return 0;
  };

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load rooms
      const roomsData = await withTimeout(roomService.getRooms(), 6000, []);
      setRooms(roomsData);

      // Load devices
      const devicesData = await withTimeout(esp8266Service.getAllDevices(), 6000, []);
      setDevices(devicesData);

      // Load products from API
      const productsData = await withTimeout(productService.getProducts(), 6000, []);
      setProducts(productsData.slice(0, 5)); // Show only first 5 products on dashboard

      // Calculate statistics
      const active = devicesData.filter(device => device.status === 'on').length;
      setActiveDevices(active);
      setTotalDevices(devicesData.length);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load dashboard data',
        position: 'bottom'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToRoom = async (roomId: string) => {
    try { await logService.logButtonClick('Navigate Room Detail', { roomId }); } catch (e) {}
    navigation.navigate('Rooms', {
      screen: 'RoomDetail',
      params: { roomId }
    });
  };

  const navigateToDevice = async (deviceId: string) => {
    try { await logService.logButtonClick('Navigate Device Control', { deviceId }); } catch (e) {}
    navigation.navigate('Devices', {
      screen: 'DeviceControl',
      params: { deviceId }
    });
  };

  const getRoomImage = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('living'))
      return 'https://images.unsplash.com/photo-1505691723518-36a5ac3b2b8f?q=80&w=1200&auto=format&fit=crop';
    if (n.includes('kitchen'))
      return 'https://images.unsplash.com/photo-1496412705862-e0088f16f791?q=80&w=1200&auto=format&fit=crop';
    if (n.includes('bed'))
      return 'https://images.unsplash.com/photo-1505691723518-41e5e5b2b8f0?q=80&w=1200&auto=format&fit=crop';
    if (n.includes('bath'))
      return 'https://images.unsplash.com/photo-1617093627127-6c4b7f2a9f50?q=80&w=1200&auto=format&fit=crop';
    return 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?q=80&w=1200&auto=format&fit=crop';
  };

  const renderRoomItem = ({ item }: { item: Room }) => (
    <TouchableOpacity onPress={() => navigateToRoom(item.id)} style={styles.roomCardImageWrap}>
      <ImageBackground
        source={{ uri: getRoomImage(item.name) }}
        style={styles.roomCardImage}
        imageStyle={styles.roomCardImageInner}
      >
        <View style={styles.roomCardOverlay}>
          <Text style={styles.roomName}>{item.name}</Text>
          <Text style={styles.deviceCount}>{item.deviceCount} devices</Text>
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );

  const renderDeviceItem = ({ item }: { item: Device }) => (
    <TouchableOpacity
      style={[styles.deviceCard, { backgroundColor: item.status === 'on' ? '#e6f7ff' : '#f5f5f5' }]}
      onPress={() => navigateToDevice(item.id)}
    >
      <View style={styles.deviceInfo}>
        <Text style={styles.deviceName}>{item.name}</Text>
        <Text style={styles.deviceType}>{item.type}</Text>
      </View>
      <View style={[styles.statusIndicator, { backgroundColor: item.status === 'on' ? '#4CAF50' : '#9E9E9E' }]} />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        </SafeAreaView>
    );
  }

  return (
  <View style={{ flex: 1, minHeight: '100vh', backgroundColor: '#f2f5f9' }}>
      <Modal visible={!!forceUpdateUrl} animationType="fade" transparent={false}>
        <View style={{ flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Card style={{ width: '90%' }} elevation="medium">
            <Text style={{ ...FONTS.h2, color: COLORS.textDark, marginBottom: 8 }}>Update Required</Text>
            <Text style={{ ...FONTS.body2, color: COLORS.textLight, marginBottom: 16 }}>A newer version of the app is available. Please update to continue.</Text>
            <Button
              title="Update Now"
              onPress={() => {
                if (forceUpdateUrl) Linking.openURL(forceUpdateUrl);
              }}
            />
          </Card>
        </View>
      </Modal>
      <ScrollView contentContainerStyle={styles.scrollContent}>
     

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard} elevation="small">
            <Text style={styles.statValue}>{rooms.length}</Text>
            <Text style={styles.statLabel}>Rooms</Text>
          </Card>
          <Card style={styles.statCard} elevation="small">
            <Text style={styles.statValue}>{totalDevices}</Text>
            <Text style={styles.statLabel}>Devices</Text>
          </Card>
          <Card style={styles.statCard} elevation="small">
            <Text style={styles.statValue}>{activeDevices}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </Card>
        </View>

        {/* Rooms Section (matches screenshot style) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Rooms</Text>
            <TouchableOpacity onPress={async () => { try { await logService.logButtonClick('See All Rooms'); } catch (e) {} ; navigation.navigate('Rooms'); }}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {rooms.length > 0 ? (
            <FlatList
              data={rooms.slice(0, 5)}
              renderItem={renderRoomItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.roomsList}
            />
          ) : (
            <Text style={styles.emptyText}>No rooms added yet</Text>
          )}
        </View>

        {/* Favorite Devices (2x2 grid with power toggle) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Favorite Devices</Text>
            <TouchableOpacity onPress={async () => { try { await logService.logButtonClick('See All Devices'); } catch (e) {} ; navigation.navigate('Devices'); }}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {devices.length > 0 ? (
            <View style={styles.devicesList}>
              {devices.slice(0, 4).map(device => (
                <View
                  key={device.id}
                  style={[
                    styles.deviceCard,
                    device.status === 'on' ? styles.deviceCardOn : styles.deviceCardOff,
                  ]}
                >
                  <View style={styles.deviceIconBubble}>
                    <Text style={styles.deviceIconText}>{device.type?.[0] || '🔌'}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => navigateToDevice(device.id)}
                    style={{ flex: 1 }}
                    activeOpacity={0.8}
                  >
                    <View style={styles.deviceInfo}>
                      <Text style={[styles.deviceName, device.status === 'on' ? styles.deviceTextOn : styles.deviceTextOff]}>{device.name}</Text>
                      <Text style={[styles.deviceType, device.status === 'on' ? styles.deviceSubTextOn : styles.deviceSubTextOff]}>{device.type}</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={async () => {
                      const next = device.status === 'on' ? 'off' : 'on';
                      const ok = await esp8266Service.controlDeviceOnServer(device.id, next as any);
                      if (ok) {
                        setDevices(prev => prev.map(d => d.id === device.id ? { ...d, status: next as any } : d));
                      } else {
                        Toast.show({ type: 'error', text1: 'Action failed', text2: 'Could not toggle device', position: 'bottom' });
                      }
                    }}
                    style={styles.powerButton}
                  >
                    <View style={[styles.powerDot, device.status === 'on' ? styles.powerDotOn : styles.powerDotOff]} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No devices added yet</Text>
          )}
        </View>

        {/* Products Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Products</Text>
            <TouchableOpacity onPress={async () => { try { await logService.logButtonClick('See All Products'); } catch (e) {} ; navigation.navigate('Shop'); }}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {products.length > 0 ? (
            <FlatList
              data={products}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.productCard}
                  onPress={async () => { try { await logService.logButtonClick('View Product', { productId: item.id, name: item.name }); } catch (e) {} ; navigation.navigate('Shop', {
                    screen: 'ProductDetail',
                    params: { productId: item.id }
                  }); }}
                >
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
                    <Text style={styles.productCategory}>{item.category}</Text>
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productsList}
            />
          ) : (
            <Text style={styles.emptyText}>No products available</Text>
          )}
        </View>

        {/* Quick Actions (icons row) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickRow}>
            {[
              { label: 'Good Morning', emoji: '🌅' },
              { label: 'Good Night', emoji: '🌙' },
              { label: 'Movie Time', emoji: '🎬' },
              { label: 'Dinner', emoji: '🍽️' },
            ].map((a) => (
              <TouchableOpacity key={a.label} style={styles.quickItem} activeOpacity={0.85}>
                <View style={styles.quickIcon}><Text style={styles.quickEmoji}>{a.emoji}</Text></View>
                <Text style={styles.quickLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({container: {
  flex: 1,
  backgroundColor: '#f2f5f9',
},
loadingContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: COLORS.background,
},
scrollContent: {
  padding: SIZES.padding,
},
  header: {
    marginBottom: SIZES.margin,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  burger: { width: 32, height: 24, justifyContent: 'space-between', marginRight: 12 },
  burgerLine: { height: 3, backgroundColor: COLORS.white, borderRadius: 2 },
  title: {
    ...FONTS.h1,
    color: COLORS.white,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
statsContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: SIZES.margin * 1.5,
},
statCard: {
  width: '30%',
  alignItems: 'center',
  padding: SIZES.padding / 2,
},
statValue: {
  ...FONTS.h2,
  color: COLORS.primary,
  marginBottom: SIZES.base / 2,
},
statLabel: {
  ...FONTS.body3,
  color: COLORS.textLight,
},
section: {
  marginBottom: SIZES.margin * 1.5,
},
sectionHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: SIZES.margin / 2,
},
sectionTitle: {
  ...FONTS.h3,
  color: COLORS.textDark,
},
seeAllText: {
  ...FONTS.body3,
  color: COLORS.primary,
},
  roomsList: { paddingRight: SIZES.padding },
  roomCardImageWrap: { width: 180, marginRight: SIZES.margin },
  roomCardImage: { width: '100%', height: 110, justifyContent: 'flex-end' },
  roomCardImageInner: { borderRadius: SIZES.radius },
  roomCardOverlay: { backgroundColor: 'rgba(255,255,255,0.9)', borderBottomLeftRadius: SIZES.radius, borderBottomRightRadius: SIZES.radius, padding: SIZES.base },
  roomName: {
    ...FONTS.h4,
    color: COLORS.textDark,
    marginBottom: SIZES.base,
  },
  deviceCount: {
    ...FONTS.body3,
    color: COLORS.textLight,
  },
devicesList: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
},
  deviceCard: {
    width: '48%',
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.margin,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  deviceCardOn: { backgroundColor: '#163a63' },
  deviceCardOff: { backgroundColor: COLORS.white },
  deviceIconBubble: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryLight, marginRight: 12 },
  deviceIconText: { fontSize: 16 },
  deviceInfo: {
    flex: 1,
  },
  deviceName: { ...FONTS.body2, marginBottom: SIZES.base / 2 },
  deviceType: { ...FONTS.body3 },
  deviceTextOn: { color: COLORS.white },
  deviceSubTextOn: { color: '#cfe3ff' },
  deviceTextOff: { color: COLORS.textDark },
  deviceSubTextOff: { color: COLORS.textLight },
  powerButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  powerDot: { width: 14, height: 14, borderRadius: 7 },
  powerDotOn: { backgroundColor: COLORS.accent },
  powerDotOff: { backgroundColor: COLORS.gray },
  emptyText: {
    ...FONTS.body2,
    color: COLORS.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: SIZES.margin,
  },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: SIZES.base },
  quickItem: { alignItems: 'center', width: '23%' },
  quickIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', ...SHADOWS.small },
  quickEmoji: { fontSize: 20 },
  quickLabel: { ...FONTS.small, color: COLORS.textLight, marginTop: 6 },
  productsList: {
    paddingRight: SIZES.padding,
  },
  productCard: {
    width: 150,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    marginRight: SIZES.margin,
    marginVertical: SIZES.small,
    ...SHADOWS.medium,
  },
productImage: {
  width: '100%',
  height: 100,
  borderTopLeftRadius: SIZES.radius,
  borderTopRightRadius: SIZES.radius,
},
productInfo: {
  padding: SIZES.padding,
},
productName: {
  ...FONTS.body3,
  color: COLORS.textDark,
  marginBottom: SIZES.base / 2,
},
productPrice: {
  ...FONTS.h4,
  color: COLORS.primary,
  marginBottom: SIZES.base / 2,
},
  productCategory: {
    ...FONTS.small,
    color: COLORS.textLight,
  },
});

export default DashboardScreen;
