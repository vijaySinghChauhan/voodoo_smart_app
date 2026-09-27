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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import logService from '../../services/logging/logService';
import configService from '../../services/config/configService';
import * as constantsV from '../../constants/constatantsV';
import { COLORS, FONTS, SIZES, SHADOWS } from '../../theme/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';

const LoginScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [baseUrl, setBaseUrl] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading } = useAuth();

  useEffect(() => {
    (async () => {
      const current = await configService.getBaseUrl();
      setBaseUrl(current || constantsV.BASE_URL);
    })();
  }, []);

  const handleLogin = async () => {
    try { await logService.logButtonClick('Login Attempt', { email }); } catch (e) {}

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
      <StatusBar backgroundColor={COLORS.white} barStyle="dark-content" />
      <View style={styles.cornerTopRight} />
      <View style={styles.cornerBottomLeft} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollView}>
          <View style={styles.formContainer}>
            <View style={styles.brandHeader}>
              <View style={styles.brandLogo}>
                <Text style={styles.brandV}>V</Text>
                <View style={[styles.infinityRing, styles.infinityMint]} />
                <View style={[styles.infinityRing, styles.infinityCyan]} />
                <Text style={styles.brandDoo}>Doo</Text>
              </View>
              <Text style={styles.brandTech}>T E C H</Text>
            </View>

            <View style={styles.brandDivider} />

            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Login to your VooDoo account</Text>

            <View style={styles.card}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={18} color={COLORS.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor={COLORS.textVeryLight}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color={COLORS.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor={COLORS.textVeryLight}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={styles.inputEye}>
                    <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textLight} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => handleLogin()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.loginButtonText}>Login</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account?</Text>
              <TouchableOpacity onPress={async () => { try { await logService.logButtonClick('Navigate Signup'); } catch (e) {} ; navigation.navigate('Signup'); }}>
                <Text style={styles.signupLink}>Sign up</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footerTagline}>BUILD ∞ AUTOMATE ∞ GROW</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 180,
    height: 180,
    backgroundColor: COLORS.cornerMint,
    borderBottomLeftRadius: 180,
    opacity: 0.85,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 160,
    height: 160,
    backgroundColor: COLORS.cornerDark,
    borderTopRightRadius: 160,
    opacity: 0.9,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: SIZES.padding * 2,
  },
  formContainer: {
    padding: SIZES.padding,
    zIndex: 10,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: SIZES.margin,
  },
  brandLogo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandV: {
    fontSize: 52,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: -1,
  },
  infinityRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 5,
  },
  infinityMint: {
    borderColor: COLORS.primaryMid,
    marginRight: -10,
  },
  infinityCyan: {
    borderColor: COLORS.primaryCyan,
    marginLeft: -10,
  },
  brandDoo: {
    fontSize: 52,
    fontWeight: '900',
    color: COLORS.primaryCyan,
    letterSpacing: -1,
  },
  brandTech: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMedium,
    letterSpacing: 7,
    marginTop: 2,
  },
  brandDivider: {
    alignSelf: 'center',
    width: 64,
    height: 3,
    backgroundColor: COLORS.divider,
    borderRadius: 2,
    marginBottom: SIZES.padding,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textLight,
    marginBottom: SIZES.padding * 1.2,
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius + 4,
    padding: SIZES.padding * 1.2,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.large,
  },
  inputContainer: {
    marginBottom: SIZES.margin,
  },
  label: {
    fontSize: 14,
    marginBottom: SIZES.base,
    color: COLORS.textDark,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius,
    paddingHorizontal: SIZES.padding / 2,
  },
  inputIcon: {
    marginRight: SIZES.base,
  },
  inputEye: {
    padding: SIZES.base,
  },
  input: {
    flex: 1,
    paddingVertical: SIZES.padding / 2 + 2,
    color: COLORS.textDark,
    fontSize: 15,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.base * 1.8,
    alignItems: 'center',
    marginTop: SIZES.base,
    ...SHADOWS.medium,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SIZES.padding,
  },
  signupText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: '500',
  },
  signupLink: {
    color: COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 5,
  },
  footerTagline: {
    marginTop: SIZES.padding * 1.5,
    textAlign: 'center',
    color: COLORS.textVeryLight,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3,
  },
});

export default LoginScreen;
