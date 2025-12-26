import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import Svg, { Rect, Path, Ellipse, Defs, LinearGradient, Stop, ClipPath } from 'react-native-svg';

type WaterTankProps = {
  percentage: number;
};

const WaterTank = ({ percentage }: WaterTankProps) => {
  const clamped = Math.max(0, Math.min(100, percentage));
  // Dimensions for the 3D tank drawing
  const width = 160;
  const height = 220;
  // Cylinder body
  const bodyTopY = 60;
  const bodyBottomY = 180;
  const cx = width / 2; // center x
  const rx = 48; // ellipse x-radius
  const ry = 16; // ellipse y-radius
  const bodyWidth = rx * 2; // ~96
  const waterLevelY = bodyBottomY - ((clamped / 100) * (bodyBottomY - bodyTopY));

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        <Defs>
          {/* Body shading gradient */}
          <LinearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#cfd6e1" />
            <Stop offset="0.5" stopColor="#aebac9" />
            <Stop offset="1" stopColor="#94a3b5" />
          </LinearGradient>
          {/* Water gradient */}
          <LinearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#4fb2ff" />
            <Stop offset="1" stopColor="#2b7fe0" />
          </LinearGradient>
          {/* Clip to cylinder interior */}
          <ClipPath id="cylinderClip">
            {/* Clip rectangle matching body bounds */}
            <Rect x={cx - rx} y={bodyTopY} width={bodyWidth} height={bodyBottomY - bodyTopY} />
          </ClipPath>
        </Defs>

        {/* Stand legs */}
        <Rect x={cx - 50} y={bodyBottomY + 10} width={16} height={20} rx={4} fill="#7f8a98" />
        <Rect x={cx - 8} y={bodyBottomY + 10} width={16} height={24} rx={4} fill="#7f8a98" />
        <Rect x={cx + 34} y={bodyBottomY + 10} width={16} height={20} rx={4} fill="#7f8a98" />

        {/* Bottom ellipse (shadow) */}
        <Ellipse cx={cx} cy={bodyBottomY} rx={rx} ry={ry} fill="#6c7c90" opacity={0.35} />

        {/* Cylinder body */}
        <Rect x={cx - rx} y={bodyTopY} width={bodyWidth} height={bodyBottomY - bodyTopY} fill="url(#bodyGrad)" />

        {/* Top ellipse */}
        <Ellipse cx={cx} cy={bodyTopY} rx={rx} ry={ry} fill="#dbe2ea" stroke="#667587" strokeWidth={1.5} />

        {/* Dome cap (Indian style) */}
        <Path d={`M ${cx - rx * 0.8} ${bodyTopY - ry}
                 Q ${cx} ${bodyTopY - ry - 22} ${cx + rx * 0.8} ${bodyTopY - ry}
                 L ${cx + rx * 0.7} ${bodyTopY - ry + 6}
                 Q ${cx} ${bodyTopY - ry - 12} ${cx - rx * 0.7} ${bodyTopY - ry + 6}
                 Z`}
          fill="#b9c6d6" stroke="#7b8898" strokeWidth={1}
        />

        {/* Outlet pipe (side) */}
        <Rect x={cx + rx} y={bodyBottomY - 30} width={18} height={10} rx={4} fill="#8a919a" />
        <Rect x={cx + rx + 14} y={bodyBottomY - 36} width={8} height={22} rx={4} fill="#8a919a" />

        {/* Water fill within cylinder */}
        <AnimatedSvgWave y={waterLevelY} cx={cx} rx={rx} ry={ry} />
      </Svg>
      <Text style={styles.percentageText}>{clamped}%</Text>
    </View>
  );
};

// Helper component to render animated water with 3D ellipse top
const AnimatedSvgWave = ({ y, cx, rx, ry }: { y: number; cx: number; rx: number; ry: number }) => {
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    ).start();
  }, [waveAnim]);

  const translateY = waveAnim.interpolate({ inputRange: [0, 1], outputRange: [-0.5, 0.5] });
  const AnimatedRect = Animated.createAnimatedComponent(Rect);
  const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);

  // Body bounds for clipping must match parent Defs (we re-declare to ensure boundaries)
  const bodyTopY = 60;
  const bodyBottomY = 180;
  const bodyWidth = rx * 2;

  return (
    <>
      {/* Water body clipped to cylinder interior */}
      <ClipPath id="cylinderClipLocal">
        <Rect x={cx - rx} y={bodyTopY} width={bodyWidth} height={bodyBottomY - bodyTopY} />
      </ClipPath>
      <AnimatedRect
        x={cx - rx}
        y={y}
        width={bodyWidth}
        height={bodyBottomY - y}
        fill="url(#waterGrad)"
        clipPath="url(#cylinderClipLocal)"
        style={{ transform: [{ translateY }] }}
      />
      {/* Elliptical water surface for 3D look */}
      <AnimatedEllipse
        cx={cx}
        cy={y}
        rx={rx}
        ry={ry}
        fill="#6ab6ff"
        opacity={0.9}
        clipPath="url(#cylinderClipLocal)"
        style={{ transform: [{ translateY }] }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
  },
  percentageText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WaterTank;
