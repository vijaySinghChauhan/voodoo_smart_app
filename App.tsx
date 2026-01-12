import 'react-native-gesture-handler';
import React from 'react';
import { Linking, Modal, View, Text, TouchableOpacity, StyleSheet, PermissionsAndroid, Platform } from 'react-native';
import InCallManager from 'react-native-incall-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, createNavigationContainerRef, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Toast from 'react-native-toast-message';
import { io, Socket } from 'socket.io-client';
import * as constantsV from './src/constants/constatantsV';
import authService from './src/services/auth/authService';
import userService from './src/services/users/userService';
import { notificationService } from './src/services/notifications/notificationService';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from './src/theme/theme';

// Splash Screen
import SplashScreen from './src/screens/SplashScreen';

// Auth Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import ProfileScreen from './src/screens/auth/ProfileScreen';

// ESP8266 Screens
import WiFiConfigScreen from './src/screens/WiFiConfigScreen';
import DeviceDiscoveryScreen from './src/screens/esp8266/DeviceDiscoveryScreen';
import DeviceControlScreen from './src/screens/esp8266/DeviceControlScreen';
import DevicesListScreen from './src/screens/esp8266/DevicesListScreen';
import CommonDevicesScreen from './src/screens/esp8266/CommonDevicesScreen';

// Chat Screen
import ChatScreen from './src/screens/chat/ChatScreen';
import UserListScreen from './src/screens/chat/UserListScreen';

// Audio Streaming Screens
import UserAudioListScreen from './src/screens/audio/UserAudioListScreen';
import AudioCallScreen from './src/screens/audio/AudioCallScreen';

// Room Management Screens
import RoomsScreen from './src/screens/rooms/RoomsScreen';
import RoomDetailScreen from './src/screens/rooms/RoomDetailScreen';
import AddEditRoomScreen from './src/screens/rooms/AddEditRoomScreen';
import AddDeviceToRoomScreen from './src/screens/rooms/AddDeviceToRoomScreen';

// E-commerce Screens
import ProductListScreen from './src/screens/ecommerce/ProductListScreen';
import ProductDetailScreen from './src/screens/ecommerce/ProductDetailScreen';
import CartScreen from './src/screens/ecommerce/CartScreen';
import CheckoutScreen from './src/screens/ecommerce/CheckoutScreen';
import OrderHistoryScreen from './src/screens/ecommerce/OrderHistoryScreen';
import AddressListScreen from './src/screens/ecommerce/AddressListScreen';
import AddressEditScreen from './src/screens/ecommerce/AddressEditScreen';

// Dashboard Screen
import DashboardScreen from './src/screens/dashboard/DashboardScreen';
// Admin & Subscriptions Screens
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import AdminUsersScreen from './src/screens/admin/AdminUsersScreen';
import AdminUserDetailScreen from './src/screens/admin/AdminUserDetailScreen';
import SubscriptionListScreen from './src/screens/subscriptions/SubscriptionListScreen';
import SubscriptionCheckoutScreen from './src/screens/subscriptions/SubscriptionCheckoutScreen';

// Context
import { AuthProvider, useAuth } from './src/context/AuthContext';
import WifiConnection from './src/services/esp8266/wifiConnection';
import orderService from './src/services/ecommerce/orderService';
import cartService from './src/services/ecommerce/cartService';
import DeviceAccessScreen from './src/screens/esp8266/DeviceAccessScreen';
import { PaperProvider } from 'react-native-paper';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();
const Tab = createBottomTabNavigator();

function ChatStack() {
  return (
    <Stack.Navigator initialRouteName="UserList">
      <Stack.Screen name="UserList" component={UserListScreen} options={{ title: 'Users', headerShown: false }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={({ route }: any) => ({ title: route?.params?.targetUserName ? `Chat: ${route.params.targetUserName}` : 'Chat' })} />
    </Stack.Navigator>
  );
}

function AudioStack() {
  return (
    <Stack.Navigator initialRouteName="UserAudioList">
      <Stack.Screen name="UserAudioList" component={UserAudioListScreen} options={{ title: 'Users (Audio)', headerShown: false }} />
      <Stack.Screen name="AudioCall" component={AudioCallScreen as React.ComponentType<any>} options={({ route }: any) => ({ title: route?.params?.targetUserName ? `Call: ${route.params.targetUserName}` : 'Audio Call' })} />
    </Stack.Navigator>
  );
}

export const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
    <Stack.Screen name="DashboardMain" component={MainTabs} />

  </Stack.Navigator>
);

