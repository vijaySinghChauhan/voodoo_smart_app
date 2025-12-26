import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet } from 'react-native';
import WifiManager from 'react-native-wifi-reborn';
import * as constantsV from '../../constants/constatantsV';

const WifiConnection = () => {
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');

  const sendCredentials = async () => {
    try {
      // Connect to ESP's AP
      await WifiManager.connectToProtectedSSID('voodootech_setup', 'voodootech123', false, false);
      
      // Send credentials to ESP
    await fetch(constantsV.BASE_URL + '/connect', {
      method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `ssid=${encodeURIComponent(ssid)}&pass=${encodeURIComponent(password)}`
      });
      
      // Check connection status
      setTimeout(async () => {
        const statusRes = await fetch(constantsV.BASE_URL + '/status');
        const statusText = await statusRes.text();
        setStatus(statusText);
        
        // Reconnect to original network
        await WifiManager.connectToProtectedSSID('Airtel_vija_6651', 'air00336', true, false);
      }, 10000);
      
    } catch (error) {
      console.error(error);
    //  setStatus('Error: ' + error.message);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="WiFi SSID"
        value={ssid}
        onChangeText={setSsid}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button title="Send to ESP" onPress={sendCredentials} />
      <Text style={styles.status}>Status: {status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  input: { height: 40, borderColor: 'gray', borderWidth: 1, marginBottom: 10 },
  status: { marginTop: 20, textAlign: 'center' }
});

export default WifiConnection;
