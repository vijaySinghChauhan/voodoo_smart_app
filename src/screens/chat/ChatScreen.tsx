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

type Message = {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
};

const ChatScreen = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [room, setRoom] = useState('general');
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuth();

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
