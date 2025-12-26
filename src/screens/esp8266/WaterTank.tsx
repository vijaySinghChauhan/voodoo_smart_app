import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Platform } from 'react-native';
import Svg, { Rect, Path, Ellipse, Defs, LinearGradient, Stop, ClipPath } from 'react-native-svg';

type WaterTankProps = {
  percentage: number;
  flowRate?: number;
};

const WaterTank = ({ percentage, flowRate }: WaterTankProps) => {
  const clamped = Math.max(0, Math.min(100, percentage));
  
  // Dimensions
  const width = 180;
  const height = 300;
  const cx = width / 2;
  // const cy = height / 2; // unused

  // Tank Geometry
  const tankRadius = 60;
  const tankHeight = 150;
  const perspectiveY = 15; // Ellipse ry (flatness of the cylinder top/bottom)
  
  const tankTopY = 80;
  const tankBottomY = tankTopY + tankHeight;
  
  // Water Level Calculation
  const waterHeight = (clamped / 100) * tankHeight;
  const waterLevelY = tankBottomY - waterHeight;

  // Tap Position (Above tank
  const tapNozzleX = cx;
  const tapNozzleY = tankTopY - 40;

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        <Defs>
          {/* Tank Plastic Gradient (White/Light Blue) */}
          <LinearGradient id="plasticGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#eceff1" />
            <Stop offset="0.2" stopColor="#cfd8dc" />
            <Stop offset="0.5" stopColor="#ffffff" />
            <Stop offset="0.8" stopColor="#cfd8dc" />
            <Stop offset="1" stopColor="#eceff1" />
          </LinearGradient>
          
          {/* Water Gradient */}
          <LinearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#4fc3f7" />
            <Stop offset="1" stopColor="#0288d1" />
          </LinearGradient>
          
           <ClipPath id="tankInnerClip">
             <Rect x={cx - tankRadius} y={tankTopY} width={tankRadius * 2} height={tankHeight} />
           </ClipPath>
        </Defs>

        {/* --- Back Layer --- */}
        
        {/* Tank Body Background (Semi-transparent) */}
        <Rect 
          x={cx - tankRadius} 
          y={tankTopY} 
          width={tankRadius * 2} 
          height={tankHeight} 
          fill="url(#plasticGrad)" 
          opacity={0.4}
        />
        
        {/* Back Bottom Curve */}
        <Ellipse 
            cx={cx} 
            cy={tankBottomY} 
            rx={tankRadius} 
            ry={perspectiveY} 
            fill="#0288d1" 
            opacity={1}
        />

        {/* --- Water Layer --- */}
        <AnimatedSvgWave 
           y={waterLevelY} 
           cx={cx} 
           rx={tankRadius} 
           ry={perspectiveY} 
           bodyTopY={tankTopY}
           bodyBottomY={tankBottomY}
        />

        {/* --- Front Layer (Details) --- */}
        
        {/* Tank Main Outline Sides */}
        <Path
          d={`M ${cx - tankRadius} ${tankTopY} 
             L ${cx - tankRadius} ${tankBottomY} 
             A ${tankRadius} ${perspectiveY} 0 0 0 ${cx + tankRadius} ${tankBottomY}
             L ${cx + tankRadius} ${tankTopY}`}
          fill="none"
          stroke="#90a4ae"
          strokeWidth={2}
        />
        
        {/* Top Rim */}
        <Ellipse 
          cx={cx} 
          cy={tankTopY} 
          rx={tankRadius} 
          ry={perspectiveY} 
          fill="none" 
          stroke="#90a4ae" 
          strokeWidth={2} 
        />
        
        {/* Ribs (Rings around the tank for Sintex look) */}
        {[1, 2, 3, 4].map(i => {
           const y = tankTopY + (tankHeight * (i/5));
           return (
             <Path
               key={i}
               d={`M ${cx - tankRadius} ${y} A ${tankRadius} ${perspectiveY} 0 0 0 ${cx + tankRadius} ${y}`}
               fill="none"
               stroke="#b0bec5"
               strokeWidth={1}
             />
           );
        })}

        {/* Lid (Darker plastic) */}
        <Ellipse cx={cx} cy={tankTopY - 4} rx={tankRadius * 0.45} ry={perspectiveY * 0.6} fill="#455a64" />
        <Rect x={cx - tankRadius * 0.45} y={tankTopY - 12} width={tankRadius * 0.9} height={8} rx={2} fill="#455a64" />
        <Ellipse cx={cx} cy={tankTopY - 12} rx={tankRadius * 0.45} ry={perspectiveY * 0.6} fill="#546e7a" />
        
        {/* Handle on Lid */}
        <Rect x={cx - 5} y={tankTopY - 18} width={10} height={6} fill="#37474f" rx={2} />

        {/* Stand (Legs) */}
         <Rect x={cx - tankRadius + 15} y={tankBottomY + 2} width={12} height={25} rx={2} fill="#78909c" />
         <Rect x={cx + tankRadius - 27} y={tankBottomY + 2} width={12} height={25} rx={2} fill="#78909c" />
         {/* Center leg/support */}
         <Rect x={cx - 6} y={tankBottomY + 8} width={12} height={19} rx={2} fill="#78909c" />

         {/* Inlet Tap (Top Left) */}
         <Path
           d={`M ${cx - 80} ${tapNozzleY - 20} L ${cx + 5} ${tapNozzleY - 20} L ${cx + 5} ${tapNozzleY} L ${cx - 5} ${tapNozzleY} L ${cx - 5} ${tapNozzleY - 10} L ${cx - 80} ${tapNozzleY - 10} Z`}
           fill="#90a4ae"
           stroke="#78909c"
           strokeWidth={1}
         />
         
         {/* Tap Valve/Handle */}
         <Rect x={cx - 5} y={tapNozzleY - 28} width={10} height={8} fill="#546e7a" rx={1} />
         <Rect x={cx - 15} y={tapNozzleY - 32} width={30} height={4} fill="#37474f" rx={2} />

         {/* Animated Water Flow */}
         {(flowRate && flowRate > 10) ? (
            <AnimatedFlow x={tapNozzleX} y={tapNozzleY} height={waterLevelY - tapNozzleY} />
         ) : null}

      </Svg>
    </View>
  );
};

