import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { COLORS } from '../theme/theme';
import BrandLogo from '../components/BrandLogo';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const TOP_LEFT_GRADIENT = 'topLeftWaveGradient';
const BOTTOM_LAYER1_GRADIENT = 'bottomL1';
const BOTTOM_LAYER2_GRADIENT = 'bottomL2';
const BOTTOM_LAYER3_GRADIENT = 'bottomL3';
const BOTTOM_LAYER4_GRADIENT = 'bottomL4';

const SplashScreen: React.FC = () => {
  const navigation = useNavigation();
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.82);
  const slideUpAnim = new Animated.Value(60);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 18,
        friction: 5,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 900,
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
    <View style={styles.container}>
      <StatusBar backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* ===================== TOP-LEFT WAVE DECOR ===================== */}
      <View style={[styles.layer, styles.layerTop]} pointerEvents="none">
        <Svg width={SCREEN_W * 1.2} height={SCREEN_H * 0.45} viewBox={`0 0 ${SCREEN_W} ${Math.round(SCREEN_H * 0.45)}`}>
          <Defs>
            <LinearGradient id={TOP_LEFT_GRADIENT} x1="0%" y1="0%" x2="85%" y2="100%">
              <Stop offset="0%"   stopColor="#BFF0DD" />
              <Stop offset="55%"  stopColor="#86E3D0" />
              <Stop offset="100%" stopColor="#6DCDFF" />
            </LinearGradient>
          </Defs>
          {/* Two overlapping flowing wave curves top-left corner */}
          <Path
            d={`M0 0
                L ${SCREEN_W * 0.78} 0
                C ${SCREEN_W * 0.70} ${SCREEN_H * 0.10}, ${SCREEN_W * 0.40} ${SCREEN_H * 0.16}, ${SCREEN_W * 0.28} ${SCREEN_H * 0.28}
                C ${SCREEN_W * 0.16} ${SCREEN_H * 0.40}, 0 ${SCREEN_H * 0.33}, 0 ${SCREEN_H * 0.45}
                Z`}
            fill={`url(#${TOP_LEFT_GRADIENT})`}
            opacity={0.78}
          />
          <Path
            d={`M0 0
                L ${SCREEN_W * 0.55} 0
                C ${SCREEN_W * 0.52} ${SCREEN_H * 0.08}, ${SCREEN_W * 0.22} ${SCREEN_H * 0.12}, ${SCREEN_W * 0.10} ${SCREEN_H * 0.22}
                C ${SCREEN_W * 0.02} ${SCREEN_H * 0.30}, 0 ${SCREEN_H * 0.24}, 0 ${SCREEN_H * 0.34}
                Z`}
            fill={`url(#${TOP_LEFT_GRADIENT})`}
            opacity={0.42}
          />
        </Svg>
      </View>

      {/* ===================== CENTERED FAINT INFINITY WATERMARK ===================== */}
      <View style={[styles.layer, styles.watermarkLayer]} pointerEvents="none">
        <Svg width={SCREEN_W * 1.2} height={SCREEN_W * 0.7} viewBox="0 0 600 360">
          <Defs>
            <LinearGradient id="watermarkInf" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%"   stopColor="#CFF4EA" />
              <Stop offset="50%"  stopColor="#CCECFF" />
              <Stop offset="100%" stopColor="#C4E7FF" />
            </LinearGradient>
          </Defs>
          <GiantInfinity cx={300} cy={180} rx={240} ry={120} fill={`url(#watermarkInf)`} opacity={0.55} />
        </Svg>
      </View>

      {/* ===================== CENTERED BRAND LOGO ===================== */}
      {/* 20% upward from center: original center = 50% of SCREEN_H from top.
          Subtract 20% of SCREEN_H → place it at absolute top 30%. */}
      <Animated.View
        style={[
          styles.brandCenter,
          {
            top: SCREEN_H * 0.30,
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: slideUpAnim },
            ],
          },
        ]}
      >
        <BrandLogo size="xlarge" showTagline={true} />
      </Animated.View>

      {/* ===================== BOTTOM LAYERED WAVES ===================== */}
      <View style={[styles.layer, styles.layerBottom]} pointerEvents="none">
        <Svg width={SCREEN_W} height={SCREEN_H * 0.52} viewBox={`0 0 ${SCREEN_W} ${Math.round(SCREEN_H * 0.52)}`}>
          <Defs>
            <LinearGradient id={BOTTOM_LAYER1_GRADIENT} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%"   stopColor={COLORS.primaryDark} />
              <Stop offset="100%" stopColor="#0E6B8F" />
            </LinearGradient>
            <LinearGradient id={BOTTOM_LAYER2_GRADIENT} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%"   stopColor="#0B837F" />
              <Stop offset="100%" stopColor="#1B7CD0" />
            </LinearGradient>
            <LinearGradient id={BOTTOM_LAYER3_GRADIENT} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%"   stopColor="#10B8A0" />
              <Stop offset="100%" stopColor="#29B6F6" />
            </LinearGradient>
            <LinearGradient id={BOTTOM_LAYER4_GRADIENT} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%"   stopColor="#6FE2CB" />
              <Stop offset="100%" stopColor="#8EDBFF" />
            </LinearGradient>
          </Defs>

          {/* Layer 1 — bottom-most (deepest blue/teal), tallest */}
          <Path
            d={bottomWavePath(SCREEN_W, SCREEN_H * 0.52, 0, 38, 0.30)}
            fill={`url(#${BOTTOM_LAYER1_GRADIENT})`}
          />
          {/* Layer 2 */}
          <Path
            d={bottomWavePath(SCREEN_W, SCREEN_H * 0.52, 56, 44, 0.18)}
            fill={`url(#${BOTTOM_LAYER2_GRADIENT})`}
            opacity={0.92}
          />
          {/* Layer 3 */}
          <Path
            d={bottomWavePath(SCREEN_W, SCREEN_H * 0.52, 110, 34, 0.08)}
            fill={`url(#${BOTTOM_LAYER3_GRADIENT})`}
            opacity={0.92}
          />
          {/* Layer 4 — topmost (light mint/blue), thin highlight curve with highlight stroke */}
          <Path
            d={bottomWavePath(SCREEN_W, SCREEN_H * 0.52, 152, 22, -0.02)}
            fill={`url(#${BOTTOM_LAYER4_GRADIENT})`}
            opacity={0.92}
          />

          {/* Thin white highlight curve (mimics the reference wavy line highlight) */}
          <Path
            d={bottomWavePath(SCREEN_W, SCREEN_H * 0.52, 124, 16, 0.22)}
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity={0.55}
            strokeWidth={1.4}
          />
        </Svg>
      </View>

      {/* Loading dots near bottom (above waves, subtle) */}
      <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
        <View style={styles.loadingDots}>
          <View style={[styles.dot, styles.dot1]} />
          <View style={[styles.dot, styles.dot2]} />
          <View style={[styles.dot, styles.dot3]} />
        </View>
      </Animated.View>
    </View>
  );
};

