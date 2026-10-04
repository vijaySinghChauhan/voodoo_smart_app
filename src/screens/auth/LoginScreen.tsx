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
import Svg, { Defs, LinearGradient, Rect, Stop, Path } from 'react-native-svg';
import Ionicons from 'react-native-vector-icons/Ionicons';
import BrandLogo from '../../components/BrandLogo';
import { useAuth } from '../../context/AuthContext';
import logService from '../../services/logging/logService';
import configService from '../../services/config/configService';
import * as constantsV from '../../constants/constatantsV';
import { COLORS, SIZES, SHADOWS } from '../../theme/theme';

const BTN_GRADIENT_ID = 'loginBtnGradient';

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
      navigation.navigate('DashboardMain');
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

  const handleSocial = (provider: string) => {
    Toast.show({
      type: 'info',
      text1: `${provider} login`,
      text2: 'Coming soon — please use email login',
      position: 'bottom',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#F7FBFB" barStyle="dark-content" />

      {/* Soft S-wave decorative background layers */}
      <View style={styles.bgWaveTopLeft} pointerEvents="none" />
      <View style={styles.bgSWaveRight} pointerEvents="none" />
      <View style={styles.bgSWaveBottom} pointerEvents="none" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>

            {/* ================== Brand Header ================== */}
            <View style={styles.brandHeader}>
              <BrandLogo size="medium" showTagline={true} />
            </View>

            {/* ================== Headings ================== */}
            <View style={styles.headingsBlock}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to your account</Text>
            </View>

            {/* ================== Inputs ================== */}
            <View style={styles.inputsBlock}>

              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={22} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor={COLORS.textLight}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={22} color={COLORS.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={COLORS.textLight}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((v) => !v)}
                  style={styles.inputEye}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color={COLORS.textLight}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.forgotRow}>
                <TouchableOpacity
                  onPress={() => {
                    Toast.show({
                      type: 'info',
                      text1: 'Forgot Password?',
                      text2: 'Please contact admin or use Sign Up',
                      position: 'bottom',
                    });
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

            </View>

            {/* ================== Login Button ================== */}
            <TouchableOpacity
              style={styles.loginButtonOuter}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.88}
            >
              <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 100 60">
                <Defs>
                  <LinearGradient id={BTN_GRADIENT_ID} x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor={COLORS.primaryMid || '#10B981'} />
                    <Stop offset="45%" stopColor={COLORS.primary || '#14B8A6'} />
                    <Stop offset="100%" stopColor={COLORS.primaryCyan || '#0A84FF'} />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100" height="60" fill={`url(#${BTN_GRADIENT_ID})`} rx="4" ry="4" />
              </Svg>
              <View style={styles.loginButtonInner}>
                {isLoading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>Login</Text>
                    <Ionicons name="arrow-forward" size={24} color={COLORS.white} style={{ marginLeft: 8 }} />
                  </>
                )}
              </View>
            </TouchableOpacity>

            {/* ================== Divider: OR CONTINUE WITH ================== */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* ================== Social Buttons Row ================== */}
            <View style={styles.socialRow}>

              <TouchableOpacity
                style={[styles.socialButton, styles.socialButtonFirst]}
                activeOpacity={0.8}
                onPress={() => handleSocial('Google')}
              >
                <View style={styles.socialIconBox}>
                  <Svg width={20} height={20} viewBox="0 0 48 48">
                    <Defs>
                      <LinearGradient id="ggreen" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#34A853" />
                        <Stop offset="100%" stopColor="#0F9D58" />
                      </LinearGradient>
                    </Defs>
                    <Path
                      fill="#FFC107"
                      d="M43.6 20.5H42V20H24v8h11.3C33.7 33 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.2 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
                    />
                    <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.2 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
                    <Path fill={`url(#ggreen)`} d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.2-7.2 2.2-5.2 0-9.6-3.4-11.2-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                    <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2c-.4.4 6.6-4.8 6.6-14.7 0-1.2-.1-2.3-.4-3.5z"/>
                  </Svg>
                </View>
                <Text style={styles.socialLabel}>Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton]}
                activeOpacity={0.8}
                onPress={() => handleSocial('Apple')}
              >
                <View style={styles.socialIconBox}>
                  <Svg width={20} height={20} viewBox="0 0 24 24">
                    <Path
                      fill="#000"
                      d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
                    />
                  </Svg>
                </View>
                <Text style={styles.socialLabel}>Apple</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.socialButton, styles.socialButtonLast]}
                activeOpacity={0.8}
                onPress={() => handleSocial('Microsoft')}
              >
                <View style={styles.socialIconBox}>
                  <Svg width={20} height={20} viewBox="0 0 23 23">
                    <Rect x="1" y="1" width="9.5" height="9.5" fill="#F25022" />
                    <Rect x="12.5" y="1" width="9.5" height="9.5" fill="#7FBA00" />
                    <Rect x="1" y="12.5" width="9.5" height="9.5" fill="#00A4EF" />
                    <Rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900" />
                  </Svg>
                </View>
                <Text style={styles.socialLabel}>Microsoft</Text>
              </TouchableOpacity>

            </View>

            {/* ================== Footer Sign Up ================== */}
            <View style={styles.signupFooter}>
              <Text style={styles.signupText}>Don't have an account?</Text>
              <TouchableOpacity
                onPress={async () => {
                  try { await logService.logButtonClick('Navigate Signup'); } catch (e) {}
                  navigation.navigate('Signup');
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>

            {baseUrl ? null : null}

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FBFB',
    overflow: 'hidden',
  },
  // Decorative background S-waves (absolute, behind everything)
  bgWaveTopLeft: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: '#CFF5EC',
    opacity: 0.55,
    transform: [{ scaleX: 1.3 }, { rotate: '-10deg' }],
  },
  bgSWaveRight: {
    position: 'absolute',
    top: 160,
    right: -140,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: '#E4F3FF',
    opacity: 0.7,
    transform: [{ scaleY: 0.7 }, { rotate: '8deg' }],
  },
  bgSWaveBottom: {
    position: 'absolute',
    bottom: -180,
    right: -80,
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: '#D4F4EF',
    opacity: 0.8,
    transform: [{ scaleX: 1.2 }],
  },

  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SIZES.padding,
    paddingTop: 10,
    paddingBottom: 40,
  },
  formContainer: {
    width: '100%',
    zIndex: 10,
  },

  /* ========= Brand Header ========= */
  brandHeader: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  taglineRow: {
    marginTop: -4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taglineWord: {
    color: COLORS.textMedium,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 3,
    marginHorizontal: 10,
  },
  taglineInfinity: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '700',
  },

  /* ========= Headings ========= */
  headingsBlock: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 28,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#0B1F3A',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: COLORS.textLight,
    fontWeight: '500',
    textAlign: 'center',
  },

  /* ========= Inputs ========= */
  inputsBlock: {
    marginBottom: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#E4EAEF',
    paddingHorizontal: 18,
    height: 58,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  inputIcon: {
    marginRight: 14,
  },
  inputEye: {
    paddingLeft: 12,
  },
  input: {
    flex: 1,
    color: COLORS.textDark,
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 0,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -6,
    marginBottom: 6,
  },
  forgotText: {
    color: '#0A84FF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* ========= Login Button ========= */
  loginButtonOuter: {
    height: 60,
    borderRadius: 14,
    width: '100%',
    overflow: 'hidden',
    marginTop: 14,
    ...SHADOWS.medium,
  },
  loginButtonInner: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  /* ========= Divider ========= */
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#DCE3EA',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: '700',
    letterSpacing: 1.3,
  },

  /* ========= Social Buttons ========= */
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 0,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E9EEF3',
    paddingHorizontal: 4,
    marginHorizontal: 6,
    ...SHADOWS.small,
  },
  socialButtonFirst: {
    marginLeft: 0,
  },
  socialButtonLast: {
    marginRight: 0,
  },
  socialIconBox: {
    marginRight: 8,
  },
  socialLabel: {
    color: COLORS.textDark,
    fontSize: 14,
    fontWeight: '700',
  },

  /* ========= Footer Sign Up ========= */
  signupFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  signupText: {
    color: COLORS.textDark,
    fontSize: 15,
    fontWeight: '500',
  },
  signupLink: {
    color: '#0A84FF',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 6,
  },
});

export default LoginScreen;
