import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  SwitchProps,
} from 'react-native';

import { COLORS } from '../theme/theme';

interface AppSwitchProps extends SwitchProps {
  width?: number;
  height?: number;
}

export const AppSwitch: React.FC<AppSwitchProps> = ({
  value,
  onValueChange,
  disabled = false,
  width = 64,
  height = 32,
  style,
}) => {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const targetValue = useRef(value ? 1 : 0);

  useEffect(() => {
    const nextTarget = value ? 1 : 0;
    if (nextTarget !== targetValue.current) {
      animateTo(nextTarget);
    }
  }, [value]);

  const animateTo = (toValue: number) => {
    targetValue.current = toValue;
    Animated.timing(anim, {
      toValue,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const toggle = () => {
    if (!disabled) {
      const nextValue = !value;
      // Optimistic update
      animateTo(nextValue ? 1 : 0);
      onValueChange?.(nextValue);
    }
  };

  const padding = 2;
  const thumbSize = height - padding * 2;
  const radius = height / 2;

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [padding, width - thumbSize - padding],
  });

  const bg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.textLight, COLORS.accent],
  });

  const onOpacity = anim;
  const offOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={toggle}
      disabled={disabled}
      style={[style, { opacity: disabled ? 0.6 : 1 }]}
    >
      <Animated.View style={[styles.track, { width, height, borderRadius: radius, backgroundColor: bg }]}>
        <Animated.Text style={[styles.label, { left: 10, opacity: onOpacity }]}>ON</Animated.Text>
        <Animated.Text style={[styles.label, { right: 10, opacity: offOpacity }]}>OFF</Animated.Text>

        <Animated.View
          style={[
            styles.thumb,
            {
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              transform: [{ translateX }],
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};
const styles = StyleSheet.create({
  track: {
    justifyContent: 'center',
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    top: 2,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  label: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    includeFontPadding: false,
  },
});
