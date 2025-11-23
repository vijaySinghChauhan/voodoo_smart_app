import { View, Text, ScrollView, FlatList } from 'react-native';

// Minimal web shim for react-native-reanimated to satisfy imports
// Provides basic Animated component placeholders and no-op hooks/functions
const Animated = {
  View,
  Text,
  ScrollView,
  FlatList,
} as any;

export default Animated;

export const useSharedValue = <T = number>(initial?: T) => ({ current: initial ?? (0 as any) });
export const useAnimatedStyle = (_factory?: any) => ({});
export const withTiming = (value: any) => value;
export const withSpring = (value: any) => value;
export const Easing = {} as any;
export const runOnJS = (fn: Function) => fn;
export const Layout = {} as any;
export const FadeIn = {} as any;
export const FadeOut = {} as any;
export const SlideInDown = {} as any;
export const SlideOutUp = {} as any;
export const Extrapolate = {} as any;
export const interpolate = (v: number) => v;
export const AnimatedStyle = {} as any;

