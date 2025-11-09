import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS, FONTS } from '../theme/theme';

type Slice = { label: string; value: number; color?: string };

const DEFAULT_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.accent,
  '#8E44AD',
  '#16A085',
  '#D35400',
];

const deg2rad = (deg: number) => (deg * Math.PI) / 180;

const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number) => {
  const start = {
    x: cx + r * Math.cos(deg2rad(startAngle)),
    y: cy + r * Math.sin(deg2rad(startAngle)),
  };
  const end = {
    x: cx + r * Math.cos(deg2rad(endAngle)),
    y: cy + r * Math.sin(deg2rad(endAngle)),
  };
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  const d = [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ');
  return d;
};

const PieChart: React.FC<{ data: Slice[]; size?: number }>
  = ({ data, size = 160 }) => {
  const radius = size / 2;
  const cx = radius;
  const cy = radius;
  const total = data.reduce((sum, d) => sum + (d.value || 0), 0) || 1; // avoid division by zero

  let currentAngle = -90; // start at top
  const paths = data.map((d, idx) => {
    const sliceAngle = (d.value / total) * 360;
    const start = currentAngle;
    const end = currentAngle + sliceAngle;
    currentAngle = end;
    const path = describeArc(cx, cy, radius, start, end);
    const fill = d.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
    return { path, fill };
  });

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {paths.map((p, i) => (
          <Path key={i} d={p.path} fill={p.fill} />
        ))}
      </Svg>
      <View style={styles.legend}>
        {data.map((d, i) => (
          <View key={i} style={styles.legendRow}>
            <View style={[styles.swatch, { backgroundColor: paths[i]?.fill }]} />
            <Text style={styles.legendText} numberOfLines={1}>
              {d.label} ({d.value})
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  legend: { marginTop: 8, alignSelf: 'stretch' },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  swatch: { width: 12, height: 12, borderRadius: 2, marginRight: 8 },
  legendText: { ...FONTS.body3, color: COLORS.textLight },
});

export default PieChart;
