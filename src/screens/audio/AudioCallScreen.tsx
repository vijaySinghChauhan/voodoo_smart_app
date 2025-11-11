import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration, Platform, PermissionsAndroid } from 'react-native';
import InCallManager from 'react-native-incall-manager';
import { useNavigation } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { io, Socket } from 'socket.io-client';
import * as constantsV from '../../constants/constatantsV';
import authService from '../../services/auth/authService';
import { useAuth } from '../../context/AuthContext';
// WebRTC imports
import { mediaDevices, RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, MediaStream } from 'react-native-webrtc';
import userService from '../../services/users/userService';

type AudioStackParamList = {
  UserAudioList: undefined;
  AudioCall: { targetUserId?: string; targetUserName?: string; incoming?: boolean };
};

type AudioCallRouteProp = RouteProp<AudioStackParamList, 'AudioCall'>;

const AudioCallScreen: React.FC<{ route: AudioCallRouteProp }> = ({ route }) => {
  const { targetUserId, targetUserName, incoming } = route.params || {};
  const [callState, setCallState] = useState<'idle' | 'ringing' | 'connecting' | 'in_call' | 'ended'>(incoming ? 'ringing' : 'idle');
  const [speakerOn, setSpeakerOn] = useState(true);
  const [partnerName, setPartnerName] = useState<string | undefined>(targetUserName);
  const [callStartAt, setCallStartAt] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [iceState, setIceState] = useState<string>('new');
  const [pcConnState, setPcConnState] = useState<string>('new');
  const [remoteAudioTracks, setRemoteAudioTracks] = useState<number>(0);
  const [localAudioTracks, setLocalAudioTracks] = useState<number>(0);
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<any>(null);
  const remoteStreamRef = useRef<any>(null);
  const roomRef = useRef<string>('');
  const pendingOfferRef = useRef<any>(null);
  const callStateRef = useRef(callState);
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  useEffect(() => { callStateRef.current = callState; }, [callState]);

  useEffect(() => {
    // Build deterministic call room based on sorted ids
    const a = String(user?.id || 'self');
    const b = String(targetUserId || 'other');
    roomRef.current = `call_${[a, b].sort().join('_')}`;
  }, [targetUserId, user?.id]);

  // Resolve partner name if not already passed
  useEffect(() => {
    (async () => {
      try {
        if (!partnerName && targetUserId) {
          const users = await userService.listUsers();
          const match = users?.find((u: any) => String(u?.id) === String(targetUserId));
          if (match?.name) setPartnerName(match.name);
        }
      } catch (_) {}
    })();
  }, [targetUserId, partnerName]);

  // Update header with name and timer
  useEffect(() => {
    const base = partnerName || targetUserName || targetUserId || 'Audio Call';
    const title = callState === 'in_call' && callStartAt ? `Call: ${base} • ${formatDuration(elapsedSec)}` : `Call: ${base}`;
    navigation.setOptions({ title });
  }, [navigation, partnerName, targetUserName, targetUserId, callState, elapsedSec, callStartAt]);

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
      // Ensure we join the signaling room once socket connects
      socketRef.current.on('connect', () => {
        if (roomRef.current) {
          socketRef.current?.emit('webrtc:join', roomRef.current);
        }
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
            pcRef.current = new RTCPeerConnection({ iceServers: (constantsV as any).ICE_SERVERS });
            (pcRef.current as any).onicecandidate = (event: any) => {
              const candidate = event?.candidate;
              if (candidate) {
                socketRef.current?.emit('webrtc:ice', { room: roomRef.current, candidate });
              }
            };
            (pcRef.current as any).oniceconnectionstatechange = () => {
              try {
                const s = (pcRef.current as any)?.iceConnectionState;
                console.log('ICE state (callee flow):', s);
              } catch (_) {}
            };
            (pcRef.current as any).onconnectionstatechange = () => {
              const s = (pcRef.current as any)?.connectionState;
              setPcConnState(String(s || 'unknown'));
              if (s === 'connected') {
                setCallState('in_call');
                if (!callStartAt) setCallStartAt(Date.now());
              }
              if (s === 'failed') {
                console.warn('ICE connection failed');
              }
            };
            (pcRef.current as any).oniceconnectionstatechange = () => {
              try {
                const s = (pcRef.current as any)?.iceConnectionState;
                setIceState(String(s || 'unknown'));
                console.log('ICE state (callee flow):', s);
              } catch (_) {}
            };
            // Capture remote tracks for audio
            (pcRef.current as any).ontrack = (event: any) => {
              try {
                const stream = event?.streams?.[0];
                if (stream) {
                  remoteStreamRef.current = stream;
                  // Audio tracks play automatically on native; ensure enabled
                  const tracks = stream.getAudioTracks();
                  tracks.forEach((t: any) => (t.enabled = true));
                  setRemoteAudioTracks(tracks?.length || 0);
                  // Start timer when remote audio arrives
                  if (callStateRef.current !== 'in_call') {
                    setCallState('in_call');
                  }
                  if (!callStartAt) setCallStartAt(Date.now());
                }
              } catch (_) {}
            };
            // Fallback for older react-native-webrtc versions
            (pcRef.current as any).onaddstream = (event: any) => {
              try {
                const stream = event?.stream;
                if (stream) {
                  remoteStreamRef.current = stream;
                  const tracks = stream.getAudioTracks();
                  tracks.forEach((t: any) => (t.enabled = true));
                  setRemoteAudioTracks(tracks?.length || 0);
                }
              } catch (_) {}
            };
          }
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
          if (!localStreamRef.current) {
            // Ensure mic permission on Android before acquiring stream
            if (Platform.OS === 'android') {
              try {
                const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                  console.warn('Microphone permission denied');
                  return;
                }
              } catch (e) {
                console.warn('Mic permission request error', e);
              }
            }
            const stream = await mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false } as any);
            localStreamRef.current = stream;
            stream.getTracks().forEach((t: any) => pcRef.current?.addTrack(t, stream));
            try { (pcRef.current as any).addStream?.(stream); } catch (_) {}
            try { setLocalAudioTracks(stream.getAudioTracks()?.length || 0); } catch (_) {}
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
    // Pre-activate audio session and route to speaker
    try {
      InCallManager.start({ media: 'audio' });
      InCallManager.setForceSpeakerphoneOn(true);
      InCallManager.setSpeakerphoneOn(true);
      setSpeakerOn(true);
    } catch (_) {}
    // Notify target user of incoming call
    if (targetUserId) {
      socketRef.current?.emit('webrtc:invite', { to: targetUserId, room: roomRef.current });
    }
    // Create peer connection
    pcRef.current = new RTCPeerConnection({ iceServers: (constantsV as any).ICE_SERVERS });
    try { (pcRef.current as any).addTransceiver?.('audio', { direction: 'sendrecv' }); } catch (_) {}
    // Assign handler properties with safe casts to satisfy TS
    (pcRef.current as any).onicecandidate = (event: any) => {
      try {
        const candidate = event?.candidate;
        if (candidate) {
          socketRef.current?.emit('webrtc:ice', { room: roomRef.current, candidate });
        }
      } catch (_) { /* ignore */ }
    };
    (pcRef.current as any).oniceconnectionstatechange = () => {
      try {
        const s = (pcRef.current as any)?.iceConnectionState;
        console.log('ICE state (caller flow):', s);
      } catch (_) {}
    };
    (pcRef.current as any).onconnectionstatechange = () => {
      try {
        const s = (pcRef.current as any)?.connectionState;
        setPcConnState(String(s || 'unknown'));
        if (s === 'connected') {
          setCallState('in_call');
          if (!callStartAt) setCallStartAt(Date.now());
        }
        if (s === 'failed') {
          console.warn('ICE connection failed');
        }
      } catch (_) { /* ignore */ }
    };
    (pcRef.current as any).oniceconnectionstatechange = () => {
      try {
        const s = (pcRef.current as any)?.iceConnectionState;
        setIceState(String(s || 'unknown'));
        console.log('ICE state (caller flow):', s);
      } catch (_) {}
    };
    (pcRef.current as any).ontrack = (event: any) => {
      try {
        const stream = event?.streams?.[0] || (event?.track ? new MediaStream([event.track]) : null);
        if (stream) {
          remoteStreamRef.current = stream;
          const tracks = stream.getAudioTracks();
          tracks.forEach((t: any) => (t.enabled = true));
          setRemoteAudioTracks(tracks?.length || 0);
          // Reinforce audio routing to speaker when remote audio arrives
          try {
            InCallManager.setForceSpeakerphoneOn(true);
            InCallManager.setSpeakerphoneOn(true);
          } catch (_) {}
          // Start timer when remote audio arrives
          if (callStateRef.current !== 'in_call') {
            setCallState('in_call');
          }
          if (!callStartAt) setCallStartAt(Date.now());
        }
      } catch (_) { /* ignore */ }
    };
    // Support legacy stream event for some platforms
    (pcRef.current as any).onaddstream = (event: any) => {
      try {
        const stream = event?.stream;
        if (stream) {
          remoteStreamRef.current = stream;
          const tracks = stream.getAudioTracks();
          tracks.forEach((t: any) => (t.enabled = true));
          setRemoteAudioTracks(tracks?.length || 0);
          try {
            InCallManager.setForceSpeakerphoneOn(true);
            InCallManager.setSpeakerphoneOn(true);
          } catch (_) {}
          if (callStateRef.current !== 'in_call') {
            setCallState('in_call');
          }
          if (!callStartAt) setCallStartAt(Date.now());
        }
      } catch (_) {}
    };

    // Acquire audio stream
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('Microphone permission denied');
          return;
        }
      } catch (e) {
        console.warn('Mic permission request error', e);
      }
    }
    const stream = await mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
      video: false
    } as any);
    localStreamRef.current = stream;
    stream.getTracks().forEach((t: any) => pcRef.current?.addTrack(t, stream));
    try { (pcRef.current as any).addStream?.(stream); } catch (_) {}
    try { setLocalAudioTracks(stream.getAudioTracks()?.length || 0); } catch (_) {}

    // Create offer
    const offer = await pcRef.current.createOffer({ offerToReceiveAudio: true });
    await pcRef.current.setLocalDescription(offer);
    socketRef.current?.emit('webrtc:offer', { room: roomRef.current, sdp: offer });
  };

  const acceptCall = async () => {
    setCallState('connecting');
    // Activate audio session immediately and route to speaker
    try {
      InCallManager.start({ media: 'audio' });
      InCallManager.setForceSpeakerphoneOn(true);
      InCallManager.setSpeakerphoneOn(true);
      setSpeakerOn(true);
    } catch (_) {}
    if (!pcRef.current) {
      pcRef.current = new RTCPeerConnection({ iceServers: (constantsV as any).ICE_SERVERS });
      try { (pcRef.current as any).addTransceiver?.('audio', { direction: 'sendrecv' }); } catch (_) {}
      (pcRef.current as any).onicecandidate = (event: any) => {
        const candidate = event?.candidate;
        if (candidate) {
          socketRef.current?.emit('webrtc:ice', { room: roomRef.current, candidate });
        }
      };
      (pcRef.current as any).oniceconnectionstatechange = () => {
        try {
          const s = (pcRef.current as any)?.iceConnectionState;
          console.log('ICE state (callee accepted):', s);
        } catch (_) {}
      };
      (pcRef.current as any).onconnectionstatechange = () => {
        const s = (pcRef.current as any)?.connectionState;
        setPcConnState(String(s || 'unknown'));
        if (s === 'connected') {
          setCallState('in_call');
          if (!callStartAt) setCallStartAt(Date.now());
        }
        if (s === 'failed') {
          console.warn('ICE connection failed');
        }
      };
      (pcRef.current as any).oniceconnectionstatechange = () => {
        try {
          const s = (pcRef.current as any)?.iceConnectionState;
          setIceState(String(s || 'unknown'));
          console.log('ICE state (callee accepted):', s);
        } catch (_) {}
      };
      (pcRef.current as any).ontrack = (event: any) => {
        const stream = event?.streams?.[0] || (event?.track ? new MediaStream([event.track]) : null);
        if (stream) {
          remoteStreamRef.current = stream;
          const tracks = stream.getAudioTracks();
          tracks.forEach((t: any) => (t.enabled = true));
          setRemoteAudioTracks(tracks?.length || 0);
          try {
            InCallManager.setForceSpeakerphoneOn(true);
            InCallManager.setSpeakerphoneOn(true);
          } catch (_) {}
          if (callStateRef.current !== 'in_call') {
            setCallState('in_call');
          }
          if (!callStartAt) setCallStartAt(Date.now());
        }
      };
      // Legacy onaddstream for older devices
      (pcRef.current as any).onaddstream = (event: any) => {
        const stream = event?.stream;
        if (stream) {
          remoteStreamRef.current = stream;
          const tracks = stream.getAudioTracks();
          tracks.forEach((t: any) => (t.enabled = true));
          setRemoteAudioTracks(tracks?.length || 0);
          try {
            InCallManager.setForceSpeakerphoneOn(true);
            InCallManager.setSpeakerphoneOn(true);
          } catch (_) {}
          if (callStateRef.current !== 'in_call') {
            setCallState('in_call');
          }
          if (!callStartAt) setCallStartAt(Date.now());
        }
      };
    }
    // Acquire audio
    if (!localStreamRef.current) {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn('Microphone permission denied');
            return;
          }
        } catch (e) {
          console.warn('Mic permission request error', e);
        }
      }
      const stream = await mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false
      } as any);
      localStreamRef.current = stream;
      stream.getTracks().forEach((t: any) => pcRef.current?.addTrack(t, stream));
      try { (pcRef.current as any).addStream?.(stream); } catch (_) {}
      try { setLocalAudioTracks(stream.getAudioTracks()?.length || 0); } catch (_) {}
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

  const toggleSpeaker = (next?: boolean) => {
    const desired = typeof next === 'boolean' ? next : !speakerOn;
    setSpeakerOn(desired);
    try {
      InCallManager.setForceSpeakerphoneOn(desired);
      InCallManager.setSpeakerphoneOn(desired);
    } catch (e) {
      console.warn('toggleSpeaker error', e);
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
    try {
      InCallManager.stopRingtone();
      InCallManager.stop();
    } catch (_) {}
  };

  // Drive ringtone and audio routing from call state
  useEffect(() => {
    if (callState === 'ringing') {
      try {
        InCallManager.start({ media: 'audio' });
        // Provide full argument list: ringtone id, vibrate pattern, iOS category, duration seconds
        InCallManager.startRingtone('default', [0, 500, 500], 'AVAudioSessionCategorySoloAmbient', 30);
      } catch (_) {
        // Fallback to vibration if native module not available
        if (Platform.OS !== 'web') {
          Vibration.vibrate([0, 500, 500], true);
        }
      }
    } else if (callState === 'in_call' || callState === 'connecting') {
      try {
        InCallManager.stopRingtone();
        InCallManager.start({ media: 'audio' });
        InCallManager.setForceSpeakerphoneOn(true);
        InCallManager.setMicrophoneMute(false);
      } catch (_) { /* ignore */ }
      // Stop vibration
      Vibration.cancel();
    } else if (callState === 'ended' || callState === 'idle') {
      try {
        InCallManager.stopRingtone();
        InCallManager.stop();
      } catch (_) { /* ignore */ }
      Vibration.cancel();
    }
  }, [callState]);

  // Track elapsed time while in-call
  useEffect(() => {
    if (callStartAt && callState === 'in_call') {
      const id = setInterval(() => {
        setElapsedSec(Math.floor((Date.now() - callStartAt) / 1000));
      }, 1000);
      return () => clearInterval(id);
    }
  }, [callStartAt, callState]);

  // Reset timer when leaving call
  useEffect(() => {
    if (callState === 'ended' || callState === 'idle') {
      setCallStartAt(null);
      setElapsedSec(0);
    }
  }, [callState]);

  const formatDuration = (s: number) => {
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audio Streaming</Text>
      <Text style={styles.subtitle}>
        {callState === 'ringing' && incoming && (partnerName || targetUserName || targetUserId)
          ? `Incoming call from ${partnerName || targetUserName || targetUserId}`
          : callState === 'in_call' && (partnerName || targetUserName || targetUserId)
          ? `In call with ${partnerName || targetUserName || targetUserId} • ${formatDuration(elapsedSec)}`
          : (partnerName || targetUserName)
          ? `Calling ${partnerName || targetUserName}`
          : 'Select a user to start a call'}
      </Text>
      <Text style={styles.debug}>ICE: {iceState} • PC: {pcConnState} • Local audio: {localAudioTracks} • Remote audio: {remoteAudioTracks}</Text>

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
          <>
            <TouchableOpacity
              style={speakerOn ? styles.primaryBtn : styles.neutralBtn}
              onPress={() => toggleSpeaker()}
            >
              <Text style={styles.btnText}>{speakerOn ? 'Big Speaker: On' : 'Big Speaker: Off'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dangerBtn} onPress={endCall}>
              <Text style={styles.btnText}>End Call</Text>
            </TouchableOpacity>
          </>
        )}
        {callState === 'ended' && <Text style={styles.status}>Call Ended</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 8 },
  debug: { fontSize: 12, color: '#888', marginBottom: 16 },
  controls: { alignItems: 'center', gap: 12 },
  primaryBtn: { backgroundColor: '#3b82f6', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  dangerBtn: { backgroundColor: '#ef4444', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  neutralBtn: { backgroundColor: '#6b7280', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '600' },
  status: { fontSize: 16, color: '#333' },
});

export default AudioCallScreen;
