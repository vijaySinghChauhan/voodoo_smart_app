import 'react-native-gesture-handler';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';

import { AuthProvider, useAuth } from './src/context/AuthContext';

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import DashboardScreen from './src/screens/dashboard/DashboardScreen';
import AdminUserDetailScreen from './src/screens/admin/AdminUserDetailScreen';
import AdminUsersScreen from './src/screens/admin/AdminUsersScreen';
import AudioCallScreen from './src/screens/audio/AudioCallScreen';
import UserAudioListScreen from './src/screens/audio/UserAudioListScreen';
import ChatScreen from './src/screens/chat/ChatScreen';
import UserListScreen from './src/screens/chat/UserListScreen';
import AddressEditScreen from './src/screens/ecommerce/AddressEditScreen';
import AddressListScreen from './src/screens/ecommerce/AddressListScreen';
import CartScreen from './src/screens/ecommerce/CartScreen';
import CheckoutScreen from './src/screens/ecommerce/CheckoutScreen';
import OrderHistoryScreen from './src/screens/ecommerce/OrderHistoryScreen';
import ProductDetailScreen from './src/screens/ecommerce/ProductDetailScreen';
import ProductListScreen from './src/screens/ecommerce/ProductListScreen';
import DeviceControlScreen from './src/screens/esp8266/DeviceControlScreen';
import DeviceDiscoveryScreen from './src/screens/esp8266/DeviceDiscoveryScreen';
import DevicesListScreen from './src/screens/esp8266/DevicesListScreen';
import AddDeviceToRoomScreen from './src/screens/rooms/AddDeviceToRoomScreen';
import AddEditRoomScreen from './src/screens/rooms/AddEditRoomScreen';
import RoomDetailScreen from './src/screens/rooms/RoomDetailScreen';
import RoomsScreen from './src/screens/rooms/RoomsScreen';
import SubscriptionCheckoutScreen from './src/screens/subscriptions/SubscriptionCheckoutScreen';
import SubscriptionListScreen from './src/screens/subscriptions/SubscriptionListScreen';
import WiFiConfigScreen from './src/screens/WiFiConfigScreen';
import ProfileScreen from './src/screens/auth/ProfileScreen';
import WifiConnection from './src/services/esp8266/wifiConnection';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();




function ChatStack() {
  return (
    <Stack.Navigator initialRouteName="UserList">
      <Stack.Screen name="UserList" component={UserListScreen} options={{ title: 'Users' }} />
      <Stack.Screen name="Chat" component={ChatScreen} options={({ route }: any) => ({ title: route?.params?.targetUserName ? `Chat: ${route.params.targetUserName}` : 'Chat' })} />
    </Stack.Navigator>
  );
}

function AudioStack() {
  return (
    <Stack.Navigator initialRouteName="UserAudioList">
      <Stack.Screen name="UserAudioList" component={UserAudioListScreen} options={{ title: 'Users (Audio)' }} />
      <Stack.Screen name="AudioCall" component={AudioCallScreen as React.ComponentType<any>} options={({ route }: any) => ({ title: route?.params?.targetUserName ? `Call: ${route.params.targetUserName}` : 'Audio Call' })} />
    </Stack.Navigator>
  );
}

export const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
    <Stack.Screen name="DashboardMain" component={AppDrawer} />

  </Stack.Navigator>
);

const RoomsStack = () => (
  <Stack.Navigator>
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
    <Stack.Screen name="DevicesList" component={DevicesListScreen} options={{ title: 'Devices' }} />
    <Stack.Screen name="DeviceDiscovery" component={DeviceDiscoveryScreen} options={{ title: 'Discover Devices' }} />
    <Stack.Screen name="DeviceControl" component={DeviceControlScreen} options={{ title: 'Device Control' }} />
    <Stack.Screen name="WiFiConfig" component={WiFiConfigScreen} options={{ title: 'WiFi Configuration' }} />
  </Stack.Navigator>
);

const SubscriptionsStack = () => (
  <Stack.Navigator initialRouteName="SubscriptionList">
    <Stack.Screen name="SubscriptionList" component={SubscriptionListScreen} options={{ title: 'Subscriptions' }} />
    <Stack.Screen name="SubscriptionCheckout" component={SubscriptionCheckoutScreen} options={{ title: 'Checkout' }} />
  </Stack.Navigator>
);

const AdminStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: 'Admin Users' }} />
    <Stack.Screen name="AdminUserDetail" component={AdminUserDetailScreen} options={{ title: 'User Detail' }} />
  </Stack.Navigator>
);


function AppDrawer() {
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
      <Drawer.Screen name="Rooms" component={RoomsStack} />
      <Drawer.Screen name="Devices" component={ESP8266Stack} />
      <Drawer.Screen name="Shop" component={EcommerceStack} 
        options={({ route, navigation }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'ProductList';
          const isRoot = routeName === 'ProductList';
          return {
            headerShown: isRoot,
            headerRight: isRoot ? () => (
              <TouchableOpacity
                onPress={() => navigation.navigate('Cart')}
                style={{ marginRight: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Open cart"
              >
                <Text style={{ fontSize: 20 }}>🛒</Text>
              </TouchableOpacity>
            ) : undefined,
          };
        }}/>
      <Drawer.Screen name="Cart" component={CartScreen} options={{ title: 'Shopping Cart' }} />
      <Drawer.Screen name="Subscriptions" component={SubscriptionsStack} />
      <Drawer.Screen name="Addresses" component={AddressListScreen} options={{ title: 'My Addresses' }} />
      <Drawer.Screen name="AddressEdit" component={AddressEditScreen} options={{ title: 'Edit Address' }} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      <Drawer.Screen name="Chat" component={ChatStack} />
      <Drawer.Screen name="Audio" component={AudioStack} options={{ title: 'Audio Calls' }} />
      <Drawer.Screen name="OrderHistory" component={OrderHistoryScreen} options={{ title: 'Order History' }} />
      <Drawer.Screen name="AddRoom" component={AddEditRoomScreen} options={{ title: 'Add Room' }} />
      <Drawer.Screen name="AddDeviceToRoom" component={AddDeviceToRoomScreen} options={{ title: 'Add Device' }} />
      
      {user?.role === 'admin' && (
        <>
          <Drawer.Screen name="AdminDashboard" component={DashboardScreen} options={{ title: 'Admin Dashboard' }} />
          <Drawer.Screen name="Admin" component={AdminStack} options={{ title: 'Admin Users' }} />
        </>
      )}
    </Drawer.Navigator>
  );
}

function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Loading…</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppDrawer /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <AppNavigator />
          <Toast />
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
