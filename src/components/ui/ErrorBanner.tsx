import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import { colors, spacing } from '@/theme/tokens';
import { Text } from './Text';

export interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onRetry,
  isRetrying = false,
}) => {
  return (
    <View accessibilityRole="alert" accessibilityLabel={`Error: ${message}`} style={styles.banner}>
      <View style={styles.contentRow}>
        <AlertTriangle size={18} strokeWidth={2} color={colors.status.broken} style={styles.icon} />
        <Text variant="caption" color="ink" style={styles.message}>
          {message}
        </Text>
      </View>

      {onRetry && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry failed request"
          onPress={onRetry}
          disabled={isRetrying}
          style={({ pressed }) => [
            styles.retryButton,
            pressed && styles.retryButtonPressed,
            isRetrying && styles.retryButtonDisabled,
          ]}
        >
          <RefreshCw size={14} strokeWidth={2} color={colors.sky[700]} />
          <Text variant="caption" color="accent" style={styles.retryText}>
            {isRetrying ? 'Retrying…' : 'Retry'}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: spacing.grid,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contentRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.grid,
  },
  icon: {
    marginRight: spacing.grid,
    flexShrink: 0,
  },
  message: {
    flex: 1,
    color: colors.status.broken,
    fontWeight: '500',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: colors.sky[200],
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.grid,
    paddingVertical: 6,
    minHeight: 36,
  },
  retryButtonPressed: {
    backgroundColor: colors.sky[50],
  },
  retryButtonDisabled: {
    opacity: 0.5,
  },
  retryText: {
    marginLeft: 4,
    fontWeight: '600',
  },
});