const RoomsStack = () => (
  <Stack.Navigator initialRouteName="RoomsList">
    <Stack.Screen 
      name="RoomsList" 
      component={RoomsScreen as React.ComponentType<any>} 
      options={{ headerShown: false }} 
    />
    <Stack.Screen name="RoomDetail" component={RoomDetailScreen as React.ComponentType<any>} options={{ title: 'Room Details' }} />
    <Stack.Screen name="AddEditRoom" component={AddEditRoomScreen} options={({ route }) => ({ 
      title: (route.params as { room?: any })?.room ? 'Edit Room' : 'Add Room'
    })} />
    <Stack.Screen name="AddDeviceToRoom" component={AddDeviceToRoomScreen} options={{ title: 'Add Device' }} />
  </Stack.Navigator>
);

const EcommerceStack = () => (
  <Stack.Navigator initialRouteName="ProductList">
    <Stack.Screen name="ProductList" component={ProductListScreen} options={{ headerShown: false }} />
    <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product Details' }} />
    <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Shopping Cart' }} />
    <Stack.Screen name="Checkout" component={CheckoutScreen as React.ComponentType<any>} options={{ title: 'Checkout' }} />
    <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} options={{ title: 'Order History' }} />
    <Stack.Screen name="AddressList" component={AddressListScreen} options={{ title: 'My Addresses' }} />
    <Stack.Screen name="AddressEdit" component={AddressEditScreen} options={{ title: 'Edit Address' }} />
  </Stack.Navigator>
);

const ESP8266Stack = () => (
  <Stack.Navigator initialRouteName="DevicesList">
    <Stack.Screen name="DevicesList" component={DevicesListScreen} options={{ title: 'Devices', headerShown: false }} />
    <Stack.Screen
      name="DeviceDiscovery"
      component={DeviceDiscoveryScreen}
      options={({ navigation }) => ({
        title: 'Discover Devices',
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 12 }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
          </TouchableOpacity>
        ),
      })}
    />
    <Stack.Screen
      name="DeviceControl"
      component={DeviceControlScreen}
      options={({ navigation }) => ({
        title: 'Device Control',
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 12 }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
          </TouchableOpacity>
        ),
      })}
    />
    <Stack.Screen
      name="DeviceAccess"
      component={DeviceAccessScreen}
      options={({ navigation }) => ({
        title: 'Manage Access',
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 12 }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
          </TouchableOpacity>
        ),
      })}
    />
    <Stack.Screen
      name="WiFiConfig"
      component={WiFiConfigScreen}
      options={({ navigation }) => ({
        title: 'WiFi Configuration',
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 12 }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
          </TouchableOpacity>
        ),
      })}
    />
  </Stack.Navigator>
);

const SubscriptionsStack = () => (
  <Stack.Navigator initialRouteName="SubscriptionList">
    <Stack.Screen name="SubscriptionList" component={SubscriptionListScreen} options={{ title: 'Subscriptions', headerShown: false }} />
    <Stack.Screen
      name="SubscriptionCheckout"
      component={SubscriptionCheckoutScreen as React.ComponentType<any>}
      options={({ navigation }) => ({
        title: 'Checkout',
        headerLeft: () => (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 12 }}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
          </TouchableOpacity>
        ),
      })}
    />
  </Stack.Navigator>
);

const AdminStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: 'Admin Users' }} />
    <Stack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} options={{ title: 'User Detail' }} />
  </Stack.Navigator>
);

