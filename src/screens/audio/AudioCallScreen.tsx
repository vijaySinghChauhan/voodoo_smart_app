import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration, NativeModules, Platform } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { io, Socket } from 'socket.io-client';
import * as constantsV from '../../constants/constatantsV';
import authService from '../../services/auth/authService';
import { useAuth } from '../../context/AuthContext';
// WebRTC imports
import { mediaDevices, RTCPeerConnection, RTCIceCandidate, RTCSessionDescription } from 'react-native-webrtc';

type AudioStackParamList = {
  UserAudioList: undefined;
  AudioCall: { targetUserId?: string; targetUserName?: string; incoming?: boolean };
};

type AudioCallRouteProp = RouteProp<AudioStackParamList, 'AudioCall'>;

const AudioCallScreen: React.FC<{ route: AudioCallRouteProp }> = ({ route }) => {
  const { targetUserId, targetUserName, incoming } = route.params || {};
  const [callState, setCallState] = useState<'idle' | 'ringing' | 'connecting' | 'in_call' | 'ended'>(incoming ? 'ringing' : 'idle');
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<any>(null);
  const remoteStreamRef = useRef<any>(null);
  const roomRef = useRef<string>('');
  const pendingOfferRef = useRef<any>(null);
  const callStateRef = useRef(callState);
  const { user } = useAuth();

  useEffect(() => { callStateRef.current = callState; }, [callState]);

  useEffect(() => {
    // Build deterministic call room based on sorted ids
    const a = String(user?.id || 'self');
    const b = String(targetUserId || 'other');
    roomRef.current = `call_${[a, b].sort().join('_')}`;
  }, [targetUserId, user?.id]);

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
      // webrtc:join will be emitted when room is ready in a separate effect

      // Handle incoming signaling messages
      socketRef.current.on('webrtc:offer', async ({ sdp }) => {
        try {
          if (callStateRef.current === 'ringing') {
            // Buffer the offer until user accepts
            pendingOfferRef.current = sdp;
            return;
          }
          // Already connecting: proceed to set remote description
          if (!pcRef.current) {
            pcRef.current = new RTCPeerConnection({
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' }
              ]
            });
            (pcRef.current as any).onicecandidate = (event: any) => {
              const candidate = event?.candidate;
              if (candidate) {
                socketRef.current?.emit('webrtc:ice', { room: roomRef.current, candidate });
              }
            };
            (pcRef.current as any).onconnectionstatechange = () => {
              const s = (pcRef.current as any)?.connectionState;
              if (s === 'connected') setCallState('in_call');
            };
            // Capture remote tracks for audio
            (pcRef.current as any).ontrack = (event: any) => {
              try {
                const stream = event?.streams?.[0];
                if (stream) {
                  remoteStreamRef.current = stream;
                  // Audio tracks play automatically on native; ensure enabled
                  stream.getAudioTracks().forEach((t: any) => (t.enabled = true));
                }
              } catch (_) {}
            };
          }
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
          if (!localStreamRef.current) {
            const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
            localStreamRef.current = stream;
            stream.getTracks().forEach((t: any) => pcRef.current?.addTrack(t, stream));
          }
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          socketRef.current?.emit('webrtc:answer', { room: roomRef.current, sdp: answer });
        } catch (e) { /* ignore */ }
      });
      socketRef.current.on('webrtc:declined', () => {
        setCallState('ended');
        try { localStreamRef.current?.getTracks()?.forEach((t: any) => t.stop()); } catch (_) {}
        try { pcRef.current?.close(); } catch (_) {}
        pcRef.current = null;
      });
      // Caller canceled: stop ringing/connection
      socketRef.current.on('webrtc:canceled', () => {
        endCall();
      });
      socketRef.current.on('webrtc:answer', async ({ sdp }) => {
        if (!pcRef.current) return;
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        setCallState('in_call');
      });
      // If callee signals ready, resend an offer from caller side
      socketRef.current.on('webrtc:ready', async () => {
        try {
          if (!pcRef.current) return;
          const offer = await pcRef.current.createOffer({ offerToReceiveAudio: true });
          await pcRef.current.setLocalDescription(offer);
          socketRef.current?.emit('webrtc:offer', { room: roomRef.current, sdp: offer });
        } catch (_) {}
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

  // Join room when both socket and computed room are ready
  useEffect(() => {
    if (socketRef.current && roomRef.current) {
      socketRef.current.emit('webrtc:join', roomRef.current);
    }
  }, [socketRef.current, roomRef.current]);

  const startCall = async () => {
    setCallState('connecting');
    // Notify target user of incoming call
    if (targetUserId) {
      socketRef.current?.emit('webrtc:invite', { to: targetUserId, room: roomRef.current });
    }
    // Create peer connection
    pcRef.current = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });
    // Assign handler properties with safe casts to satisfy TS
    (pcRef.current as any).onicecandidate = (event: any) => {
      try {
        const candidate = event?.candidate;
        if (candidate) {
          socketRef.current?.emit('webrtc:ice', { room: roomRef.current, candidate });
        }
      } catch (_) { /* ignore */ }
    };
    (pcRef.current as any).onconnectionstatechange = () => {
      try {
        const s = (pcRef.current as any)?.connectionState;
        if (s === 'connected') setCallState('in_call');
      } catch (_) { /* ignore */ }
    };
    (pcRef.current as any).ontrack = (event: any) => {
      try {
        const stream = event?.streams?.[0];
        if (stream) {
          remoteStreamRef.current = stream;
          stream.getAudioTracks().forEach((t: any) => (t.enabled = true));
        }
      } catch (_) { /* ignore */ }
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

  const acceptCall = async () => {
    setCallState('connecting');
    if (!pcRef.current) {
      pcRef.current = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });
      (pcRef.current as any).onicecandidate = (event: any) => {
        const candidate = event?.candidate;
        if (candidate) {
          socketRef.current?.emit('webrtc:ice', { room: roomRef.current, candidate });
        }
      };
      (pcRef.current as any).onconnectionstatechange = () => {
        const s = (pcRef.current as any)?.connectionState;
        if (s === 'connected') setCallState('in_call');
      };
      (pcRef.current as any).ontrack = (event: any) => {
        const stream = event?.streams?.[0];
        if (stream) {
          remoteStreamRef.current = stream;
          stream.getAudioTracks().forEach((t: any) => (t.enabled = true));
        }
      };
    }
    // Acquire audio
    if (!localStreamRef.current) {
      const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      stream.getTracks().forEach((t: any) => pcRef.current?.addTrack(t, stream));
    }
    // If an offer was buffered, use it and answer
    if (pendingOfferRef.current) {
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(pendingOfferRef.current));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socketRef.current?.emit('webrtc:answer', { room: roomRef.current, sdp: answer });
      pendingOfferRef.current = null;
    } else {
      // No buffered offer yet: signal readiness so caller can (re)send offer
      socketRef.current?.emit('webrtc:ready', { room: roomRef.current });
    }
  };

  const declineCall = () => {
    socketRef.current?.emit('webrtc:decline', { room: roomRef.current });
    endCall();
  };

  const cancelCall = () => {
    // For incoming calls, cancel behaves like decline
    if (incoming) {
      declineCall();
      return;
    }
    // Outgoing: inform callee and end locally
    socketRef.current?.emit('webrtc:cancel', { room: roomRef.current });
    endCall();
  };

  const endCall = () => {
    // Cleanup streams and peer connection
    try { localStreamRef.current?.getTracks()?.forEach((t: any) => t.stop()); } catch (e) {}
    try { pcRef.current?.close(); } catch (e) {}
    pcRef.current = null;
    setCallState('ended');
    // Stop any in-call audio and ringtone
    const InCallManager = NativeModules.InCallManager;
    try {
      InCallManager?.stopRingtone?.();
      InCallManager?.stop?.();
    } catch (_) {}
  };

  // Drive ringtone and audio routing from call state
  useEffect(() => {
    const InCallManager = NativeModules.InCallManager;
    if (callState === 'ringing') {
      try {
        InCallManager?.start?.({ media: 'audio' });
        InCallManager?.startRingtone?.('default');
      } catch (_) {
        // Fallback to vibration if native module not available
        if (Platform.OS !== 'web') {
          Vibration.vibrate([0, 500, 500], true);
        }
      }
    } else if (callState === 'in_call' || callState === 'connecting') {
      try {
        InCallManager?.stopRingtone?.();
        InCallManager?.start?.({ media: 'audio' });
        InCallManager?.setForceSpeakerphoneOn?.(true);
        InCallManager?.setMicrophoneMute?.(false);
      } catch (_) { /* ignore */ }
      // Stop vibration
      Vibration.cancel();
    } else if (callState === 'ended' || callState === 'idle') {
      try {
        InCallManager?.stopRingtone?.();
        InCallManager?.stop?.();
      } catch (_) { /* ignore */ }
      Vibration.cancel();
    }
  }, [callState]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Streaming</Text>
      <Text style={styles.subtitle}>
        {targetUserName ? `Calling ${targetUserName}` : 'Select a user to start a call'}
      </Text>

      <View style={styles.controls}>
        {callState === 'ringing' && (
          <>
            <TouchableOpacity style={styles.primaryBtn} onPress={acceptCall}>
              <Text style={styles.btnText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dangerBtn} onPress={declineCall}>
              <Text style={styles.btnText}>Decline</Text>
            </TouchableOpacity>
          </>
        )}
        {callState === 'idle' && (
          <TouchableOpacity style={styles.primaryBtn} onPress={startCall}>
            <Text style={styles.btnText}>Start Call</Text>
          </TouchableOpacity>
        )}
        {callState === 'connecting' && (
          <>
            <Text style={styles.status}>Connecting…</Text>
            <TouchableOpacity style={styles.dangerBtn} onPress={cancelCall}>
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}
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
