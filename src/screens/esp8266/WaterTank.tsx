import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import Svg, { Rect, Path, Ellipse, Defs, LinearGradient, Stop, ClipPath } from 'react-native-svg';

type WaterTankProps = {
  percentage: number;
  flowRate?: number;
};

const WaterTank: React.FC<WaterTankProps> = ({ percentage, flowRate }) => {
  const level = Math.max(0, Math.min(100, percentage));

  const W = 200;
  const H = 420;
  const cx = W / 2;

  const radius = 70;
  const bodyHeight = 230;
  const ry = 18;

  const topY = 110;
  const bottomY = topY + bodyHeight;

  const waterHeight = (level / 100) * bodyHeight;
  const waterY = bottomY - waterHeight;

  return (
    <View style={styles.container}>
    <Svg width={W} height={H}>
      <Defs>
        <LinearGradient id="plastic" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#eef3f6" />
          <Stop offset="0.3" stopColor="#dfe6ec" />
          <Stop offset="0.6" stopColor="#ffffff" />
          <Stop offset="1" stopColor="#dfe6ec" />
        </LinearGradient>

        <LinearGradient id="water" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#7cc6ff" />
          <Stop offset="1" stopColor="#3fc3ff" />
        </LinearGradient>
      </Defs>

      {/* Back shell */}
      <Rect x={cx - radius} y={topY} width={radius * 2} height={bodyHeight} rx={28} fill="url(#plastic)" />

      {/* Water */}
      <Rect x={cx - radius} y={waterY} width={radius * 2} height={bottomY - waterY} rx={28} fill="url(#water)" />

      {/* Water surface */}
      <Ellipse cx={cx} cy={waterY} rx={radius} ry={ry} fill="#8fd8ff" />

      {/* Tank outline */}
      <Rect x={cx - radius} y={topY} width={radius * 2} height={bodyHeight} rx={28} fill="none" stroke="#cfd8dc" strokeWidth={2} />
      <Ellipse cx={cx} cy={topY} rx={radius} ry={ry} fill="none" stroke="#cfd8dc" strokeWidth={2} />

      {/* Ribs */}
      {[1,2,3,4].map(i => {
        const y = topY + (bodyHeight * i) / 5;
        return (
          <Path key={i} d={`M ${cx - radius} ${y} A ${radius} ${ry} 0 0 0 ${cx + radius} ${y}`} stroke="#cfd8dc" strokeWidth={1} fill="none" />
        );
      })}

      {/* Lid */}
      <Ellipse cx={cx} cy={topY - 10} rx={radius * 0.55} ry={ry * 0.7} fill="#2e3a46" />
      <Rect x={cx - radius * 0.55} y={topY - 22} width={radius * 1.1} height={12} rx={6} fill="#3b4a58" />

      {/* Handle */}
      <Rect x={cx - 6} y={topY - 30} width={12} height={8} rx={4} fill="#1f2933" />

      {/* Inlet pipe */}
      <Rect x={cx - 95} y={topY - 18} width={90} height={10} rx={5} fill="#9aa7b4" />
      <Rect x={cx - 5} y={topY - 18} width={10} height={22} rx={5} fill="#7b8794" />

      {/* Legs */}
      <Rect x={cx - radius + 18} y={bottomY + 6} width={14} height={26} rx={6} fill="#9aa7b4" />
      <Rect x={cx - 7} y={bottomY + 10} width={14} height={22} rx={6} fill="#9aa7b4" />
      <Rect x={cx + radius - 32} y={bottomY + 6} width={14} height={26} rx={6} fill="#9aa7b4" />
    </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 4,
  },

});

export default WaterTank;
