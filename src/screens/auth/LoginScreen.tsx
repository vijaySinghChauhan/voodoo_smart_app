import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import logService from '../../services/logging/logService';
import configService from '../../services/config/configService';
import * as constantsV from '../../constants/constatantsV';

const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const { login, isLoading } = useAuth();

  useEffect(() => {
    // Load current or default base URL into field
    (async () => {
      const current = await configService.getBaseUrl();
      setBaseUrl(current || constantsV.BASE_URL);
    })();
  }, []);

  const handleLogin = async () => {
    try { await logService.logButtonClick('Login Attempt', { email }); } catch (e) {}
    // navigation.reset({
    //   index: 0,
    //   routes: [{ name: 'Auth' as never }],
    // });

    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter both email and password',
        position: 'bottom'
      });
      return;
    }

    try {
     await login(email, password);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Login successful',
        position: 'bottom'
      });
      navigation.navigate('DashboardMain')
    } catch (error: any) {
      const message = (error?.response?.data?.message || error?.message || 'Login failed') as string;
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: message,
        position: 'bottom'
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollView}>
          <View style={styles.formContainer}>
            <Text style={styles.title}>VoodooTech Smart</Text>
            <Text style={styles.subtitle}>Login to your account</Text>

            {/* Base URL field removed per request; login uses fixed endpoint */}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => handleLogin()}         
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account?</Text>
              <TouchableOpacity onPress={async () => { try { await logService.logButtonClick('Navigate Signup'); } catch (e) {} ; navigation.navigate('Signup'); }}>
                <Text style={styles.signupLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  formContainer: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: '#4a90e2',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  smallButton: {
    backgroundColor: '#e0e7ff',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  smallButtonText: {
    color: '#1f3b7d',
    fontSize: 12,
    fontWeight: '600',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  signupText: {
    color: '#666',
    fontSize: 14,
  },
  signupLink: {
    color: '#4a90e2',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default LoginScreen;
