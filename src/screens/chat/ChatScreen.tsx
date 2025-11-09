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
      // Connect to Socket.io server with JWT from storage
      const token = (await authService.getToken()) || '';
      socketRef.current = io(constantsV.CHAT_BASE_URL, {
        transports: ['websocket', 'polling'],
        path: '/voodoo/socket.io',
        timeout: 10000,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        auth: { token },
        extraHeaders: { Authorization: `Bearer ${token}` },
      });

      // Join room
      socketRef.current.emit('joinRoom', room);

      // Listen for messages
      socketRef.current.on('message', (msg) => {
        setMessages(prev => [...prev, msg]);
      });

      // Load message history for this room
      try {
        const history = await chatService.getMessages(room);
        const mapped = (history || []).map((m: any) => ({
          id: String(m.id),
          text: String(m.text || ''),
          sender: m.user?.name || 'Unknown',
          timestamp: m.createdAt ? new Date(m.createdAt) : new Date(),
        }));
        setMessages(mapped);
      } catch (e) {
        // ignore history load errors to keep chat usable
      }
    })();

    return () => {
      // Clean up on unmount
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [room]);

  const handleSend = () => {
    if (message.trim() && socketRef.current) {
      const newMessage = {
        id: Date.now().toString(),
        text: message,
        sender: user?.name || 'Anonymous',
        timestamp: new Date(),
      };
      
      // Persist to backend
      try { chatService.sendMessage(room, message).catch(()=>{}); } catch(e) {}

      socketRef.current.emit('sendMessage', {
        room,
        message: newMessage
      });
      
      setMessage('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <Card elevation="medium" style={styles.chatContainer}>
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
