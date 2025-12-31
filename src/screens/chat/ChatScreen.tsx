import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import * as constantsV from '../../constants/constatantsV';
import authService from '../../services/auth/authService';
import chatService from '../../services/chat/chatService';

type Message = {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
};

const ChatScreen = ({ route }: any) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [connectionError, setConnectionError] = useState<string>('');
  const { targetUserId, targetUserName } = route?.params || {};
  const [room, setRoom] = useState<string>('general');
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Compute direct message room if target provided; use sorted ids for deterministic room
    if (user?.id && targetUserId) {
      const a = String(user.id);
      const b = String(targetUserId);
      const roomId = `dm_${[a, b].sort().join('_')}`;
      if (room !== roomId) setRoom(roomId);
    } else {
      if (room !== 'general') setRoom('general');
    }
  }, [user?.id, targetUserId]);

  useEffect(() => {
    (async () => {
      let active = true;
      // Load cached messages first for instant UI, scoped by room
      try {
        const cacheKey = `chat_cache_${room}`;
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const raw = JSON.parse(cached) as Array<any>;
          const mapped = (raw || []).map((m: any) => ({
            id: String(m.id),
            text: String(m.text || ''),
            sender: String(m.sender || 'Unknown'),
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          }));
          if (active) {
            setMessages(prev => {
              const byId = new Map<string, Message>();
              [...mapped, ...prev].forEach((msg) => { byId.set(String(msg.id), msg); });
              return Array.from(byId.values()).sort((a,b)=> new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            });
          }
        }
      } catch (e) {
        // ignore cache load errors
      }
      // Load message history first to avoid overwriting live messages
      try {
        const history = await chatService.getMessages(room);
      const mapped = (history || []).map((m: any) => ({
        id: String(m.id),
        text: String(m.text || ''),
        sender: m.user?.name || m.sender || 'Unknown',
        timestamp: m.createdAt
          ? new Date(m.createdAt)
          : m.timestamp
          ? new Date(m.timestamp)
          : new Date(),
      }));
        if (active) {
          setMessages(prev => {
            const byId = new Map<string, Message>();
            [...mapped, ...prev].forEach((msg) => { byId.set(String(msg.id), msg); });
            return Array.from(byId.values()).sort((a,b)=> new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          });
        }
      } catch (e) {
        // ignore history load errors to keep chat usable
      }

      // Connect to Socket.io server with JWT from storage
      const token = (await authService.getToken()) || '';
      
      if (!token) {
        setConnectionError('Not logged in. Please sign in to chat.');
        return;
      }

      // Configure transports: favor polling on Android to avoid common WebSocket handshake issues
      const isDev = (typeof __DEV__ !== 'undefined' ? __DEV__ : false);
      const transportList = Platform.OS === 'android' ? ['polling', 'websocket'] : (isDev ? ['polling', 'websocket'] : ['websocket', 'polling']);

      socketRef.current = io(constantsV.CHAT_BASE_URL, {
        transports: transportList,
        path: '/voodoo/socket.io',
        timeout: 10000,
        // Allow continuous reconnection attempts; avoid hard stop after a few minutes
        reconnectionDelay: 1000,
        auth: { token },
        extraHeaders: { Authorization: `Bearer ${token}` },
      });

      // Surface connection/auth errors to the UI to guide users
      socketRef.current.on('connect_error', (err: any) => {
        const msg = err?.message || 'Chat connection failed';
        // 'websocket error' usually means the WS handshake failed; this often happens on corporate/cellular networks
        // or due to certificate/proxy issues. The client should fall back to polling automatically,
        // but we surface a friendly status while it retries.
        if (msg === 'websocket error' || msg === 'xhr poll error') {
          setConnectionError('Connecting...');
        } else {
          setConnectionError(msg);
        }
      });

      // Refresh auth token during reconnect attempts to avoid expired sessions
      socketRef.current.on('reconnect_attempt', async () => {
        const freshToken = (await authService.getToken()) || '';
        if (socketRef.current) {
          socketRef.current.auth = { token: freshToken } as any;
          // socket.io client stores options under io.opts
          (socketRef.current as any).io.opts.extraHeaders = { Authorization: `Bearer ${freshToken}` };
        }
      });

      socketRef.current.on('disconnect', () => {
        setConnectionError('Reconnecting…');
      });

      // Join room on connect/reconnect
      socketRef.current.on('connect', () => {
        setConnectionError('');
        socketRef.current?.emit('joinRoom', room);
      });
      socketRef.current.on('reconnect', () => {
        setConnectionError('');
        socketRef.current?.emit('joinRoom', room);
      });
      // Also attempt initial join
      socketRef.current.emit('joinRoom', room);

      // Listen for messages
      socketRef.current.on('message', (msg: any) => {
        const mapped = {
          id: String(msg.id || Date.now()),
          text: String(msg.text || ''),
          sender: String(msg.sender || 'Unknown'),
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        } as Message;
        setMessages(prev => {
          const byId = new Map<string, Message>();
          [...prev, mapped].forEach((m) => { byId.set(String(m.id), m); });
          return Array.from(byId.values()).sort((a,b)=> new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        });
      });
    })();

    return () => {
      // Clean up on unmount
      if (socketRef.current) {
        socketRef.current.off('message');
        socketRef.current.off('connect_error');
        socketRef.current.disconnect();
      }
    };
  }, [room, user?.id]);

  // Persist messages to cache so navigating away and back keeps them
  useEffect(() => {
    (async () => {
      try {
        const cacheKey = `chat_cache_${room}`;
        const payload = messages.map(m => ({
          id: m.id,
          text: m.text,
          sender: m.sender,
          timestamp: new Date(m.timestamp).toISOString(),
        }));
        await AsyncStorage.setItem(cacheKey, JSON.stringify(payload));
      } catch (e) {
        // ignore cache save errors
      }
    })();
  }, [messages, room]);

  const handleSend = () => {
    const text = message.trim();
    if (!text) return;
    // Prefer socket if connected; otherwise fall back to REST API
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('sendMessage', { room, text, sender: user?.name || 'Me' });
      setMessage('');
      return;
    }
    // REST fallback when socket is disconnected
    (async () => {
      try {
        const res = await chatService.sendMessage(room, text);
        const mapped = {
          id: String(res?.id || Date.now()),
          text: String(res?.text || text),
          sender: String(res?.sender || res?.user?.name || user?.name || 'Me'),
          timestamp: res?.createdAt
            ? new Date(res.createdAt)
            : res?.timestamp
            ? new Date(res.timestamp)
            : new Date(),
        } as Message;
        setMessages(prev => {
          const byId = new Map<string, Message>();
          [...prev, mapped].forEach((m) => { byId.set(String(m.id), m); });
          return Array.from(byId.values()).sort((a,b)=> new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        });
        setMessage('');
      } catch (e: any) {
        const status = e?.response?.status;
        if (status === 401) {
          setConnectionError('Session expired. Please log in again.');
        } else {
          setConnectionError('Unable to send message. Please check connection.');
        }
      }
    })();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <Card elevation="medium" style={styles.chatContainer}>
          {connectionError ? (
            <Text style={styles.errorBanner}>{connectionError}</Text>
          ) : null}
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={[
                styles.message,
                item.sender === user?.name ? styles.myMessage : styles.otherMessage
              ]}>
                <Text style={styles.sender}>{item.sender}</Text>
                <Text style={styles.messageText}>{item.text}</Text>
                <Text style={styles.timestamp}>
                  {new Date(item.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            )}
            contentContainerStyle={styles.messagesList}
          />
          
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={message}
              onChangeText={setMessage}
              placeholder="Type a message..."
              placeholderTextColor="#999"
            />
            <Button 
              label="Send" 
              onPress={handleSend} 
              variant="primary"
              size="small"
              disabled={!message.trim()}
            />
          </View>
        </Card>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoid: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
    margin: 10,
    padding: 10,
  },
  messagesList: {
    paddingBottom: 10,
  },
  message: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#e3f2fd',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f1f1',
  },
  sender: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  errorBanner: {
    backgroundColor: '#fdecea',
    color: '#b71c1c',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
  },
});

export default ChatScreen;
