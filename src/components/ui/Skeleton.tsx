import React, { useEffect, useState } from 'react';
import { View, Animated, StyleSheet, StyleProp, ViewStyle, AccessibilityInfo } from 'react-native';
import { colors, radius } from '@/theme/tokens';

export interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const Skeleton: React.FC<SkeletonProps> & {
  Line: React.FC<{ width?: number | string; style?: StyleProp<ViewStyle> }>;
  Circle: React.FC<{ size?: number; style?: StyleProp<ViewStyle> }>;
  Card: React.FC<{ height?: number; style?: StyleProp<ViewStyle> }>;
} = ({ width = '100%', height = 20, borderRadius = 6, style }) => {
  const [opacity] = useState(() => new Animated.Value(0.4));

  useEffect(() => {
    let isMounted = true;
    let animation: Animated.CompositeAnimation | null = null;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!isMounted || reduceMotion) return;

      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.85,
            duration: 200, // 150-250ms ease-out from DESIGN.md
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.4,
            duration: 200,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
    });

    return () => {
      isMounted = false;
      if (animation) animation.stop();
    };
  }, [opacity]);

  return (
    <Animated.View
      accessibilityLabel="Loading content"
      accessibilityRole="progressbar"
      style={[
        styles.base,
        {
          width: width as ViewStyle['width'],
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

const Line: React.FC<{ width?: number | string; style?: StyleProp<ViewStyle> }> = ({
  width = '100%',
  style,
}) => <Skeleton width={width} height={16} borderRadius={4} style={style} />;

const Circle: React.FC<{ size?: number; style?: StyleProp<ViewStyle> }> = ({
  size = 40,
  style,
}) => <Skeleton width={size} height={size} borderRadius={radius.chip} style={style} />;

const Card: React.FC<{ height?: number; style?: StyleProp<ViewStyle> }> = ({
  height = 96,
  style,
}) => (
  <View style={[styles.card, { minHeight: height }, style]}>
    <Skeleton.Line width="40%" style={styles.cardHeader} />
    <Skeleton.Line width="75%" style={styles.cardSub} />
    <Skeleton.Line width="55%" />
  </View>
);

Skeleton.Line = Line;
Skeleton.Circle = Circle;
Skeleton.Card = Card;

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  card: {
    padding: 16,
    borderRadius: radius.max,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    justifyContent: 'space-between',
  },
  cardHeader: {
    marginBottom: 8,
  },
  cardSub: {
    marginBottom: 6,
  },
});

export default Skeleton;