/** Builds a curved wave path starting `topOffset` from the top, ending at view bottom. */
function bottomWavePath(W: number, H: number, topOffset: number, amplitude: number, phaseShift: number) {
  const baseY = topOffset;
  const p1x = W * (0.18 + phaseShift);
  const p1y = baseY + amplitude * 0.5;
  const p2x = W * (0.52 + phaseShift);
  const p2y = baseY - amplitude;
  const p3x = W * (0.82 + phaseShift);
  const p3y = baseY + amplitude * 0.6;
  return (
    `M -20 ${H + 20} ` +
    `L -20 ${baseY + amplitude * 0.3} ` +
    `C ${W * 0.05} ${baseY + amplitude * 0.9}, ${p1x * 0.45} ${p1y + amplitude * 0.3}, ${p1x} ${p1y} ` +
    `S ${p2x} ${p2y - amplitude * 0.1}, ${p3x} ${p3y} ` +
    `C ${W - 20} ${baseY + amplitude * 0.4}, ${W + 20} ${baseY + amplitude * 0.2}, ${W + 40} ${baseY + amplitude * 0.5} ` +
    `L ${W + 40} ${H + 20} Z`
  );
}

const GiantInfinity: React.FC<{ cx: number; cy: number; rx: number; ry: number; fill: string; opacity?: number }> = ({ cx, cy, rx, ry, fill, opacity }) => {
  const build = (xC: number, rX: number, rY: number) => {
    const x1 = xC - rX;
    const x2 = xC + rX;
    const y1 = cy - rY;
    const y2 = cy + rY;
    const k = 0.55;
    return (
      `M ${x1} ${cy} ` +
      `C ${x1} ${cy - k * rY}, ${xC - k * rX} ${y1}, ${xC} ${y1} ` +
      `C ${xC + k * rX} ${y1}, ${x2} ${cy - k * rY}, ${x2} ${cy} ` +
      `C ${x2} ${cy + k * rY}, ${xC + k * rX} ${y2}, ${xC} ${y2} ` +
      `C ${xC - k * rX} ${y2}, ${x1} ${cy + k * rY}, ${x1} ${cy} Z`
    );
  };
  return (
    <>
      <Path d={build(cx - rx * 0.45, rx * 0.55, ry)} fill={fill} opacity={opacity} />
      <Path d={build(cx + rx * 0.45, rx * 0.55, ry)} fill={fill} opacity={opacity} />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  layerTop: {
    top: 0,
    left: -30,
  },
  layerBottom: {
    bottom: 0,
  },
  watermarkLayer: {
    top: '32%',
    left: '-10%',
    opacity: 0.7,
  },
  brandCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: Math.max(70, SCREEN_H * 0.10),
    alignItems: 'center',
    zIndex: 20,
  },
  loadingDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
  },
  dot1: { backgroundColor: COLORS.primaryDark },
  dot2: { backgroundColor: COLORS.primaryMid },
  dot3: { backgroundColor: COLORS.primaryCyan },
});

export default SplashScreen;
