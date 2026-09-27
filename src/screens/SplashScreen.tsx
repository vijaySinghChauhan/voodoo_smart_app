import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '../theme/theme';

const { width, height } = Dimensions.get('window');

const SplashScreen: React.FC = () => {
  const navigation = useNavigation();
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.3);
  const slideUpAnim = new Animated.Value(40);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 10,
        friction: 2,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    const timer = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' as never }],
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <StatusBar backgroundColor={COLORS.white} barStyle="dark-content" />
      <View style={styles.cornerTopRight} />
      <View style={styles.cornerBottomLeft} />

      <View style={styles.watermarkContainer} pointerEvents="none">
        <View style={[styles.watermarkMint, styles.watermarkLeft]} />
        <View style={[styles.watermarkCyan, styles.watermarkRight]} />
      </View>

      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideUpAnim },
            ],
          },
        ]}
      >
        <View style={styles.logo}>
          <View style={styles.logoInfinity}>
            <Text style={styles.logoTextV}>V</Text>
            <View style={styles.infinityLoopMint} />
            <View style={styles.infinityLoopCyan} />
            <Text style={styles.logoTextDo}>Doo</Text>
          </View>
          <Text style={styles.logoTech}>T E C H</Text>
        </View>

        <Text style={styles.appName}>VooDooHome</Text>
        <View style={styles.divider} />
        <Text style={styles.tagline}>IDEAS ∞ TECHNOLOGY ∞ IMPACT</Text>
      </Animated.View>

      <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
        <View style={styles.loadingDots}>
          <View style={[styles.dot, styles.dotTeal]} />
          <View style={[styles.dot, styles.dotMint]} />
          <View style={[styles.dot, styles.dotCyan]} />
        </View>
        <Text style={styles.footerTagline}>BUILD ∞ AUTOMATE ∞ GROW</Text>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 200,
    height: 200,
    backgroundColor: COLORS.cornerMint,
    borderBottomLeftRadius: 200,
    opacity: 0.9,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 180,
    height: 180,
    backgroundColor: COLORS.cornerDark,
    borderTopRightRadius: 180,
    opacity: 0.9,
  },
  watermarkContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  watermarkMint: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 36,
    borderColor: COLORS.watermarkMint,
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '-30deg' }],
  },
  watermarkCyan: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 36,
    borderColor: COLORS.watermarkCyan,
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
    transform: [{ rotate: '-30deg' }],
  },
  watermarkLeft: {
    bottom: -80,
    left: -100,
  },
  watermarkRight: {
    bottom: -80,
    left: 60,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
    zIndex: 10,
  },
  logo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoInfinity: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoTextV: {
    fontSize: 72,
    fontWeight: '900',
    color: COLORS.primaryDark,
    letterSpacing: -2,
  },
  infinityLoopMint: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 7,
    borderColor: COLORS.primaryMid,
    marginRight: -13,
  },
  infinityLoopCyan: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 7,
    borderColor: COLORS.primaryCyan,
    marginLeft: -13,
  },
  logoTextDo: {
    fontSize: 72,
    fontWeight: '900',
    color: COLORS.primaryCyan,
    letterSpacing: -2,
  },
  logoTech: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.textMedium,
    letterSpacing: 10,
    marginTop: 4,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 14,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  divider: {
    width: 80,
    height: 4,
    backgroundColor: COLORS.divider,
    borderRadius: 2,
    marginBottom: 14,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
    textAlign: 'center',
    letterSpacing: 3,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
    zIndex: 10,
  },
  loadingDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
  },
  dotTeal: {
    backgroundColor: COLORS.primaryDark,
  },
  dotMint: {
    backgroundColor: COLORS.accentMint,
  },
  dotCyan: {
    backgroundColor: COLORS.primaryCyan,
  },
  footerTagline: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    letterSpacing: 4,
  },
});

export default SplashScreen;
