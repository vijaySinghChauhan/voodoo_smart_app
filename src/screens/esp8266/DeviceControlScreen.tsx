import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import esp8266Service from '../../services/esp8266/esp8266Service';
import WaterTank from './WaterTank';
import axios from 'axios';

interface DeviceStatus {
  connected: boolean;
  ssid?: string;
  ip?: string;
  macAddress?: string;
  powerState?: 'on' | 'off';
  firmwareVersion?: string;
  lastUpdated?: string;
  energyUsage?: number;
}

const DeviceControlScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [deviceName, setDeviceName] = useState('');
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPowerOn, setIsPowerOn] = useState(false);

  const fullTankHeight = 150;
  const [waterLevel, setWaterLevel] = useState(5); // Example water level in pixels
  

  useEffect(() => {
    loadDeviceInfo();
  }, []);

  const loadDeviceInfo = async () => {
    setIsLoading(true);
    try {
      const name = await esp8266Service.getDeviceName();
      if (name) {
        setDeviceName(name);
      }

      const status = await esp8266Service.getDeviceStatus();
      setDeviceStatus(status);
      setIsPowerOn(status.powerState === 'on');
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load device information',
        position: 'bottom'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePowerToggle = async (value: boolean) => {
    setIsPowerOn(value);
    
    try {
      const state = value ? 'on' : 'off';

      const response1 = await axios.get(`http://192.168.4.1/switch?state=on`, {
        timeout: 5000, // 5 second timeout
      });
      const response = await axios.get(`http://192.168.4.1/getdata`, {
     
        timeout: 5000, // 5 second timeout
      });
      console.log(JSON.stringify(response.data));
     setWaterLevel( (response.data / fullTankHeight) * 100);
     
     const response2 = await axios.get(`http://192.168.4.1/switch?state=off`, {
      timeout: 5000, // 5 second timeout
    });
      if (response.status === 200) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `Device turned ${state} successfully`,
          position: 'bottom'
        });
        // Refresh device status
        loadDeviceInfo();
      } else {
        throw new Error('Invalid response from device');
      }
    } catch (error) {
      // Revert the switch if the operation failed
      setIsPowerOn(!value);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: `Failed to turn device ${value ? 'on' : 'off'}`,
        position: 'bottom'
      });
      console.error('Device control error:', error);
    }
  };
  const handleGetData = async () => {

    const response = await axios.get(`http://192.168.4.1/getData`, {
     
      timeout: 5000, // 5 second timeout
    });

    if (response.status === 200) {
    //  waterLevel = response.data;
    }
  }
  const handleReset = async () => {
    try {
      const success = await esp8266Service.resetDevice();
      if (success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Device reset successfully',
          position: 'bottom'
        });
        // Navigate back to discovery screen after reset
        navigation.navigate('DeviceDiscovery');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to reset device',
          position: 'bottom'
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to reset device',
        position: 'bottom'
      });
    }
  };

  const handleDisable = async () => {
    try {
      const success = await esp8266Service.disableDevice();
      if (success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Device disabled successfully',
          position: 'bottom'
        });
        // Navigate back to discovery screen after disabling
        navigation.navigate('DeviceDiscovery');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to disable device',
          position: 'bottom'
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to disable device',
        position: 'bottom'
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text style={styles.loadingText}>Loading device information...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.deviceName}>{deviceName}</Text>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: deviceStatus?.connected ? '#4CAF50' : '#ff6b6b' }]} />
            <Text style={styles.statusText}>{deviceStatus?.connected ? 'Connected' : 'Disconnected'}</Text>
          </View>
        </View>
        <WaterTank percentage={waterLevel} />
        <View style={styles.controlSection}>
          <Text style={styles.sectionTitle}>Power Control</Text>
          <View style={styles.powerControl}>
            <Text style={styles.powerLabel}>Power</Text>
            <Switch
              value={isPowerOn}
              onValueChange={handlePowerToggle}
              trackColor={{ false: '#767577', true: '#4CAF50' }}
              thumbColor={isPowerOn ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={[styles.controlSection, { marginTop: 20 }]}>
          <Text style={styles.sectionTitle}>Device Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>IP Address</Text>
            <Text style={styles.infoValue}>{deviceStatus?.ip || 'Unknown'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>MAC Address</Text>
            <Text style={styles.infoValue}>{deviceStatus?.macAddress || 'Unknown'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Connected to</Text>
            <Text style={styles.infoValue}>{deviceStatus?.ssid || 'Not connected'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Firmware Version</Text>
            <Text style={styles.infoValue}>{deviceStatus?.firmwareVersion || 'Unknown'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Updated</Text>
            <Text style={styles.infoValue}>{deviceStatus?.lastUpdated || 'Unknown'}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Energy Usage</Text>
            <Text style={styles.infoValue}>{deviceStatus?.energyUsage ? `${deviceStatus.energyUsage} kWh` : 'Unknown'}</Text>
          </View>
        </View>

        <View style={styles.actionSection}>
          <Text style={styles.sectionTitle}>Device Actions</Text>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.resetButton]}
            onPress={handleReset}
          >
            <Text style={styles.resetButtonText}>Reset Device</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.disableButton]}
            onPress={handleDisable}
          >
            <Text style={styles.disableButtonText}>Disable Device</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.configButton]}
            onPress={() => navigation.navigate('WiFiConfig')}
          >
            <Text style={styles.buttonText}>Configure WiFi</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  infoRow:{
   
  },
  infoValue:{
   fontSize:16,
   color:'#666',
   marginLeft:5,
  },
  configButton:{
  width:'100%',
  backgroundColor:'#4a90e2',
  padding:10,
  borderRadius:8,
  marginTop:10,
  alignItems:'center',
  justifyContent:'center',
  marginBottom:10,
  },
  infoLabel:{
    fontSize:16,
    color:'#666',
    marginBottom:5,
  },
  actionSection:{
   width:'100%',
   backgroundColor:'#fff',
   borderRadius:8,
   padding:10,
   marginTop:20,
   borderWidth:1,
   borderColor:'#ddd',
  },
  actionButton:{
  
  },
  disableButtonText:{

  },
  buttonText:{

  },
  resetButtonText:{

  },
  disableButton:{

  },
  resetButton:{

  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  scrollView: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  deviceName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  controlSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  powerControl: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  powerLabel: {
    fontSize: 16,
    color: '#333',
  },
});
export default DeviceControlScreen;