const AppDrawer = () => {
  const { user } = useAuth();
  return (
    <Drawer.Navigator initialRouteName="Dashboard">
      <Drawer.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={({ navigation }) => ({
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Cart')}
              style={{ marginRight: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Open cart"
            >
              <Text style={{ fontSize: 20 }}>🛒</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Drawer.Screen name="WiFiConfig" component={WiFiConfigScreen} options={{ title: 'WiFi Configuration' }} />
      <Drawer.Screen name="WiFiConf" component={WifiConnection} options={{ title: 'WiFi Test' }} />
      <Drawer.Screen name="Rooms" component={RoomsStack} 
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'RoomsList';
          // RoomsList component is RoomsScreen which might need header customization
          // Assuming RoomsList is the root
          return { headerShown: routeName === 'RoomsList' };
        }}
      />
      <Drawer.Screen name="Devices" component={ESP8266Stack} 
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'DevicesList';
          const isRoot = routeName === 'DevicesList';
          return { headerShown: isRoot };
        }}
      />
      {Array.isArray(user?.subdeviceIds) && user!.subdeviceIds!.length > 0 && (
        <Drawer.Screen
          name="Common Devices"
          component={CommonDevicesScreen}
          options={{ title: 'Common Devices' }}
        />
      )}
      <Drawer.Screen name="Shop" component={EcommerceStack} 
        options={({ route, navigation }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'ProductList';
          const isRoot = routeName === 'ProductList';
          return {
            headerShown: isRoot,
            headerRight: () => (
              <TouchableOpacity
                onPress={() => navigation.navigate('Cart')}
                style={{ marginRight: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Open cart"
              >
                <Text style={{ fontSize: 20 }}>🛒</Text>
              </TouchableOpacity>
            ),
          };
        }}/>
      <Drawer.Screen name="Cart" component={CartScreen} options={{ title: 'Shopping Cart' }} />
      <Drawer.Screen name="Subscriptions" component={SubscriptionsStack} 
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'SubscriptionList';
          return { headerShown: routeName === 'SubscriptionList' };
        }}
      />
      <Drawer.Screen name="Addresses" component={AddressListScreen} options={{ title: 'My Addresses' }} />
      <Drawer.Screen name="AddressEdit" component={AddressEditScreen} options={{ title: 'Edit Address' }} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      <Drawer.Screen name="Chat" component={ChatStack} 
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'UserList';
          return { headerShown: routeName === 'UserList' };
        }}
      />
      <Drawer.Screen name="Audio" component={AudioStack} options={({ route }) => {
        const routeName = getFocusedRouteNameFromRoute(route) ?? 'UserAudioList';
        return { headerShown: routeName === 'UserAudioList', title: 'Audio Calls' };
      }} />
      <Drawer.Screen name="OrderHistory" component={OrderHistoryScreen} options={{ title: 'Order History' }} />
      <Drawer.Screen name="AddRoom" component={AddEditRoomScreen} options={{ title: 'Add Room' }} />
      <Drawer.Screen name="AddDeviceToRoom" component={AddDeviceToRoomScreen} options={{ title: 'Add Device' }} />
      
      {user?.role === 'admin' && (
        <>
          <Drawer.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Admin Dashboard' }} />
          <Drawer.Screen name="Admin" component={AdminStack} options={{ title: 'Admin Users' }} />
        </>
      )}
    </Drawer.Navigator>
  );
};

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarIcon: ({ color, size }) => {
          const name =
            route.name === 'Home'
              ? 'home-outline'
              : route.name === 'Devices'
              ? 'cube-outline'
              : route.name === 'Subscriptions'
              ? 'card-outline'
              : 'person-outline';
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={AppDrawer}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('Home', { screen: 'Dashboard' });
          },
        })}
      />
      <Tab.Screen name="Devices" component={ESP8266Stack} />
      <Tab.Screen name="Subscriptions" component={SubscriptionsStack} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const RootStack = createStackNavigator();

const navigationRef = createNavigationContainerRef();

