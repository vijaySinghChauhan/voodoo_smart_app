import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { io, Socket } from 'socket.io-client';
import * as constantsV from '../../constants/constatantsV';
import authService from '../../services/auth/authService';
// WebRTC imports
import { mediaDevices, RTCPeerConnection, RTCIceCandidate, RTCSessionDescription } from 'react-native-webrtc';

type AudioStackParamList = {
  UserAudioList: undefined;
  AudioCall: { targetUserId?: string; targetUserName?: string };
};

type AudioCallRouteProp = RouteProp<AudioStackParamList, 'AudioCall'>;

const AudioCallScreen: React.FC<{ route: AudioCallRouteProp }> = ({ route }) => {
  const { targetUserId, targetUserName } = route.params || {};
  const [callState, setCallState] = useState<'idle' | 'connecting' | 'in_call' | 'ended'>('idle');
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<any>(null);
  const roomRef = useRef<string>('');

  useEffect(() => {
    // Build deterministic call room based on sorted ids
    const a = String(constantsV?.CURRENT_USER_ID || 'self');
    const b = String(targetUserId || 'other');
    roomRef.current = `call_${[a, b].sort().join('_')}`;
  }, [targetUserId]);

  useEffect(() => {
    // Connect socket and join signaling room
    (async () => {
      const token = (await authService.getToken()) || '';
      socketRef.current = io(constantsV.CHAT_BASE_URL, {
        transports: ['websocket', 'polling'],
        path: '/voodoo/socket.io',
        auth: { token },
        extraHeaders: { Authorization: `Bearer ${token}` },
      });
      socketRef.current.emit('webrtc:join', roomRef.current);

      // Handle incoming signaling messages
      socketRef.current.on('webrtc:offer', async ({ sdp }) => {
        if (!pcRef.current) return;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        socketRef.current?.emit('webrtc:answer', { room: roomRef.current, sdp: answer });
      });
      socketRef.current.on('webrtc:answer', async ({ sdp }) => {
        if (!pcRef.current) return;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        setCallState('in_call');
      });
      socketRef.current.on('webrtc:ice', async ({ candidate }) => {
        try {
          if (pcRef.current && candidate) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (e) {}
      });
    })();

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const startCall = async () => {
    setCallState('connecting');
    // Create peer connection
    pcRef.current = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });
    pcRef.current.onicecandidate = (event: any) => {
      if (event.candidate) {
        socketRef.current?.emit('webrtc:ice', { room: roomRef.current, candidate: event.candidate });
      }
    };
    pcRef.current.onconnectionstatechange = () => {
      const s = pcRef.current?.connectionState;
      if (s === 'connected') setCallState('in_call');
    };

    // Acquire audio stream
    const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
    localStreamRef.current = stream;
    stream.getTracks().forEach((t: any) => pcRef.current?.addTrack(t, stream));

    // Create offer
    const offer = await pcRef.current.createOffer({ offerToReceiveAudio: true });
    await pcRef.current.setLocalDescription(offer);
    socketRef.current?.emit('webrtc:offer', { room: roomRef.current, sdp: offer });
  };

  const endCall = () => {
    // Cleanup streams and peer connection
    try { localStreamRef.current?.getTracks()?.forEach((t: any) => t.stop()); } catch (e) {}
    try { pcRef.current?.close(); } catch (e) {}
    pcRef.current = null;
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
