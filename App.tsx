import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import Toast from 'react-native-toast-message';

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

// Chat Screen
import ChatScreen from './src/screens/chat/ChatScreen';

// Room Management Screens
import RoomsScreen from './src/screens/rooms/RoomsScreen';
import RoomDetailScreen from './src/screens/rooms/RoomDetailScreen';
import AddEditRoomScreen from './src/screens/rooms/AddEditRoomScreen';

// E-commerce Screens
import ProductListScreen from './src/screens/ecommerce/ProductListScreen';
import ProductDetailScreen from './src/screens/ecommerce/ProductDetailScreen';
import CartScreen from './src/screens/ecommerce/CartScreen';
import CheckoutScreen from './src/screens/ecommerce/CheckoutScreen';
import OrderHistoryScreen from './src/screens/ecommerce/OrderHistoryScreen';

// Dashboard Screen
import DashboardScreen from './src/screens/dashboard/DashboardScreen';

// Context
import { AuthProvider, useAuth } from './src/context/AuthContext';
import wifiConnection from './src/services/esp8266/wifiConnection';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

function ChatStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Chat" component={ChatScreen} />
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
    <Stack.Screen name="RoomDetail" component={RoomDetailScreen} options={{ title: 'Room Details' }} />
    <Stack.Screen name="AddEditRoom" component={AddEditRoomScreen} options={({ route }) => ({ 
      title: (route.params as { room?: any })?.room ? 'Edit Room' : 'Add Room'
    })} />
  </Stack.Navigator>
);

const EcommerceStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="ProductList" component={ProductListScreen} options={{ headerShown: false }} />
    <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product Details' }} />
    <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Shopping Cart' }} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: 'Checkout' }} />
    <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} options={{ title: 'Order History' }} />
  </Stack.Navigator>
);

const ESP8266Stack = () => (
  <Stack.Navigator>
    <Stack.Screen name="DeviceDiscovery" component={DeviceDiscoveryScreen} options={{ headerShown: false }} />
    <Stack.Screen name="DeviceControl" component={DeviceControlScreen} options={{ title: 'Device Control' }} />
    <Stack.Screen name="WiFiConfig" component={WiFiConfigScreen} options={{ title: 'WiFi Configuration' }} />
  </Stack.Navigator>
);

const AppDrawer = () => (
  <Drawer.Navigator initialRouteName="Dashboard">
    <Drawer.Screen name="Dashboard" component={DashboardScreen} />
    <Drawer.Screen name="DeviceDiscovery" component={DeviceDiscoveryScreen} options={{ headerShown: false }} />
    <Drawer.Screen name="DeviceControl" component={DeviceControlScreen} options={{ title: 'Device Control' }} />
    <Drawer.Screen name="WiFiConfig" component={WiFiConfigScreen} options={{ title: 'WiFi Configuration' }} />
    <Drawer.Screen name="WiFiConf" component={wifiConnection} options={{ title: 'WiFi Test' }} />
    <Drawer.Screen name="Rooms" component={RoomsStack} />
    <Drawer.Screen name="Devices" component={ESP8266Stack} />
    <Drawer.Screen name="Shop" component={EcommerceStack} />
    <Drawer.Screen name="Profile" component={ProfileScreen} />
    <Drawer.Screen name="Chat" component={ChatStack} />
  </Drawer.Navigator>
);

const RootStack = createStackNavigator();

const AppNavigator = () => {
  const { user, isLoading } = useAuth();
  const [showSplash, setShowSplash] = React.useState(true);
  
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (showSplash) {
    return (
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Splash" component={SplashScreen} />
        </RootStack.Navigator>
      </NavigationContainer>
    );
  }
  
  if (isLoading) {
    return null; // Or a loading screen
  }
  
  return (
    <NavigationContainer>
      {user ? (
        <AppDrawer />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
};

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppNavigator />
        <Toast />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;