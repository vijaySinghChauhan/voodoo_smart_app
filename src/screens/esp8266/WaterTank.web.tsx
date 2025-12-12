import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

type WaterTankProps = {
  percentage: number;
};

// Web-specific WaterTank: 3D cylinder approximation using Views (no SVG)
const WaterTank = ({ percentage }: WaterTankProps) => {
  const clamped = Math.max(0, Math.min(100, percentage));
  const width = 160;
  const height = 220;
  const bodyTopY = 60;
  const bodyBottomY = 180;
  const rx = 48; // ellipse x-radius
  const ry = 16; // ellipse y-radius
  const bodyHeight = bodyBottomY - bodyTopY; // 120
  const waterHeight = (clamped / 100) * bodyHeight;

  const waveAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [waveAnim]);

  const waveTranslateY = waveAnim.interpolate({ inputRange: [0, 1], outputRange: [-2, 2] });

  return (
    <View style={styles.container}>
      <View style={[styles.svgWrap, { width, height }]}> 
        {/* Stand */}
        <View style={[styles.leg, { left: (width / 2) - 50, bottom: 0, height: 20 }]} />
        <View style={[styles.leg, { left: (width / 2) - 8, bottom: 0, height: 24 }]} />
        <View style={[styles.leg, { left: (width / 2) + 34, bottom: 0, height: 20 }]} />

        {/* Bottom ellipse shadow */}
        <View style={[styles.ellipse, {
          width: rx * 2,
          height: ry * 2,
          left: (width / 2) - rx,
          top: bodyBottomY - ry,
          backgroundColor: '#6c7c90',
          opacity: 0.35,
        }]} />

        {/* Cylinder body with shading */}
        <View style={[styles.body, {
          left: (width / 2) - rx,
          top: bodyTopY,
          width: rx * 2,
          height: bodyHeight,
        }]}>
          <View style={styles.bodyShadeLeft} />
          <View style={styles.bodyHighlight} />
          <View style={styles.bodyShadeRight} />
        </View>

        {/* Top ellipse */}
        <View style={[styles.ellipse, {
          width: rx * 2,
          height: ry * 2,
          left: (width / 2) - rx,
          top: bodyTopY - ry,
          backgroundColor: '#dbe2ea',
          borderWidth: 1.5,
          borderColor: '#667587',
        }]} />

        {/* Dome cap */}
        <View style={[styles.dome, {
          left: (width / 2) - rx * 0.8,
          top: bodyTopY - ry - 26,
          width: rx * 1.6,
        }]} />

        {/* Side outlet pipe */}
        <View style={[styles.pipe, { left: (width / 2) + rx, top: bodyBottomY - 30 }]} />
        <View style={[styles.pipeVertical, { left: (width / 2) + rx + 14, top: bodyBottomY - 36 }]} />

        {/* Water fill */}
        <Animated.View style={[styles.water, {
          left: (width / 2) - rx,
          width: rx * 2,
          height: waterHeight,
          top: bodyBottomY - waterHeight,
          transform: [{ translateY: waveTranslateY }]
        }]} />

        {/* Water surface ellipse */}
        <Animated.View style={[styles.ellipse, {
          width: rx * 2,
          height: ry * 2,
          left: (width / 2) - rx,
          top: bodyBottomY - waterHeight - ry,
          backgroundColor: '#6ab6ff',
          opacity: 0.9,
          transform: [{ translateY: waveTranslateY }]
        }]} />
      </View>
      <Text style={styles.percentageText}>{clamped}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 10,
  },
  svgWrap: {
    position: 'relative',
  },
  leg: {
    position: 'absolute',
    width: 16,
    backgroundColor: '#7f8a98',
    borderRadius: 4,
  },
  body: {
    position: 'absolute',
    backgroundColor: '#cfd6e1',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  bodyShadeLeft: {
    width: '33%',
    height: '100%',
    backgroundColor: '#b5c0ce',
    opacity: 0.7,
  },
  bodyHighlight: {
    width: '34%',
    height: '100%',
    backgroundColor: '#ccd6e3',
    opacity: 0.6,
  },
  bodyShadeRight: {
    width: '33%',
    height: '100%',
    backgroundColor: '#a1afc0',
    opacity: 0.65,
  },
  ellipse: {
    position: 'absolute',
    borderRadius: 9999,
  },
  dome: {
    position: 'absolute',
    height: 28,
    backgroundColor: '#b9c6d6',
    borderTopLeftRadius: 9999,
    borderTopRightRadius: 9999,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderWidth: 1,
    borderColor: '#7b8898',
  },
  pipe: {
    position: 'absolute',
    width: 18,
    height: 10,
    backgroundColor: '#8a919a',
    borderRadius: 4,
  },
  pipeVertical: {
    position: 'absolute',
    width: 8,
    height: 22,
    backgroundColor: '#8a919a',
    borderRadius: 4,
  },
  water: {
    position: 'absolute',
    backgroundColor: '#4fb2ff',
  },
  percentageText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WaterTank;
