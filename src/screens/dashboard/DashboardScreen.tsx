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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import roomService from '../../services/rooms/roomService';
import esp8266Service from '../../services/esp8266/esp8266Service';
import productService, { Product } from '../../services/ecommerce/productService';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { COLORS, FONTS, SHADOWS, SIZES } from '../../theme/theme';
import logService from '../../services/logging/logService';

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

  useEffect(() => {
    loadDashboardData();

    // Refresh data when the screen is focused
    const unsubscribe = navigation.addListener('focus', () => {
      loadDashboardData();
    });

    return unsubscribe;
  }, [navigation]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load rooms
      const roomsData = await roomService.getRooms();
      setRooms(roomsData);

      // Load devices
      const devicesData = await esp8266Service.getAllDevices();
      setDevices(devicesData);

      // Load products from API
      const productsData = await productService.getProducts();
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

  const renderRoomItem = ({ item }: { item: Room }) => (
    <TouchableOpacity
      style={styles.roomCard}
      onPress={() => navigateToRoom(item.id)}
    >
      <Text style={styles.roomName}>{item.name}</Text>
      <Text style={styles.deviceCount}>{item.deviceCount} devices</Text>
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
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Smart Home Dashboard</Text>
        </View>

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

        {/* Rooms Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Rooms</Text>
            <TouchableOpacity onPress={async () => { try { await logService.logButtonClick('See All Rooms'); } catch (e) {} ; navigation.navigate('Rooms'); }}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {rooms.length > 0 ? (
            <FlatList
              data={rooms.slice(0, 3)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.roomCard}
                  onPress={() => navigateToRoom(item.id)}
                >
                  <Text style={styles.roomName}>{item.name}</Text>
                  <Text style={styles.deviceCount}>{item.deviceCount} devices</Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.roomsList}
            />
          ) : (
            <Text style={styles.emptyText}>No rooms added yet</Text>
          )}
        </View>

        {/* Devices Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Devices</Text>
            <TouchableOpacity onPress={async () => { try { await logService.logButtonClick('See All Devices'); } catch (e) {} ; navigation.navigate('Devices'); }}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {devices.length > 0 ? (
            <View style={styles.devicesList}>
              {devices.slice(0, 4).map(device => (
                <TouchableOpacity
                  key={device.id}
                  style={[styles.deviceCard, { backgroundColor: device.status === 'on' ? COLORS.primaryLight : COLORS.lightGray }]}
                  onPress={() => navigateToDevice(device.id)}
                >
                  <View style={styles.deviceInfo}>
                    <Text style={styles.deviceName}>{device.name}</Text>
                    <Text style={styles.deviceType}>{device.type}</Text>
                  </View>
                  <View style={[styles.statusIndicator, { backgroundColor: device.status === 'on' ? COLORS.accent : COLORS.gray }]} />
                </TouchableOpacity>
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

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsContainer}>
            <Button
              label="Add Room"
              onPress={() => navigation.navigate('Rooms', { screen: 'AddEditRoom' })}
              variant="primary"
              size="medium"
              style={styles.actionButton}
            />
            <Button
              label="Add Device"
              onPress={() => navigation.navigate('Devices', { screen: 'DeviceDiscovery' })}
              variant="secondary"
              size="medium"
              style={styles.actionButton}
            />
            <Button
              label="Shop"
              onPress={() => navigation.navigate('Shop')}
              variant="outline"
              size="medium"
              style={styles.actionButton}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({container: {
  flex: 1,
  backgroundColor: COLORS.background,
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
title: {
  ...FONTS.h1,
  color: COLORS.textDark,
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
roomsList: {
  paddingRight: SIZES.padding,
},
roomCard: {
  backgroundColor: COLORS.white,
  borderRadius: SIZES.radius,
  padding: SIZES.padding,
  marginRight: SIZES.margin,
  width: 160,
  ...SHADOWS.small,
},
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
  justifyContent: 'space-between',
  alignItems: 'center',
  ...SHADOWS.small,
},
deviceInfo: {
  flex: 1,
},
deviceName: {
  ...FONTS.body2,
  color: COLORS.textDark,
  marginBottom: SIZES.base / 2,
},
deviceType: {
  ...FONTS.body3,
  color: COLORS.textLight,
},
statusIndicator: {
  width: 12,
  height: 12,
  borderRadius: 6,
  marginLeft: SIZES.base,
},
emptyText: {
  ...FONTS.body2,
  color: COLORS.textLight,
  fontStyle: 'italic',
  textAlign: 'center',
  marginVertical: SIZES.margin,
},
actionsContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: SIZES.margin / 2,
},
actionButton: {
  width: '30%',
},
productsList: {
  paddingHorizontal: SIZES.padding,
},
productCard: {
  width: 150,
  backgroundColor: COLORS.white,
  borderRadius: SIZES.radius,
  marginRight: SIZES.margin,
  ...SHADOWS.light,
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
  ...FONTS.caption,
  color: COLORS.textLight,
},
});

export default DashboardScreen;
