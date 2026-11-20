import React from 'react';
import { View, ScrollView, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { ArrowLeft, WifiOff } from 'lucide-react-native';
import { colors, spacing } from '@/theme/tokens';
import { Text } from './Text';

export interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export interface ScreenProps {
  children: React.ReactNode;
  header?: ScreenHeaderProps;
  scrollable?: boolean;
  refreshControl?: React.ReactElement;
  offlineBanner?: {
    isOffline: boolean;
    lastSyncedAt?: string;
  };
  stickyFooter?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  edges?: Edge[];
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  header,
  scrollable = false,
  refreshControl,
  offlineBanner,
  stickyFooter,
  style,
  contentContainerStyle,
  edges = ['top', 'left', 'right', 'bottom'],
}) => {
  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, style]}>
      {/* Offline banner adhering to DESIGN.md states */}
      {offlineBanner?.isOffline && (
        <View
          accessibilityRole="alert"
          accessibilityLabel="Offline banner"
          style={styles.offlineBanner}
        >
          <WifiOff size={16} strokeWidth={1.75} color={colors.ink.DEFAULT} />
          <Text variant="caption" color="ink">
            Offline · Last synced {offlineBanner.lastSyncedAt || 'recently'}
          </Text>
        </View>
      )}

      {/* Optional screen header */}
      {header && (
        <View style={styles.headerContainer}>
          <View style={styles.headerTopRow}>
            {header.onBack ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={header.onBack}
                style={styles.backButton}
              >
                <ArrowLeft size={20} strokeWidth={1.75} color={colors.ink.DEFAULT} />
              </Pressable>
            ) : (
              <View style={styles.backPlaceholder} />
            )}
            {header.subtitle && (
              <Text variant="caption" color="muted">
                {header.subtitle}
              </Text>
            )}
            {header.rightAction ? header.rightAction : <View style={styles.rightPlaceholder} />}
          </View>
          {header.title && (
            <Text variant="screenTitle" color="ink" style={styles.headerTitle}>
              {header.title}
            </Text>
          )}
        </View>
      )}

      {/* Content body */}
      {scrollable ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fixedContainer, contentContainerStyle]}>{children}</View>
      )}

      {/* Sticky footer in thumb zone */}
      {stickyFooter && <View style={styles.footerContainer}>{stickyFooter}</View>}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  headerContainer: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    marginBottom: 4,
  },
  backButton: {
    width: spacing.minTapTarget,
    height: spacing.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  backPlaceholder: {
    width: 24,
  },
  rightPlaceholder: {
    width: 24,
  },
  headerTitle: {
    marginTop: 4,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 16,
    paddingBottom: 32,
  },
  fixedContainer: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 16,
    paddingBottom: 16,
  },
  footerContainer: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    backgroundColor: colors.bg,
  },
});

export default Screen;
