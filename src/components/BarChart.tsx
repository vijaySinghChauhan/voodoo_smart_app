import React, { useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent, ScrollView } from 'react-native';
import { COLORS, FONTS } from '../theme/theme';

type Datum = { label: string; value: number };

const BarChart: React.FC<{ data: Datum[]; height?: number; barColor?: string; backgroundColor?: string }>
  = ({ data, height = 160, barColor = COLORS.warning, backgroundColor = COLORS.background }) => {
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w && w !== containerWidth) setContainerWidth(w);
  };

  const safeWidth = containerWidth || 320;
  const baseGap = 10; // default gap
  const maxVal = Math.max(...(data.map(d => d.value).concat([1])));
  const n = Math.max(1, data.length);
  const minBarWidth = 14;
  const maxBarWidth = 36; // cap overly wide bars for aesthetics
  const calculatedBarWidth = Math.floor((safeWidth - (Math.max(0, n - 1) * baseGap)) / n);
  let isScrollable = calculatedBarWidth < minBarWidth;
  let barWidth: number;
  let gap: number;
  let contentWidth: number;

  if (isScrollable) {
    barWidth = minBarWidth;
    gap = baseGap;
    contentWidth = Math.max(60, n * (barWidth + gap) - gap);
  } else {
    if (calculatedBarWidth > maxBarWidth) {
      barWidth = maxBarWidth;
      const computedGap = Math.floor((safeWidth - n * barWidth) / Math.max(1, n - 1));
      gap = Math.max(6, Math.min(24, computedGap));
    } else {
      barWidth = Math.max(minBarWidth, calculatedBarWidth);
      gap = baseGap;
    }
    contentWidth = safeWidth;
  }
  const paddingBottom = 12;
  const paddingTop = 6;

  return (
    <View style={{ width: '100%' }} onLayout={onLayout}>
      {data.length === 0 ? (
        <Text style={styles.noData}>No data</Text>
      ) : (
        <>
          {isScrollable ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ width: contentWidth }}>
                <View style={[styles.chartRow, { height, paddingTop, paddingBottom, backgroundColor, borderRadius: 8 }]}> 
                  {data.map((d, i) => {
                    const barHeight = Math.max(8, Math.round((d.value / maxVal) * (height - paddingBottom - paddingTop)));
                    const isLast = i === data.length - 1;
                    return (
                      <View key={i} style={{ width: barWidth, marginRight: isLast ? 0 : gap, alignItems: 'center', justifyContent: 'flex-end' }}>
                        <View style={{ width: barWidth, height: barHeight, backgroundColor: barColor, borderRadius: 4 }} />
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ width: contentWidth }}>
                <View style={styles.labelsRow}>
                  {data.map((d, i) => {
                    const isLast = i === data.length - 1;
                    return (
                      <Text key={i} style={[styles.label, { width: barWidth, marginRight: isLast ? 0 : gap }]} numberOfLines={1}>
                        {d.label}
                      </Text>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          ) : (
            <>
              <View style={[styles.chartRow, { height, paddingTop, paddingBottom, backgroundColor, borderRadius: 8 }]}> 
                {data.map((d, i) => {
                  const barHeight = Math.max(8, Math.round((d.value / maxVal) * (height - paddingBottom - paddingTop)));
                  const isLast = i === data.length - 1;
                  return (
                    <View key={i} style={{ width: barWidth, marginRight: isLast ? 0 : gap, alignItems: 'center', justifyContent: 'flex-end' }}>
                      <View style={{ width: barWidth, height: barHeight, backgroundColor: barColor, borderRadius: 4 }} />
                    </View>
                  );
                })}
              </View>
              <View style={styles.labelsRow}>
                {data.map((d, i) => {
                  const isLast = i === data.length - 1;
                  return (
                    <Text key={i} style={[styles.label, { width: barWidth, marginRight: isLast ? 0 : gap }]} numberOfLines={1}>
                      {d.label}
                    </Text>
                  );
                })}
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  chartRow: { flexDirection: 'row', alignItems: 'flex-end' , justifyContent:'flex-start' , backgroundColor: COLORS.background },
  labelsRow: { flexDirection: 'row', marginTop: 6, alignItems: 'center' },
  label: { ...FONTS.small, color: COLORS.textLight, textAlign:'center' },
  noData: { ...FONTS.small, color: COLORS.textLight, fontStyle: 'italic', textAlign: 'center' }
});

export default BarChart;