// Animated Flow Component
const AnimatedFlow = ({ x, y, height }: { x: number; y: number; height: number }) => {
  const flowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(flowAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      })
    ).start();
  }, [flowAnim]);

  const translateY = flowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
  });

  const AnimatedLine = Animated.createAnimatedComponent(Rect) as any;

  return (
    <AnimatedLine
      x={x - 3}
      y={y}
      width={6}
      height={height}
      fill="#4fc3f7"
      opacity={0.8}
      strokeDasharray="5, 5"
      stroke="#0288d1"
      strokeWidth={1}
      style={{
        transform: [{ translateY }],
      }}
    />
  );
};

// Animated Water Component
const AnimatedSvgWave = ({ y, cx, rx, ry, bodyTopY, bodyBottomY }: { y: number; cx: number; rx: number; ry: number; bodyTopY: number; bodyBottomY: number }) => {
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(waveAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, [waveAnim]);

  const translateY = waveAnim.interpolate({ inputRange: [0, 1], outputRange: [-1, 1] }); // Subtle wave movement
  const AnimatedRect = Animated.createAnimatedComponent(Rect) as any;
  const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse) as any;

  const bodyWidth = rx * 2;
  const fillHeight = Math.max(0, bodyBottomY - y);

  return (
    <>
      <ClipPath id="waterClip">
         <Rect x={cx - rx} y={bodyTopY} width={bodyWidth} height={bodyBottomY - bodyTopY} />
      </ClipPath>
      
      {/* Water Body (Rectangle) */}
      <AnimatedRect
        x={cx - rx}
        y={y}
        width={bodyWidth}
        height={fillHeight}
        fill="url(#waterGrad)"
        clipPath="url(#waterClip)"
        style={{ transform: [{ translateY }] }}
      />
      
      {/* Water Surface (Ellipse) */}
      <AnimatedEllipse
        cx={cx}
        cy={y}
        rx={rx}
        ry={ry}
        fill="#81d4fa" 
        opacity={0.9}
        clipPath="url(#waterClip)"
        style={{ transform: [{ translateY }] }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 4,
  },

});

export default WaterTank;
