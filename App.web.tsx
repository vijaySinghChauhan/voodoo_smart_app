import 'react-native-gesture-handler';
import * as React from 'react';
import { View, TouchableOpacity, Text, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ErrorBoundary from './src/components/ErrorBoundary';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Toast from 'react-native-toast-message';
import { AuthProvider, useAuth } from './src/context/AuthContext';

// Screens (subset mirroring native App.tsx)
import SplashScreenWeb from './src/screens/SplashScreen.web';
import LoginScreen from './src/screens/auth/LoginScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import ProfileScreen from './src/screens/auth/ProfileScreen';

import DashboardScreen from './src/screens/dashboard/DashboardScreen';
import WiFiConfigScreen from './src/screens/WiFiConfigScreen';

import RoomsScreen from './src/screens/rooms/RoomsScreen';
import RoomDetailScreen from './src/screens/rooms/RoomDetailScreen';
import AddEditRoomScreen from './src/screens/rooms/AddEditRoomScreen';
import AddDeviceToRoomScreen from './src/screens/rooms/AddDeviceToRoomScreen';

import DevicesListScreen from './src/screens/esp8266/DevicesListScreen';
import DeviceDiscoveryScreen from './src/screens/esp8266/DeviceDiscoveryScreen';
import DeviceControlScreen from './src/screens/esp8266/DeviceControlScreen';

import ProductListScreen from './src/screens/ecommerce/ProductListScreen';
import ProductDetailScreen from './src/screens/ecommerce/ProductDetailScreen';
import CartScreen from './src/screens/ecommerce/CartScreen';
import CheckoutScreen from './src/screens/ecommerce/CheckoutScreen';
import OrderHistoryScreen from './src/screens/ecommerce/OrderHistoryScreen';
import AddressListScreen from './src/screens/ecommerce/AddressListScreen';
import AddressEditScreen from './src/screens/ecommerce/AddressEditScreen';

import SubscriptionListScreen from './src/screens/subscriptions/SubscriptionListScreen';
import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import AdminUsersScreen from './src/screens/admin/AdminUsersScreen';
import AdminUserDetailScreen from './src/screens/admin/AdminUserDetailScreen';

const Stack = createStackNavigator<any>();
const Drawer = createDrawerNavigator<any>();

// Feature stacks
const RoomsStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="RoomsList"
      component={RoomsScreen as React.ComponentType<any>}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="RoomDetail"
      component={RoomDetailScreen as React.ComponentType<any>}
      options={{ title: 'Room Details' }}
    />
    <Stack.Screen
      name="AddEditRoom"
      component={AddEditRoomScreen}
      options={({ route }) => ({
        title: (route.params as { room?: any })?.room ? 'Edit Room' : 'Add Room',
      })}
    />
    <Stack.Screen
      name="AddDeviceToRoom"
      component={AddDeviceToRoomScreen}
      options={{ title: 'Add Device' }}
    />
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
    <Stack.Screen name="DevicesList" component={DevicesListScreen} options={{ title: 'Devices' }} />
    <Stack.Screen name="DeviceDiscovery" component={DeviceDiscoveryScreen} options={{ title: 'Discover Devices' }} />
    <Stack.Screen name="DeviceControl" component={DeviceControlScreen} options={{ title: 'Device Control' }} />
    <Stack.Screen name="WiFiConfig" component={WiFiConfigScreen} options={{ title: 'WiFi Configuration' }} />
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
    <Drawer.Navigator
      initialRouteName="Dashboard"
      screenOptions={{
        drawerType: Platform.OS === 'web' ? 'front' : 'front',
        swipeEnabled: Platform.OS === 'web' ? false : true,
        overlayColor: Platform.OS === 'web' ? 'transparent' : undefined,
      }}
    >
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
      <Drawer.Screen name="Rooms" component={RoomsStack} />
      <Drawer.Screen name="Devices" component={ESP8266Stack} />
      <Drawer.Screen name="Shop" component={EcommerceStack} />
      <Drawer.Screen name="Cart" component={CartScreen} options={{ title: 'Shopping Cart' }} />
      <Drawer.Screen name="Subscriptions" component={SubscriptionListScreen} />
      <Drawer.Screen name="Addresses" component={AddressListScreen} options={{ title: 'My Addresses' }} />
      <Drawer.Screen name="AddressEdit" component={AddressEditScreen} options={{ title: 'Edit Address' }} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
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

const RootStack = createStackNavigator<any>();

const LoadingScreen: React.FC<any> = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
    <Text style={{ fontSize: 18 }}>Loading authentication…</Text>
  </View>
);

export const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
    <Stack.Screen name="DashboardMain" component={AppDrawer} />
  </Stack.Navigator>
);

const AppNavigator = () => {
  const { user, isLoading } = useAuth();
  const [showSplash, setShowSplash] = React.useState(true);
  const searchParams = React.useMemo(() => {
    try {
      return typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    } catch {
      return null;
    }
  }, []);
  const forceAuth = !!searchParams?.has('forceAuth');
  // In development, skip splash by default for faster iteration
  const skipSplash = (__DEV__ ? true : false) || !!searchParams?.has('skipSplash');
  const forcePlain = !!searchParams?.has('forcePlain');
  const forceSimple = !!searchParams?.has('forceSimple');

  React.useEffect(() => {
    if (skipSplash) {
      setShowSplash(false);
      return;
    }
    const t = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(t);
  }, [skipSplash]);

  // Debug: reflect navigator state in the page status tag
  React.useEffect(() => {
    try {
      const el = typeof document !== 'undefined' ? document.getElementById('bundle-status') : null;
      if (el) {
        const state = showSplash ? 'splash' : isLoading ? 'loading' : user ? 'app' : 'auth';
        el.textContent = `App state: ${state} · user: ${user ? user.email : 'none'}`;
      }
    } catch {}
  }, [showSplash, isLoading, user]);

  if (showSplash) {
    console.log('[Web] AppNavigator: showing Splash');
    return (
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Splash">
            {() => <SplashScreenWeb onDone={() => setShowSplash(false)} />}
          </RootStack.Screen>
        </RootStack.Navigator>
      </NavigationContainer>
    );
  }

  if (isLoading) {
    console.log('[Web] AppNavigator: auth isLoading=true, showing loading fallback');
    return (
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Loading" component={LoadingScreen} />
        </RootStack.Navigator>
      </NavigationContainer>
    );
  }

  // Diagnostic: simplified auth-only flow if requested
  if (forcePlain) {
    console.log('[Web] AppNavigator: forcePlain=1, rendering AuthStack in NavigationContainer');
    return (
      <NavigationContainer>
        <AuthStack />
      </NavigationContainer>
    );
  }

  // Diagnostic: render DashboardScreen directly without Drawer to isolate issues
  if (forceSimple) {
    console.log('[Web] AppNavigator: forceSimple=1, rendering DashboardScreen directly');
    return (
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="DashboardSimple" component={DashboardScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  const content = forceAuth
    ? (console.log('[Web] AppNavigator: forceAuth=1, rendering AuthStack'), <AuthStack />)
    : user
    ? (console.log('[Web] AppNavigator: rendering AppDrawer'), <AppDrawer />)
    : (console.log('[Web] AppNavigator: rendering AuthStack'), <AuthStack />);

  return (
    <NavigationContainer>
      {content}
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <AppNavigator />
            <Toast />
          </AuthProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
