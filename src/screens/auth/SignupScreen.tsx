import React, { useState } from 'react';
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
import { COLORS, FONTS, SIZES, SHADOWS } from '../../theme/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';

const SignupScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const isValidPhone = (p: string) => {
    const digits = p.replace(/[^\d]/g, '');
    return digits.length === 0 || (digits.length >= 10 && digits.length <= 15);
  };
  const phoneInvalid = phone.length > 0 && !isValidPhone(phone);
  const { signup, isLoading } = useAuth();

  const handleSignup = async () => {
    try { await logService.logButtonClick('Signup Attempt', { name, email }); } catch (e) {}
    if (!name || !email || !password || !confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please fill in all fields',
        position: 'bottom'
      });
      return;
    }

    if (password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Passwords do not match',
        position: 'bottom'
      });
      return;
    }

    if (phoneInvalid) {
      Toast.show({
        type: 'error',
        text1: 'Invalid phone',
        text2: 'Please enter a valid phone number',
        position: 'bottom'
      });
      return;
    }

    try {
      await signup(name, email, password, phone);
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Account created successfully',
        position: 'bottom'
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Signup Failed',
        text2: 'Could not create account. Please try again.',
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

            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join VooDoo and start building</Text>

            <View style={styles.card}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color={COLORS.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your name"
                    placeholderTextColor={COLORS.textVeryLight}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
              </View>

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
                    placeholder="Create a password"
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

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color={COLORS.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your password"
                    placeholderTextColor={COLORS.textVeryLight}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword((v) => !v)} style={styles.inputEye}>
                    <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textLight} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Phone</Text>
                <View style={[styles.inputWrapper, phoneInvalid && styles.inputWrapperError]}>
                  <Ionicons name="call-outline" size={18} color={COLORS.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your phone number"
                    placeholderTextColor={COLORS.textVeryLight}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
                {phoneInvalid && (
                  <Text style={styles.errorText}>Invalid phone number format</Text>
                )}
              </View>


              <TouchableOpacity
                style={styles.signupButton}
                onPress={handleSignup}
                disabled={isLoading || phoneInvalid}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.signupButtonText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account?</Text>
              <TouchableOpacity onPress={async () => { try { await logService.logButtonClick('Navigate Login'); } catch (e) {} ; navigation.navigate('Login'); }}>
                <Text style={styles.loginLink}>Login</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footerTagline}>IDEAS ∞ TECHNOLOGY ∞ IMPACT</Text>
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
    width: 170,
    height: 170,
    backgroundColor: COLORS.cornerMint,
    borderBottomLeftRadius: 170,
    opacity: 0.85,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 150,
    height: 150,
    backgroundColor: COLORS.cornerDark,
    borderTopRightRadius: 150,
    opacity: 0.9,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: SIZES.padding * 1.5,
  },
  formContainer: {
    padding: SIZES.padding,
    zIndex: 10,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: SIZES.base * 2,
  },
  brandLogo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandV: {
    fontSize: 46,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: -1,
  },
  infinityRing: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 5,
  },
  infinityMint: {
    borderColor: COLORS.primaryMid,
    marginRight: -9,
  },
  infinityCyan: {
    borderColor: COLORS.primaryCyan,
    marginLeft: -9,
  },
  brandDoo: {
    fontSize: 46,
    fontWeight: '900',
    color: COLORS.primaryCyan,
    letterSpacing: -1,
  },
  brandTech: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMedium,
    letterSpacing: 6,
    marginTop: 2,
  },
  brandDivider: {
    alignSelf: 'center',
    width: 56,
    height: 3,
    backgroundColor: COLORS.divider,
    borderRadius: 2,
    marginBottom: SIZES.base * 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: SIZES.base * 2,
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radius + 4,
    padding: SIZES.padding,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.large,
  },
  inputContainer: {
    marginBottom: SIZES.base * 2,
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
  inputWrapperError: {
    borderColor: COLORS.error,
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
  errorText: {
    color: COLORS.error,
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  signupButton: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: SIZES.radius,
    paddingVertical: SIZES.base * 1.8,
    alignItems: 'center',
    marginTop: SIZES.base,
    ...SHADOWS.medium,
  },
  signupButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SIZES.padding,
  },
  loginText: {
    color: COLORS.textLight,
    fontSize: 14,
    fontWeight: '500',
  },
  loginLink: {
    color: COLORS.primaryDark,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 5,
  },
  footerTagline: {
    marginTop: SIZES.padding,
    textAlign: 'center',
    color: COLORS.textVeryLight,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3,
  },
});

export default SignupScreen;
