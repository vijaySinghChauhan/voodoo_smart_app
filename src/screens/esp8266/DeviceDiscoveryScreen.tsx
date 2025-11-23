import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import esp8266Service from '../../services/esp8266/esp8266Service';
import logService from '../../services/logging/logService';

interface Device {
  ip: string;
  name: string;
}

const DeviceDiscoveryScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [manualIP, setManualIP] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [subdevice1, setSubdevice1] = useState('');
  const [subdevice2, setSubdevice2] = useState('');
  const [subdevice3, setSubdevice3] = useState('');
  const [subdevice4, setSubdevice4] = useState('');
  const [subdevice5, setSubdevice5] = useState('');

  const scanForDevices = async () => {
    setIsScanning(true);
    try {
      try { await logService.logButtonClick('Scan Devices'); } catch (e) {}
      const discoveredDevices = await esp8266Service.discoverDevices();
      setDevices(discoveredDevices);
      
      if (discoveredDevices.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'No Devices Found',
          text2: 'Try entering the IP address manually',
          position: 'bottom'
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Scan Failed',
        text2: 'Could not scan for devices',
        position: 'bottom'
      });
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    scanForDevices();
  }, []);

  const handleDeviceSelect = async (device: Device) => {
    try {
      try { await logService.logButtonClick('Select Discovered Device', { ip: device.ip, name: device.name }); } catch (e) {}
      await esp8266Service.setDeviceIP(device.ip);
      await esp8266Service.setDeviceName(device.name);
      
      const connected = await esp8266Service.checkConnection();
      if (connected) {
        Toast.show({
          type: 'success',
          text1: 'Connected',
          text2: `Connected to ${device.name}`,
          position: 'bottom'
        });
        navigation.navigate('DeviceControl', { fromDiscovery: true });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Connection Failed',
          text2: 'Could not connect to the device',
          position: 'bottom'
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Connection Failed',
        text2: 'Could not connect to the device',
        position: 'bottom'
      });
    }
  };

  const handleManualConnect = async () => {
    if (!manualIP) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter an IP address',
        position: 'bottom'
      });
      return;
    }

    if (!deviceName) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a device name',
        position: 'bottom'
      });
      return;
    }

    try {
      try { await logService.logButtonClick('Manual Connect Device', { ip: manualIP, name: deviceName }); } catch (e) {}
      await esp8266Service.setDeviceIP(manualIP);
      await esp8266Service.setDeviceName(deviceName);
      await esp8266Service.setSubdeviceLabels({
        subdevice1: subdevice1?.trim() || undefined,
        subdevice2: subdevice2?.trim() || undefined,
        subdevice3: subdevice3?.trim() || undefined,
        subdevice4: subdevice4?.trim() || undefined,
        subdevice5: subdevice5?.trim() || undefined,
      });
      
      const connected = await esp8266Service.checkConnection();
      if (connected) {
        Toast.show({
          type: 'success',
          text1: 'Connected',
          text2: `Connected to ${deviceName}`,
          position: 'bottom'
        });
        navigation.navigate('DeviceControl', { fromDiscovery: true });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Connection Failed',
          text2: 'Could not connect to the device',
          position: 'bottom'
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Connection Failed',
        text2: 'Could not connect to the device',
        position: 'bottom'
      });
    }
  };

  const renderDeviceItem = ({ item }: { item: Device }) => (
    <TouchableOpacity
      style={styles.deviceItem}
      onPress={() => handleDeviceSelect(item)}
    >
      <Text style={styles.deviceName}>{item.name}</Text>
      <Text style={styles.deviceIP}>{item.ip}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover Devices</Text>
        <TouchableOpacity
          style={styles.scanButton}
          onPress={scanForDevices}
          disabled={isScanning}
        >
          {isScanning ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.scanButtonText}>Scan</Text>
          )}
        </TouchableOpacity>
      </View>

      {isScanning ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a90e2" />
          <Text style={styles.loadingText}>Scanning for devices...</Text>
        </View>
      ) : devices.length > 0 ? (
        <FlatList
          data={devices}
          renderItem={renderDeviceItem}
          keyExtractor={(item) => item.ip}
          contentContainerStyle={styles.deviceList}
          scrollEnabled={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No devices found</Text>
        </View>
      )}

      <View style={styles.manualContainer}>
        <Text style={styles.sectionTitle}>Manual Connection</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Device Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter device name"
            value={deviceName}
            onChangeText={setDeviceName}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>IP Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter device IP address"
            value={manualIP}
            onChangeText={setManualIP}
            keyboardType="numeric"
          />
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Sub-device Names (optional)</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>subdevice1</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Main Power"
            value={subdevice1}
            onChangeText={setSubdevice1}
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>subdevice2</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Door Lock"
            value={subdevice2}
            onChangeText={setSubdevice2}
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>subdevice3</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Watering"
            value={subdevice3}
            onChangeText={setSubdevice3}
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>subdevice4</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Dog Feed"
            value={subdevice4}
            onChangeText={setSubdevice4}
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>subdevice5</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., AC Control"
            value={subdevice5}
            onChangeText={setSubdevice5}
          />
        </View>

        <TouchableOpacity
          style={styles.connectButton}
          onPress={handleManualConnect}
        >
          <Text style={styles.connectButtonText}>Connect</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  scanButton: {
    backgroundColor: '#4a90e2',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: 'bold',
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
  deviceList: {
    padding: 20,
  },
  deviceItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  deviceIP: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
  },
  manualContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  connectButton: {
    backgroundColor: '#4a90e2',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DeviceDiscoveryScreen;
