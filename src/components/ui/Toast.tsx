import React, { useEffect, useState } from 'react';
import { View, Animated, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors } from '@/theme/tokens';
import { Text } from './Text';

export interface ToastProps {
  message: string | null;
  visible: boolean;
  onDismiss?: () => void;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  visible,
  onDismiss,
  duration = 3000,
  style,
}) => {
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible && message) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          if (onDismiss) onDismiss();
        });
      }, duration);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, message, duration, onDismiss, opacity]);

  if (!visible && !message) return null;

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.toastContainer,
        {
          opacity,
        },
        style,
      ]}
      pointerEvents="none"
    >
      <View style={styles.toast}>
        <Text variant="caption" style={styles.toastText}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 88,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  toast: {
    backgroundColor: colors.ink.DEFAULT,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '500',
    textAlign: 'center',
  },
});
