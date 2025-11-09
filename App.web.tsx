import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet } from 'react-native';
import { AuthProvider } from './src/context/AuthContext';
import DeviceControlScreen from './src/screens/esp8266/DeviceControlScreen';
// Use the web-specific splash for correct typing and behavior on web
import SplashScreenWeb from './src/screens/SplashScreen.web';

const navigationStub = {
  navigate: (..._args: any[]) => {},
  goBack: () => {},
  reset: (..._args: any[]) => {},
};

function App(): React.JSX.Element {
  const [showSplash, setShowSplash] = useState(true);
  const [showDevice, setShowDevice] = useState(false);
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <View style={styles.root}>
          <View style={styles.banner}>
            <Text style={styles.bannerText}>Web Preview Active</Text>
          </View>
          {showSplash ? (
            <SplashScreenWeb onDone={() => { setShowSplash(false); setShowDevice(true); }} />
          ) : (
            <DeviceControlScreen navigation={navigationStub} route={{ params: { fromDiscovery: true } }} />
          )}
        </View>
      </SafeAreaProvider>
    </AuthProvider>
  );
}

export default App;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#eee',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  bannerText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
});