const AppNavigator = () => {
  const { user, isLoading } = useAuth();
  const [showSplash, setShowSplash] = React.useState(true);
  const routeNameRef = React.useRef<string | undefined>(undefined);
  const logService = require('./src/services/logging/logService').default;
  const callSignalSocketRef = React.useRef<Socket | null>(null);
  // Deep link subscription stored locally for cleanup
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Initialize local notifications on native if available
  React.useEffect(() => {
    try { 
      notificationService.initLocalNotifications();
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }
    } catch {}
  }, []);

  // Connect to signaling and listen for incoming call invites
  const pendingIncomingRef = React.useRef<{ targetUserId?: string; targetUserName?: string } | null>(null);
  const [incomingModalVisible, setIncomingModalVisible] = React.useState(false);
  const [incomingPayload, setIncomingPayload] = React.useState<{ from?: string; room?: string; name?: string } | null>(null);
  const [incomingDisplayName, setIncomingDisplayName] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    const connect = async () => {
      if (!user?.id) return;
      const token = (await authService.getToken()) || '';
      callSignalSocketRef.current = io(constantsV.CHAT_BASE_URL, {
        transports: ['websocket', 'polling'],
        path: '/voodoo/socket.io',
        auth: { token },
        extraHeaders: { Authorization: `Bearer ${token}` },
      });
      callSignalSocketRef.current.emit('webrtc:user-join', `user:${user.id}`);
      callSignalSocketRef.current.on('webrtc:incoming', (payload: { from: string; room?: string; name?: string }) => {
        try {
          setIncomingPayload(payload);
          setIncomingModalVisible(true);
          // Play ringtone and vibrate
          try {
            InCallManager.startRingtone('_BUNDLE_');
            InCallManager.vibrate(true);
          } catch (err) { /* ignore */ }

          const targetUserName = payload?.name;
          const msg = targetUserName ? `From ${targetUserName}` : 'Incoming call';
          Toast.show({ type: 'info', text1: 'Incoming Call', text2: msg, position: 'bottom' });
          notificationService.showSystemNotification('Incoming Call', msg);
        } catch (e) { /* ignore */ }
      });
    };
    connect();
    return () => {
      callSignalSocketRef.current?.disconnect();
      callSignalSocketRef.current = null;
    };
  }, [user?.id]);

  // Resolve caller name when only ID is provided
  React.useEffect(() => {
    (async () => {
      try {
        if (!incomingPayload) {
          setIncomingDisplayName(undefined);
          return;
        }
        if (incomingPayload.name) {
          setIncomingDisplayName(incomingPayload.name);
          return;
        }
        if (incomingPayload.from) {
          const users = await userService.listUsers();
          const match = users?.find((u: any) => String(u?.id) === String(incomingPayload.from));
          setIncomingDisplayName(match?.name);
        }
      } catch (_) {
        setIncomingDisplayName(undefined);
      }
    })();
  }, [incomingPayload?.from, incomingPayload?.name]);

  // Handle deep link callbacks for payments (e.g., PhonePe)
  React.useEffect(() => {
    const handler = async (event: { url: string }) => {
      try {
        const url = event.url;
        // Expecting scheme like: voodoohomeS2://payment/phonepe?status=success&txnId=...
        if (url && url.includes('://payment/phonepe')) {
          const query = url.split('?')[1] || '';
          const params = new URLSearchParams(query);
          const status = params.get('status');
          const txnId = params.get('txnId') || params.get('transactionId') || '';
          if (status === 'success' && txnId) {
            await AsyncStorage.setItem('last_phonepe_txn_id', txnId);
            Toast.show({ type: 'success', text1: 'Payment Success', text2: 'PhonePe payment verified. Please confirm order in app.', position: 'bottom' });
          } else {
            Toast.show({ type: 'error', text1: 'Payment Failed', text2: 'Could not verify payment', position: 'bottom' });
          }
        }
      } catch (err) {
        Toast.show({ type: 'error', text1: 'Payment Error', text2: 'Callback handling failed', position: 'bottom' });
      }
    };
    const subscription = Linking.addEventListener('url', handler);
    return () => {
      subscription.remove();
    };
  }, []);
  
  if (showSplash) {
    return (
      <>
        <NavigationContainer>
          <RootStack.Navigator screenOptions={{ headerShown: false }}>
            <RootStack.Screen name="Splash" component={SplashScreen} />
          </RootStack.Navigator>
        </NavigationContainer>
        {/* Incoming Call Modal during splash */}
        <Modal
          transparent
          animationType="fade"
          visible={incomingModalVisible}
          onRequestClose={() => {
            setIncomingModalVisible(false);
            InCallManager.stopRingtone();
            InCallManager.vibrate(false);
          }}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Incoming Call</Text>
              <Text style={styles.modalSubtitle}>
                {incomingDisplayName || incomingPayload?.name
                  ? `From ${incomingDisplayName || incomingPayload?.name}`
                  : incomingPayload?.from
                  ? `From ID ${incomingPayload.from}`
                  : 'Do you want to accept?'}
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.acceptButton]}
                  onPress={() => {
                    InCallManager.stopRingtone();
                    InCallManager.vibrate(false);
                    const targetUserId = incomingPayload?.from;
                    const targetUserName = incomingDisplayName || incomingPayload?.name;
                    setIncomingModalVisible(false);
                    setIncomingPayload(null);
                    pendingIncomingRef.current = { targetUserId, targetUserName } as any;
                    // When NavigationContainer is ready (after splash), we navigate in onReady
                  }}
                >
                  <Text style={styles.modalButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    InCallManager.stopRingtone();
                    InCallManager.vibrate(false);
                    const room = incomingPayload?.room;
                    setIncomingModalVisible(false);
                    setIncomingPayload(null);
                    if (room && callSignalSocketRef.current) {
                      callSignalSocketRef.current.emit('webrtc:decline', { room });
                    }
                  }}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }
  
  if (isLoading) {
    return null; // Or a loading screen
  }
  
  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        try {
          const current = navigationRef.getCurrentRoute();
          routeNameRef.current = current?.name;
          if (current?.name) {
            logService.logScreenView(current.name);
          }
          // If a modal was queued while not ready, it will still be shown after splash
        } catch (e) { /* ignore */ }
      }}
      onStateChange={() => {
        try {
          const previousRouteName = routeNameRef.current;
          const currentRoute = navigationRef.getCurrentRoute();
          const currentRouteName = currentRoute?.name;
          if (currentRouteName && previousRouteName !== currentRouteName) {
            routeNameRef.current = currentRouteName;
            logService.logScreenView(currentRouteName);
          }
        } catch (e) { /* ignore */ }
      }}
    >
      {user ? <MainTabs /> : <AuthStack />}
      {/* Incoming Call Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={incomingModalVisible}
        onRequestClose={() => {
          setIncomingModalVisible(false);
          InCallManager.stopRingtone();
          InCallManager.vibrate(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Incoming Call</Text>
            <Text style={styles.modalSubtitle}>
              {incomingDisplayName || incomingPayload?.name
                ? `From ${incomingDisplayName || incomingPayload?.name}`
                : incomingPayload?.from
                ? `From ID ${incomingPayload.from}`
                : 'Do you want to accept?'}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.acceptButton]}
                onPress={() => {
                  InCallManager.stopRingtone();
                  InCallManager.vibrate(false);
                  const targetUserId = incomingPayload?.from;
                  const targetUserName = incomingDisplayName || incomingPayload?.name;
                  setIncomingModalVisible(false);
                  setIncomingPayload(null);
                  if (navigationRef.isReady()) {
                    (navigationRef as any).navigate('Home', {
                      screen: 'Audio',
                      params: {
                        screen: 'AudioCall',
                        params: { targetUserId, targetUserName, incoming: true },
                      },
                    });
                  } else {
                    pendingIncomingRef.current = { targetUserId, targetUserName } as any;
                  }
                }}
              >
                <Text style={styles.modalButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  InCallManager.stopRingtone();
                  InCallManager.vibrate(false);
                  const room = incomingPayload?.room;
                  setIncomingModalVisible(false);
                  setIncomingPayload(null);
                  if (room && callSignalSocketRef.current) {
                    callSignalSocketRef.current.emit('webrtc:decline', { room });
                  }
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </NavigationContainer>
  );
};

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <PaperProvider>
      <AuthProvider>
         
        <AppNavigator />
        <Toast />
  
      </AuthProvider>
            </PaperProvider>
    </SafeAreaProvider>
  );
}

export default App;

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#444',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 6,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#2e7d32',
  },
  cancelButton: {
    backgroundColor: '#c62828',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
