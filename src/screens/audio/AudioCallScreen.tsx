import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RouteProp } from '@react-navigation/native';

type AudioStackParamList = {
  UserAudioList: undefined;
  AudioCall: { targetUserId?: string; targetUserName?: string };
};

type AudioCallRouteProp = RouteProp<AudioStackParamList, 'AudioCall'>;

const AudioCallScreen: React.FC<{ route: AudioCallRouteProp }> = ({ route }) => {
  const { targetUserId, targetUserName } = route.params || {};
  const [callState, setCallState] = useState<'idle' | 'connecting' | 'in_call' | 'ended'>('idle');

  useEffect(() => {
    // Placeholder: initialize audio streaming stack here (e.g., WebRTC)
    setCallState('idle');
  }, [targetUserId]);

  const startCall = () => {
    setCallState('connecting');
    // TODO: Setup signaling and media streams
    setTimeout(() => setCallState('in_call'), 800);
  };

  const endCall = () => {
    // TODO: Cleanup streams and signaling
    setCallState('ended');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Streaming</Text>
      <Text style={styles.subtitle}>
        {targetUserName ? `Calling ${targetUserName}` : 'Select a user to start a call'}
      </Text>

      <View style={styles.controls}>
        {callState === 'idle' && (
          <TouchableOpacity style={styles.primaryBtn} onPress={startCall}>
            <Text style={styles.btnText}>Start Call</Text>
          </TouchableOpacity>
        )}
        {callState === 'connecting' && <Text style={styles.status}>Connecting…</Text>}
        {callState === 'in_call' && (
          <TouchableOpacity style={styles.dangerBtn} onPress={endCall}>
            <Text style={styles.btnText}>End Call</Text>
          </TouchableOpacity>
        )}
        {callState === 'ended' && <Text style={styles.status}>Call Ended</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 24 },
  controls: { alignItems: 'center', gap: 12 },
  primaryBtn: { backgroundColor: '#3b82f6', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  dangerBtn: { backgroundColor: '#ef4444', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '600' },
  status: { fontSize: 16, color: '#333' },
});

export default AudioCallScreen;

