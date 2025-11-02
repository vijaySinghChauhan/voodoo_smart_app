import React, { useRef } from 'react';
import { Animated, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, SHADOWS, SIZES } from '../theme/theme';

interface AnimatedCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

const AnimatedCard: React.FC<AnimatedCardProps> = ({ 
  children, 
  style, 
  onPress 
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const cardContent = (
    <Animated.View 
      style={[
        styles.card, 
        style,
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity 
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
      >
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    marginBottom: SIZES.margin,
    ...SHADOWS.medium,
  },
});

export default AnimatedCard;