import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Rect, Path } from 'react-native-svg';

type WaterTankProps = {
  percentage: number;
};

const WaterTank = ({ percentage }: WaterTankProps) => {
  const pourAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pourAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(pourAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [pourAnim]);

  // Pouring water drop animation
  const dropTranslateY = pourAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 60]
  });

  return (
    <View style={styles.container}>
      {/* Pipe SVG at top center */}
      <View style={{ alignItems: 'center', width: 100 }}>
        <Svg width={40} height={40}>
          {/* Pipe body */}
          <Rect x={14} y={0} width={12} height={28} rx={6} fill="#888" />
          {/* Pipe opening */}
          <Rect x={8} y={26} width={24} height={10} rx={5} fill="#888" />
          {/* Pipe highlight */}
          <Path d="M16 5 Q20 12 24 5" stroke="#bbb" strokeWidth={2} fill="none" />
        </Svg>
        {/* Pouring water animation */}
        <Animated.View style={{ position: 'absolute', top: 32, left: 46, zIndex: 2, transform: [{ translateY: dropTranslateY }] }}>
          <Svg width={8} height={24}>
            <Rect x={0} y={0} width={8} height={18} rx={4} fill="#99a3f8" />
            <Path d="M0,18 Q4,24 8,18" fill="#99a3f8" />
          </Svg>
        </Animated.View>
      </View>
      <View style={styles.tank}>
        {/* Fill from top downward */}
        <View style={[styles.water, { height: `${percentage}%`, position: 'absolute', bottom: undefined, top: 0 }]} />
      </View>
      <Text style={styles.percentageText}>{percentage}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    margin: 10
  },
  tank: {
    width: 100,
    height: 150,
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 5,
    overflow: 'hidden',
    justifyContent: 'flex-end'
  },
  water: {
    backgroundColor: '#99a3f8',
    width: '100%'
  },
  percentageText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default WaterTank;