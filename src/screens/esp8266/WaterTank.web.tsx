import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

type WaterTankProps = {
  percentage: number;
};

// Web-specific WaterTank: avoids react-native-svg and uses simple Views
const WaterTank = ({ percentage }: WaterTankProps) => {
  const clamped = Math.max(0, Math.min(100, percentage));
  const TANK_HEIGHT = 150;
  const fillHeight = (clamped / 100) * TANK_HEIGHT;

  return (
    <View style={styles.container}>
      <View style={styles.pipe}>
        <View style={styles.pipeBody} />
        <View style={styles.pipeOpening} />
      </View>
      <View style={styles.tank}>
        <Animated.View style={[styles.water, { height: fillHeight }]} />
      </View>
      <Text style={styles.percentageText}>{clamped}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    margin: 10,
  },
  pipe: {
    alignItems: 'center',
    width: 100,
    height: 40,
    marginBottom: 4,
  },
  pipeBody: {
    width: 12,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#888',
  },
  pipeOpening: {
    width: 24,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#888',
    marginTop: 2,
  },
  tank: {
    width: 100,
    height: 150,
    borderWidth: 2,
    borderColor: '#333',
    borderRadius: 5,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#fff',
  },
  water: {
    backgroundColor: '#99a3f8',
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  percentageText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default WaterTank;

