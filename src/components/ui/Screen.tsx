import React from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { ErrorBanner } from './ErrorBanner';
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
  errorBanner?: {
    error: string | null;
    onRetry?: () => void;
    isRetrying?: boolean;
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
  errorBanner,
  stickyFooter,
  style,
  contentContainerStyle,
  edges = ['top', 'left', 'right'],
}) => {
  return (
    <View style={styles.root}>
      {/* Background ambient light blobs matching estimator HTML .b1, .b2, .b3 */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.blob1} />
        <View style={styles.blob2} />
        <View style={styles.blob3} />
      </View>

      <SafeAreaView edges={edges} style={[styles.safeArea, style]}>
        {/* Offline Banner */}
        {offlineBanner?.isOffline && (
          <View
            style={styles.offlineBanner}
            accessibilityLabel="Offline banner"
            accessibilityRole="alert"
          >
            <ErrorBanner
              message={`Offline · Last synced ${offlineBanner.lastSyncedAt || 'recently'}`}
            />
          </View>
        )}

        {/* Error Banner */}
        {errorBanner?.error && (
          <View style={styles.errorBannerContainer} accessibilityRole="alert">
            <ErrorBanner
              message={errorBanner.error}
              onRetry={errorBanner.onRetry}
              isRetrying={errorBanner.isRetrying}
            />
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
                  <ArrowLeft size={20} strokeWidth={1.75} color="#0B2233" />
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

        {scrollable ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
            refreshControl={refreshControl}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.staticContent, contentContainerStyle]}>{children}</View>
        )}

        {stickyFooter && <View style={styles.footerWrapper}>{stickyFooter}</View>}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#E3F1FB',
    overflow: 'hidden',
    position: 'relative',
  },
  blob1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#7EC4F3',
    top: -70,
    right: -80,
    opacity: 0.85,
    ...(Platform.OS === 'web'
      ? ({
          filter: 'blur(40px)',
          WebkitFilter: 'blur(40px)',
        } as any)
      : {}),
  },
  blob2: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: '#B3DDF7',
    top: 300,
    left: -100,
    opacity: 0.85,
    ...(Platform.OS === 'web'
      ? ({
          filter: 'blur(40px)',
          WebkitFilter: 'blur(40px)',
        } as any)
      : {}),
  },
  blob3: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: '#5FAEE8',
    bottom: -100,
    right: -70,
    opacity: 0.7,
    ...(Platform.OS === 'web'
      ? ({
          filter: 'blur(40px)',
          WebkitFilter: 'blur(40px)',
        } as any)
      : {}),
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  offlineBanner: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  errorBannerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(15, 34, 48, 0.07)',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    marginBottom: 4,
  },
  backButton: {
    width: 48,
    height: 48,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  staticContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  footerWrapper: {
    flexShrink: 0,
  },
});
