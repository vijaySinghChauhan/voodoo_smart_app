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
  StatusBar,
} from 'react-native';
import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import * as constantsV from '../../constants/constatantsV';
import authService from '../../services/auth/authService';
import chatService from '../../services/chat/chatService';
import { COLORS, SHADOWS, SIZES, FONTS } from '../../theme/theme';

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
      }
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
      }

      const token = (await authService.getToken()) || '';
      
      if (!token) {
        setConnectionError('Not logged in. Please sign in to chat.');
        return;
      }

      const isDev = (typeof __DEV__ !== 'undefined' ? __DEV__ : false);
      const transportList = Platform.OS === 'android' ? ['polling', 'websocket'] : (isDev ? ['polling', 'websocket'] : ['websocket', 'polling']);

      socketRef.current = io(constantsV.CHAT_BASE_URL, {
        transports: transportList,
        path: '/voodoo/socket.io',
        timeout: 10000,
        reconnectionDelay: 1000,
        auth: { token },
        extraHeaders: { Authorization: `Bearer ${token}` },
      });

      socketRef.current.on('connect_error', (err: any) => {
        const msg = err?.message || 'Chat connection failed';
        if (msg === 'websocket error' || msg === 'xhr poll error') {
          setConnectionError('Connecting...');
        } else {
          setConnectionError(msg);
        }
      });

      socketRef.current.on('reconnect_attempt', async () => {
        const freshToken = (await authService.getToken()) || '';
        if (socketRef.current) {
          socketRef.current.auth = { token: freshToken } as any;
          (socketRef.current as any).io.opts.extraHeaders = { Authorization: `Bearer ${freshToken}` };
        }
      });

      socketRef.current.on('disconnect', () => {
        setConnectionError('Reconnecting…');
      });

      socketRef.current.on('connect', () => {
        setConnectionError('');
        socketRef.current?.emit('joinRoom', room);
      });
      socketRef.current.on('reconnect', () => {
        setConnectionError('');
        socketRef.current?.emit('joinRoom', room);
      });
      socketRef.current.emit('joinRoom', room);

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
      if (socketRef.current) {
        socketRef.current.off('message');
        socketRef.current.off('connect_error');
        socketRef.current.disconnect();
      }
    };
  }, [room, user?.id]);

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
      }
    })();
  }, [messages, room]);

  const handleSend = () => {
    const text = message.trim();
    if (!text) return;
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('sendMessage', { room, text, sender: user?.name || 'Me' });
      setMessage('');
      return;
    }
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
      <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <Card elevation="large" style={styles.chatContainer}>
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
              placeholderTextColor={COLORS.textVeryLight}
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
    backgroundColor: COLORS.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  chatContainer: {
    flex: 1,
    margin: 10,
    padding: 10,
    ...SHADOWS.large,
  },
  messagesList: {
    paddingBottom: 10,
  },
  message: {
    padding: 10,
    borderRadius: SIZES.radius,
    marginBottom: 8,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.watermarkCyan,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.lightGray,
  },
  sender: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: COLORS.textDark,
  },
  messageText: {
    fontSize: 16,
    color: COLORS.textDark,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'right',
  },
  errorBanner: {
    backgroundColor: COLORS.white,
    color: COLORS.error,
    padding: 8,
    borderRadius: SIZES.radius,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    color: COLORS.textDark,
    backgroundColor: COLORS.white,
  },
});

export default ChatScreen;
